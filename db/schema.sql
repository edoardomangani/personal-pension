-- Piano pensione — schema Postgres per Neon (Data API + Neon Auth + RLS)
-- Bozza: verificare con la documentazione Neon il nome della funzione che restituisce l'utente
-- dal JWT (qui auth.user_id(), fornita da pg_session_jwt quando si attiva la Data API con Neon Auth)
-- e i ruoli concessi alla Data API (qui "authenticated").

create table fondi (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default auth.user_id(),
  nome        text not null,
  creato_il   timestamptz not null default now(),
  unique (user_id, nome)
);

-- Soldi arrivati sul fondo (o spese trattenute dal piano)
create table versamenti (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default auth.user_id(),
  fondo_id    uuid not null references fondi(id) on delete restrict,
  tipo        text not null check (tipo in ('TFR','Personale','Datore','Spesa')),
  data        date not null,                         -- data in cui risulta sul fondo
  importo     numeric(10,2) not null check (importo > 0), -- sempre positivo; il segno lo dà il tipo
  note        text not null default '',
  creato_il   timestamptz not null default now()
);

-- TFR maturato in busta paga; diventa versato quando è collegato a un versamento di tipo TFR
create table tfr_accumulato (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null default auth.user_id(),
  fondo_id      uuid not null references fondi(id) on delete restrict,
  competenza    date not null,                       -- primo giorno del mese di competenza
  data_busta    date not null,
  importo       numeric(10,2) not null check (importo > 0),
  versamento_id uuid references versamenti(id) on delete set null,
  note          text not null default '',
  creato_il     timestamptz not null default now()
);

create table estratti_conto (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default auth.user_id(),
  fondo_id    uuid not null references fondi(id) on delete restrict,
  data        date not null,
  valore      numeric(12,2) not null check (valore >= 0),
  note        text not null default '',
  creato_il   timestamptz not null default now()
);

create table impostazioni (
  user_id            text primary key default auth.user_id(),
  anno_nascita       int,
  eta_pensione       int not null default 67,
  rendimento         numeric(5,2) not null default 3,     -- % annuo netto
  inflazione         numeric(5,2) not null default 2,
  crescita           numeric(5,2) not null default 1.5,   -- crescita contributi %/anno
  tfr_mensile        numeric(10,2),                       -- null = stimato (mediana ultimi 6 mesi)
  personale_mensile  numeric(10,2) not null default 0,
  aliquota           numeric(5,2) not null default 35,    -- aliquota marginale IRPEF %
  limite_deducibile  numeric(10,2) not null default 5164.57
);

create index on versamenti (user_id, data);
create index on tfr_accumulato (user_id, versamento_id);
create index on estratti_conto (user_id, data);

-- Ogni riga è visibile e modificabile solo dal suo proprietario
do $$
declare t text;
begin
  foreach t in array array['fondi','versamenti','tfr_accumulato','estratti_conto','impostazioni'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for all to authenticated
                    using (user_id = auth.user_id()) with check (user_id = auth.user_id())$p$, t||'_owner', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Coerenza: un TFR accumulato può stare solo in un versamento di tipo TFR dello stesso fondo e utente
create or replace function check_tfr_versamento() returns trigger language plpgsql as $$
begin
  if new.versamento_id is not null and not exists (
    select 1 from versamenti v
    where v.id = new.versamento_id and v.tipo = 'TFR' and v.fondo_id = new.fondo_id and v.user_id = new.user_id
  ) then
    raise exception 'Il TFR accumulato può essere collegato solo a un versamento TFR dello stesso fondo';
  end if;
  return new;
end $$;
create trigger tfr_versamento_check before insert or update on tfr_accumulato
  for each row execute function check_tfr_versamento();
