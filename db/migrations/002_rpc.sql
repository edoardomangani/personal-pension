-- Scritture su più tabelle in una sola chiamata della Data API: ogni RPC è una transazione.
-- security invoker: valgono RLS e trigger di 001; user_id lo mette il default auth.user_id().
-- Con RLS un update su una riga non visibile tocca zero righe: ogni passo controlla found.

create or replace function salva_busta(p jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid := (p->>'id')::uuid;
begin
  if jsonb_typeof(p->'righe') is distinct from 'array' or jsonb_array_length(p->'righe') = 0 then
    raise exception 'Serve almeno una riga';
  end if;

  if v_id is null then
    insert into buste_paga (fondo_id, competenza, data, note)
    values ((p->>'fondo_id')::uuid, (p->>'competenza')::date, (p->>'data')::date,
            coalesce(p->>'note', ''))
    returning buste_paga.id into v_id;
  else
    update buste_paga b
       set fondo_id = (p->>'fondo_id')::uuid,
           competenza = (p->>'competenza')::date,
           data = (p->>'data')::date,
           note = coalesce(p->>'note', '')
     where b.id = v_id;
    if not found then
      raise exception 'La busta paga non esiste';
    end if;
    delete from busta_righe r where r.busta_id = v_id;
  end if;

  -- Cast da testo e non da float: l'importo resta esatto (R5).
  insert into busta_righe (busta_id, tipo, importo)
  select v_id, e->>'tipo', (e->>'importo')::numeric
    from jsonb_array_elements(p->'righe') e;

  return v_id;
end $$;

create or replace function salva_movimento(p jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid := (p->>'id')::uuid;
  v_busta uuid;
  v_collegata uuid;
begin
  if jsonb_typeof(p->'righe') is distinct from 'array' or jsonb_array_length(p->'righe') = 0 then
    raise exception 'Serve almeno una riga';
  end if;

  if v_id is null then
    insert into movimenti (fondo_id, data, note)
    values ((p->>'fondo_id')::uuid, (p->>'data')::date, coalesce(p->>'note', ''))
    returning movimenti.id into v_id;
  else
    perform 1 from movimenti m where m.id = v_id for update;
    if not found then
      raise exception 'Il movimento non esiste';
    end if;
    -- Prima si scollega, poi si cambia la testata: il trigger sul cambio di fondo non scatta.
    update buste_paga b set movimento_id = null where b.movimento_id = v_id;
    update movimenti m
       set fondo_id = (p->>'fondo_id')::uuid,
           data = (p->>'data')::date,
           note = coalesce(p->>'note', '')
     where m.id = v_id;
    delete from movimento_righe r where r.movimento_id = v_id;
  end if;

  insert into movimento_righe (movimento_id, tipo, importo)
  select v_id, e->>'tipo', (e->>'importo')::numeric
    from jsonb_array_elements(p->'righe') e;

  for v_busta in
    select (t.valore)::uuid from jsonb_array_elements_text(coalesce(p->'buste', '[]')) t(valore)
  loop
    select b.movimento_id into v_collegata from buste_paga b where b.id = v_busta for update;
    if not found then
      raise exception 'La busta paga non esiste';
    end if;
    if v_collegata is not null and v_collegata <> v_id then
      raise exception 'La busta paga è già in un altro movimento';
    end if;
    update buste_paga b set movimento_id = v_id where b.id = v_busta;
  end loop;

  return v_id;
end $$;

create or replace function elimina_movimento(id uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  update buste_paga b set movimento_id = null where b.movimento_id = elimina_movimento.id;
  delete from movimenti m where m.id = elimina_movimento.id;
end $$;

-- Postgres dà execute a PUBLIC su ogni funzione nuova: senza revoke la eseguirebbe anche anonymous.
revoke execute on function salva_busta(jsonb) from public, anonymous;
revoke execute on function salva_movimento(jsonb) from public, anonymous;
revoke execute on function elimina_movimento(uuid) from public, anonymous;
grant execute on function salva_busta(jsonb) to authenticated;
grant execute on function salva_movimento(jsonb) to authenticated;
grant execute on function elimina_movimento(uuid) to authenticated;

notify pgrst, 'reload schema';
