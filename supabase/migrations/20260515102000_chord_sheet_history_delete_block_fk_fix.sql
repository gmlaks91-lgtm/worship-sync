-- =============================================================================
-- chord_sheet_history: DELETE 이후에는 원본 block row 가 이미 사라졌으므로
-- history.block_id 는 NULL 로 기록해 FK 위반을 막는다.
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

drop trigger if exists trg_chord_sheet_blocks_history on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_history
  after insert or update or delete on public.chord_sheet_blocks
  for each row
  execute function public.chord_sheet_log_block_history();

commit;
