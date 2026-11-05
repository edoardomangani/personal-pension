-- Data di aggiornamento della foto e controlli di cancella_account() (ACC-01-C4).

-- security invoker: gira con i diritti di chi aggiorna, già vincolato da RLS alla sua riga.
create or replace function foto_profilo_aggiornata_il() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.aggiornata_il := now();
  return new;
end $$;

drop trigger if exists foto_profilo_aggiornata_il on foto_profilo;
create trigger foto_profilo_aggiornata_il before update on foto_profilo
  for each row execute function foto_profilo_aggiornata_il();

-- Come nella 003, più due controlli: senza RLS scavalcato i delete tolgono zero righe in silenzio
-- e l'utente di Neon Auth sparirebbe lasciando dati orfani. XX000 arriva al client come errore generico.
create or replace function cancella_account() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_utente text := auth.user_id();
  v_tabella text;
begin
  if v_utente is null then
    raise exception 'Sessione mancante';
  end if;

  -- I controlli dei residui girano col ruolo dei delete: sotto RLS vedrebbero zero righe come loro.
  -- USAGE: RLS la scavalcano solo i privilegi ereditati del proprietario, non l'appartenenza NOINHERIT.
  if not (select rolbypassrls from pg_roles where rolname = current_user) then
    select c.relname into v_tabella
      from pg_class c
     where c.oid in ('buste_paga'::regclass, 'movimenti'::regclass, 'estratti_conto'::regclass,
                     'fondi'::regclass, 'impostazioni'::regclass, 'foto_profilo'::regclass)
       and (not pg_has_role(current_user, c.relowner, 'USAGE') or c.relforcerowsecurity)
     limit 1;
    if v_tabella is not null then
      raise exception 'cancella_account: il proprietario della funzione non scavalca RLS su %', v_tabella
        using errcode = 'XX000';
    end if;
  end if;

  delete from buste_paga where user_id = v_utente;
  delete from movimenti where user_id = v_utente;
  delete from estratti_conto where user_id = v_utente;
  delete from fondi where user_id = v_utente;
  delete from impostazioni where user_id = v_utente;
  delete from foto_profilo where user_id = v_utente;

  if exists (select 1 from buste_paga where user_id = v_utente) then
    v_tabella := 'buste_paga';
  elsif exists (select 1 from movimenti where user_id = v_utente) then
    v_tabella := 'movimenti';
  elsif exists (select 1 from estratti_conto where user_id = v_utente) then
    v_tabella := 'estratti_conto';
  elsif exists (select 1 from fondi where user_id = v_utente) then
    v_tabella := 'fondi';
  elsif exists (select 1 from impostazioni where user_id = v_utente) then
    v_tabella := 'impostazioni';
  elsif exists (select 1 from foto_profilo where user_id = v_utente) then
    v_tabella := 'foto_profilo';
  end if;
  if v_tabella is not null then
    raise exception 'cancella_account: restano righe in %', v_tabella
      using errcode = 'XX000';
  end if;

  -- Sessioni e account di Neon Auth vanno a cascata.
  delete from neon_auth."user" where id::text = v_utente;
end $$;

revoke execute on function cancella_account() from public, anonymous;
grant execute on function cancella_account() to authenticated;

notify pgrst, 'reload schema';
