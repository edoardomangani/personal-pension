-- Schema del piano pensione: tabelle, vincoli, indici, trigger di coerenza, RLS e grant.
-- user_id lo mette sempre il default auth.user_id() (sub del JWT di Neon Auth).

create table if not exists fondi (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default auth.user_id(),
  nome       text not null,
  creato_il  timestamptz not null default now(),
  unique (user_id, nome)
);

create table if not exists movimenti (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default auth.user_id(),
  fondo_id   uuid not null references fondi (id) on delete restrict,
  data       date not null,
  note       text not null default '',
  creato_il  timestamptz not null default now()
);

create table if not exists movimento_righe (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null default auth.user_id(),
  movimento_id  uuid not null references movimenti (id) on delete cascade,
  tipo          text not null check (tipo in ('TFR', 'Datore', 'Personale', 'Volontario', 'Spesa')),
  importo       numeric(10, 2) not null check (importo > 0),
  creato_il     timestamptz not null default now(),
  unique (movimento_id, tipo)
);

create table if not exists buste_paga (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null default auth.user_id(),
  fondo_id      uuid not null references fondi (id) on delete restrict,
  competenza    date not null check (extract(day from competenza) = 1),
  data          date not null,
  movimento_id  uuid null references movimenti (id) on delete set null,
  note          text not null default '',
  creato_il     timestamptz not null default now()
);

create table if not exists busta_righe (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default auth.user_id(),
  busta_id   uuid not null references buste_paga (id) on delete cascade,
  tipo       text not null check (tipo in ('TFR', 'Datore', 'Personale')),
  importo    numeric(10, 2) not null check (importo > 0),
  creato_il  timestamptz not null default now(),
  unique (busta_id, tipo)
);

create table if not exists estratti_conto (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default auth.user_id(),
  fondo_id   uuid not null references fondi (id) on delete restrict,
  data       date not null,
  valore     numeric(12, 2) not null check (valore >= 0),
  note       text not null default '',
  creato_il  timestamptz not null default now()
);

create table if not exists impostazioni (
  user_id             text primary key default auth.user_id(),
  anno_nascita        int null,
  eta_pensione        int not null default 67 check (eta_pensione between 40 and 80),
  rendimento          numeric(5, 2) not null default 3 check (rendimento between -20 and 50),
  inflazione          numeric(5, 2) not null default 2 check (inflazione between -20 and 50),
  crescita            numeric(5, 2) not null default 1.5 check (crescita between -20 and 50),
  tfr_mensile         numeric(10, 2) null,
  datore_mensile      numeric(10, 2) null,
  personale_mensile   numeric(10, 2) null,
  volontario_mensile  numeric(10, 2) not null default 0,
  aliquota            numeric(5, 2) not null default 35 check (aliquota between 0 and 60),
  limite_deducibile   numeric(10, 2) not null default 5164.57,
  creato_il           timestamptz not null default now()
);

create index if not exists buste_paga_utente_data_idx on buste_paga (user_id, data);
create index if not exists movimenti_utente_data_idx on movimenti (user_id, data);
create index if not exists estratti_conto_utente_data_idx on estratti_conto (user_id, data);
create index if not exists buste_paga_movimento_idx on buste_paga (movimento_id);
create index if not exists busta_righe_busta_idx on busta_righe (busta_id);
create index if not exists movimento_righe_movimento_idx on movimento_righe (movimento_id);

-- Trigger di coerenza. Sono security invoker: con RLS una riga di un altro utente non si vede,
-- quindi i messaggi dicono «non esiste» senza rivelare nulla.

create or replace function controlla_fondo_utente() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from fondi f where f.id = new.fondo_id and f.user_id = new.user_id) then
    raise exception 'Il fondo non esiste';
  end if;
  return new;
end $$;

create or replace function controlla_busta_movimento() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  m record;
begin
  if new.movimento_id is null then
    return new;
  end if;
  select fondo_id, user_id into m from movimenti where id = new.movimento_id;
  if not found or m.user_id <> new.user_id then
    raise exception 'Il movimento non esiste';
  end if;
  if m.fondo_id <> new.fondo_id then
    raise exception 'Il movimento è di un altro fondo';
  end if;
  return new;
end $$;

create or replace function controlla_riga_busta() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from buste_paga b where b.id = new.busta_id and b.user_id = new.user_id) then
    raise exception 'La busta paga non esiste';
  end if;
  return new;
end $$;

create or replace function controlla_riga_movimento() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from movimenti m where m.id = new.movimento_id and m.user_id = new.user_id
  ) then
    raise exception 'Il movimento non esiste';
  end if;
  return new;
end $$;

create or replace function controlla_cambio_fondo_movimento() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.fondo_id is distinct from old.fondo_id
     and exists (select 1 from buste_paga b where b.movimento_id = old.id) then
    raise exception 'Il movimento ha buste paga collegate: scollegale prima di cambiare fondo';
  end if;
  return new;
end $$;

create or replace trigger buste_paga_fondo_utente
  before insert or update of fondo_id, user_id on buste_paga
  for each row execute function controlla_fondo_utente();
create or replace trigger movimenti_fondo_utente
  before insert or update of fondo_id, user_id on movimenti
  for each row execute function controlla_fondo_utente();
create or replace trigger estratti_conto_fondo_utente
  before insert or update of fondo_id, user_id on estratti_conto
  for each row execute function controlla_fondo_utente();

-- Lo scollegamento da on delete set null aggiorna movimento_id a null: il trigger lo lascia passare.
create or replace trigger buste_paga_movimento
  before insert or update of movimento_id, fondo_id, user_id on buste_paga
  for each row execute function controlla_busta_movimento();

create or replace trigger busta_righe_testata
  before insert or update of busta_id, user_id on busta_righe
  for each row execute function controlla_riga_busta();
create or replace trigger movimento_righe_testata
  before insert or update of movimento_id, user_id on movimento_righe
  for each row execute function controlla_riga_movimento();

-- Sulle testate e non sulle buste: un movimento senza buste collegate si può spostare.
create or replace trigger movimenti_cambio_fondo
  before update of fondo_id on movimenti
  for each row execute function controlla_cambio_fondo_movimento();

-- RLS per proprietario e grant al ruolo della Data API; niente a anonymous.

grant usage on schema public to authenticated;

alter table fondi enable row level security;
drop policy if exists fondi_proprietario on fondi;
create policy fondi_proprietario on fondi for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on fondi to authenticated;

alter table movimenti enable row level security;
drop policy if exists movimenti_proprietario on movimenti;
create policy movimenti_proprietario on movimenti for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on movimenti to authenticated;

alter table movimento_righe enable row level security;
drop policy if exists movimento_righe_proprietario on movimento_righe;
create policy movimento_righe_proprietario on movimento_righe for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on movimento_righe to authenticated;

alter table buste_paga enable row level security;
drop policy if exists buste_paga_proprietario on buste_paga;
create policy buste_paga_proprietario on buste_paga for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on buste_paga to authenticated;

alter table busta_righe enable row level security;
drop policy if exists busta_righe_proprietario on busta_righe;
create policy busta_righe_proprietario on busta_righe for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on busta_righe to authenticated;

alter table estratti_conto enable row level security;
drop policy if exists estratti_conto_proprietario on estratti_conto;
create policy estratti_conto_proprietario on estratti_conto for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on estratti_conto to authenticated;

alter table impostazioni enable row level security;
drop policy if exists impostazioni_proprietario on impostazioni;
create policy impostazioni_proprietario on impostazioni for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on impostazioni to authenticated;
