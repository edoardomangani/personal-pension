-- Foto del profilo e cancellazione dell'account (ACC-01).

create table if not exists foto_profilo (
  user_id        text primary key default auth.user_id(),
  immagine       text not null
                 check (immagine like 'data:image/jpeg;base64,%' and length(immagine) <= 200000),
  aggiornata_il  timestamptz not null default now()
);

alter table foto_profilo enable row level security;
drop policy if exists foto_profilo_proprietario on foto_profilo;
create policy foto_profilo_proprietario on foto_profilo for all to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());
grant select, insert, update, delete on foto_profilo to authenticated;

-- security definer perché deve cancellare la riga di neon_auth."user": deleteUser di Neon Auth
-- è spento (risponde 404). Ogni delete filtra su auth.user_id(), mai su un parametro.
create or replace function cancella_account() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_utente text := auth.user_id();
begin
  if v_utente is null then
    raise exception 'Sessione mancante';
  end if;

  delete from buste_paga where user_id = v_utente;
  delete from movimenti where user_id = v_utente;
  delete from estratti_conto where user_id = v_utente;
  delete from fondi where user_id = v_utente;
  delete from impostazioni where user_id = v_utente;
  delete from foto_profilo where user_id = v_utente;
  -- Sessioni e account di Neon Auth vanno a cascata.
  delete from neon_auth."user" where id::text = v_utente;
end $$;

revoke execute on function cancella_account() from public, anonymous;
grant execute on function cancella_account() to authenticated;

notify pgrst, 'reload schema';
