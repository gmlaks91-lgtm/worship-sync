-- =============================================================================
-- No-typing chord sheet editor
-- - arrangement_position on documents
-- - leader/admin structure replace RPC for highlight extraction
-- =============================================================================

begin;

alter table public.chord_sheet_documents
  add column if not exists arrangement_position text;

update public.chord_sheet_documents
set arrangement_position = coalesce(arrangement_position, 'below_title')
where arrangement_position is null;

alter table public.chord_sheet_documents
  drop constraint if exists chord_sheet_documents_arrangement_position_check;

alter table public.chord_sheet_documents
  add constraint chord_sheet_documents_arrangement_position_check check (
    arrangement_position in ('below_title', 'top_right', 'after_lyrics')
  );

alter table public.chord_sheet_documents
  alter column arrangement_position set default 'below_title';

alter table public.chord_sheet_documents
  alter column arrangement_position set not null;

create or replace function public.replace_chord_sheet_structure(
  p_document_id uuid,
  p_blocks jsonb,
  p_arrangement_position text default 'below_title'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  el jsonb;
  v_block_id uuid;
  v_idx integer := 0;
  v_arrangement jsonb := '[]'::jsonb;
  v_tag text;
  v_custom_label text;
  v_transpose integer;
  v_lines_json jsonb;
begin
  if not public.can_manage_chord_sheet_layout(auth.uid()) then
    raise exception 'replace structure forbidden';
  end if;

  if p_arrangement_position not in ('below_title', 'top_right', 'after_lyrics') then
    raise exception 'invalid arrangement_position';
  end if;

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'blocks must be a json array';
  end if;

  delete from public.chord_sheet_blocks
  where document_id = p_document_id;

  for el in
    select value
    from jsonb_array_elements(p_blocks)
  loop
    v_tag := coalesce(nullif(el ->> 'section_tag', ''), 'A');
    if v_tag not in ('I', 'A', 'B', 'C', '간주', 'O', 'V', 'T', 'E') then
      raise exception 'invalid section_tag';
    end if;

    v_custom_label := nullif(btrim(coalesce(el ->> 'custom_label', '')), '');
    v_transpose := greatest(
      -12,
      least(
        12,
        coalesce(
          case
            when coalesce(el ->> 'transpose_semitones', '') ~ '^-?\d+$' then (el ->> 'transpose_semitones')::integer
            else 0
          end,
          0
        )
      )
    );
    v_lines_json := coalesce(el -> 'lines_json', '{"version":1,"lines":[{"text":"","chords":[]}]}'::jsonb);

    insert into public.chord_sheet_blocks (
      document_id,
      section_tag,
      custom_label,
      order_index,
      lines_json,
      transpose_semitones
    )
    values (
      p_document_id,
      v_tag,
      v_custom_label,
      v_idx,
      v_lines_json,
      v_transpose
    )
    returning id into v_block_id;

    v_arrangement := v_arrangement || jsonb_build_array(jsonb_build_object('block_id', v_block_id));
    v_idx := v_idx + 1;
  end loop;

  update public.chord_sheet_documents
  set
    arrangement = v_arrangement,
    arrangement_position = p_arrangement_position,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_document_id;
end;
$$;

grant execute on function public.replace_chord_sheet_structure(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;
