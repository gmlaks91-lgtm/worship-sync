-- =============================================================================
-- set_chord_sheet_arrangement RPC 재등록 + PostgREST schema cache reload
-- =============================================================================

begin;

alter table public.chord_sheet_documents
  add column if not exists arrangement jsonb;

update public.chord_sheet_documents d
set arrangement = coalesce(
  (
    select jsonb_agg(jsonb_build_object('block_id', b.id) order by b.order_index, b.id)
    from public.chord_sheet_blocks b
    where b.document_id = d.id
  ),
  '[]'::jsonb
)
where d.arrangement is null;

alter table public.chord_sheet_documents
  alter column arrangement set default '[]'::jsonb;

alter table public.chord_sheet_documents
  alter column arrangement set not null;

create or replace function public.set_chord_sheet_arrangement(
  p_document_id uuid,
  p_arrangement jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  el jsonb;
  bid uuid;
begin
  if not public.can_manage_chord_sheet_layout(auth.uid()) then
    raise exception 'arrangement forbidden';
  end if;

  if p_arrangement is null or jsonb_typeof(p_arrangement) <> 'array' then
    raise exception 'arrangement must be a json array';
  end if;

  for el in select * from jsonb_array_elements(p_arrangement)
  loop
    bid := nullif(el ->> 'block_id', '')::uuid;
    if bid is null then
      raise exception 'invalid arrangement entry: missing block_id';
    end if;

    if not exists (
      select 1
      from public.chord_sheet_blocks b
      where b.id = bid
        and b.document_id = p_document_id
    ) then
      raise exception 'unknown block in arrangement';
    end if;
  end loop;

  update public.chord_sheet_documents d
  set
    arrangement = p_arrangement,
    updated_at = now(),
    updated_by = auth.uid()
  where d.id = p_document_id;
end;
$$;

grant execute on function public.set_chord_sheet_arrangement(uuid, jsonb) to authenticated;

create or replace function public.append_chord_block_to_arrangement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chord_sheet_documents d
  set
    arrangement = coalesce(d.arrangement, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('block_id', new.id)),
    updated_at = now(),
    updated_by = auth.uid()
  where d.id = new.document_id;
  return new;
end;
$$;

drop trigger if exists trg_chord_sheet_blocks_append_arrangement on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_append_arrangement
  after insert on public.chord_sheet_blocks
  for each row
  execute function public.append_chord_block_to_arrangement();

create or replace function public.remove_chord_block_from_arrangement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_arr jsonb;
begin
  select coalesce(
    jsonb_agg(t.el order by t.ord),
    '[]'::jsonb
  )
  into new_arr
  from jsonb_array_elements(
    (select d.arrangement from public.chord_sheet_documents d where d.id = old.document_id)
  ) with ordinality as t(el, ord)
  where (t.el ->> 'block_id')::uuid is distinct from old.id;

  update public.chord_sheet_documents d
  set
    arrangement = new_arr,
    updated_at = now(),
    updated_by = auth.uid()
  where d.id = old.document_id;

  return old;
end;
$$;

drop trigger if exists trg_chord_sheet_blocks_remove_arrangement on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_remove_arrangement
  after delete on public.chord_sheet_blocks
  for each row
  execute function public.remove_chord_block_from_arrangement();

notify pgrst, 'reload schema';

commit;
