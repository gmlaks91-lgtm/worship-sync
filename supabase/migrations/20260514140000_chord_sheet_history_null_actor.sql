-- =============================================================================
-- chord_sheet_history: auth.uid() 가 NULL일 때 INSERT 생략 (NOT NULL 위반 방지)
-- + 순수 order 변경 판별을 lines_json 스키마에 맞게 수정
-- =============================================================================

begin;

create or replace function public.chord_sheet_log_block_history()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_only_order boolean;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      return new;
    end if;
    insert into public.chord_sheet_history (
      document_id,
      block_id,
      action,
      snapshot_before,
      snapshot_after,
      actor_id
    )
    values (
      new.document_id,
      new.id,
      'block_insert',
      '{}'::jsonb,
      public.chord_sheet_block_to_jsonb(new),
      auth.uid()
    );
    return new;

  elsif tg_op = 'DELETE' then
    if auth.uid() is null then
      return old;
    end if;
    insert into public.chord_sheet_history (
      document_id,
      block_id,
      action,
      snapshot_before,
      snapshot_after,
      actor_id
    )
    values (
      old.document_id,
      null,
      'block_delete',
      public.chord_sheet_block_to_jsonb(old),
      null,
      auth.uid()
    );
    return old;

  elsif tg_op = 'UPDATE' then
    v_only_order :=
      old.order_index is distinct from new.order_index
      and old.lines_json is not distinct from new.lines_json
      and old.transpose_semitones is not distinct from new.transpose_semitones
      and old.section_tag is not distinct from new.section_tag
      and old.custom_label is not distinct from new.custom_label
      and old.document_id is not distinct from new.document_id;

    if v_only_order then
      return new;
    end if;

    if auth.uid() is null then
      return new;
    end if;

    insert into public.chord_sheet_history (
      document_id,
      block_id,
      action,
      snapshot_before,
      snapshot_after,
      actor_id
    )
    values (
      new.document_id,
      new.id,
      'block_update',
      public.chord_sheet_block_to_jsonb(old),
      public.chord_sheet_block_to_jsonb(new),
      auth.uid()
    );
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.reorder_chord_sheet_blocks(
  p_document_id uuid,
  p_block_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snap_before jsonb;
  snap_after jsonb;
  expected int;
  given int;
  i int;
begin
  if not public.can_manage_chord_sheet_layout(auth.uid()) then
    raise exception 'reorder forbidden';
  end if;

  select count(*)::int into expected
  from public.chord_sheet_blocks b
  where b.document_id = p_document_id;

  given := coalesce(array_length(p_block_ids, 1), 0);

  if expected = 0 or given <> expected then
    raise exception 'reorder id list size mismatch';
  end if;

  if exists (
    select 1
    from unnest(p_block_ids) as x(id)
    group by x.id
    having count(*) > 1
  ) then
    raise exception 'reorder duplicate ids';
  end if;

  if exists (
    select 1
    from unnest(p_block_ids) as x(id)
    left join public.chord_sheet_blocks b
      on b.id = x.id and b.document_id = p_document_id
    where b.id is null
  ) then
    raise exception 'reorder unknown block id';
  end if;

  select coalesce(
    jsonb_agg(public.chord_sheet_block_to_jsonb(b) order by b.order_index, b.id),
    '[]'::jsonb
  )
  into snap_before
  from public.chord_sheet_blocks b
  where b.document_id = p_document_id;

  for i in 1..given loop
    update public.chord_sheet_blocks b
    set order_index = i - 1
    where b.document_id = p_document_id
      and b.id = p_block_ids[i];
  end loop;

  select coalesce(
    jsonb_agg(public.chord_sheet_block_to_jsonb(b) order by b.order_index, b.id),
    '[]'::jsonb
  )
  into snap_after
  from public.chord_sheet_blocks b
  where b.document_id = p_document_id;

  if auth.uid() is not null then
    insert into public.chord_sheet_history (
      document_id,
      block_id,
      action,
      snapshot_before,
      snapshot_after,
      actor_id
    )
    values (
      p_document_id,
      null,
      'reorder',
      snap_before,
      snap_after,
      auth.uid()
    );
  end if;
end;
$$;

commit;
