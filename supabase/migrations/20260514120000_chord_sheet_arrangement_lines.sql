-- =============================================================================
-- WorshipSync — 마스터 파트 + 진행 순서(arrangement) + 인라인 코드(lines_json)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) 새 컬럼 (nullable → 백필 후 NOT NULL)
-- ---------------------------------------------------------------------------
alter table public.chord_sheet_documents
  add column if not exists arrangement jsonb;

alter table public.chord_sheet_blocks
  add column if not exists lines_json jsonb;

-- ---------------------------------------------------------------------------
-- 2) lines_json 백필 (가사 줄 단위 → { text, chords[] })
-- ---------------------------------------------------------------------------
update public.chord_sheet_blocks b
set lines_json = sub.j
from (
  select
    b2.id,
    jsonb_build_object(
      'version',
      1,
      'lines',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'text', coalesce(nullif(trim(u.l), ''), ''),
              'chords', '[]'::jsonb
            )
            order by u.ord
          )
          from unnest(string_to_array(coalesce(b2.lyrics, ''), E'\n')) with ordinality as u(l, ord)
        ),
        '[]'::jsonb
      )
    ) as j
  from public.chord_sheet_blocks b2
) sub
where b.id = sub.id;

update public.chord_sheet_blocks b
set lines_json = jsonb_set(
  b.lines_json,
  '{lines,0,chords}',
  case
    when trim(b.chords) ~ '^\[[^\]]+\]' then
      jsonb_build_array(
        jsonb_build_object(
          'at',
          0,
          'symbol',
          (regexp_match(trim(b.chords), '\[([^\]]+)\]'))[1]
        )
      )
    when coalesce(trim(b.chords), '') <> '' then
      jsonb_build_array(jsonb_build_object('at', 0, 'symbol', left(trim(b.chords), 24)))
    else '[]'::jsonb
  end,
  true
)
where coalesce(trim(b.chords), '') <> ''
  and jsonb_array_length(coalesce(b.lines_json #> '{lines}', '[]'::jsonb)) > 0;

-- ---------------------------------------------------------------------------
-- 3) arrangement 백필 (마스터 블록 순서 = 기본 진행 순서)
-- ---------------------------------------------------------------------------
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

update public.chord_sheet_documents
set arrangement = '[]'::jsonb
where arrangement is null;

-- ---------------------------------------------------------------------------
-- 4) 섹션 태그 실무형으로 변경
-- ---------------------------------------------------------------------------
alter table public.chord_sheet_blocks
  drop constraint if exists chord_sheet_blocks_section_tag_check;

update public.chord_sheet_blocks
set section_tag = case section_tag
  when 'V' then 'A'
  when 'C' then 'C'
  when 'T' then 'O'
  when 'Intro' then 'I'
  when 'Bridge' then 'B'
  when 'PreChorus' then 'B'
  when 'Outro' then 'O'
  when 'Instrumental' then '간주'
  when 'Custom' then 'A'
  else 'A'
end;

alter table public.chord_sheet_blocks
  add constraint chord_sheet_blocks_section_tag_check check (
    section_tag in ('I', 'A', 'B', 'C', '간주', 'O')
  );

-- ---------------------------------------------------------------------------
-- 5) 가사/코드 텍스트 컬럼 제거
-- ---------------------------------------------------------------------------
alter table public.chord_sheet_blocks
  drop column if exists lyrics;

alter table public.chord_sheet_blocks
  drop column if exists chords;

alter table public.chord_sheet_blocks
  alter column lines_json set default '{"version":1,"lines":[]}'::jsonb;

alter table public.chord_sheet_blocks
  alter column lines_json set not null;

alter table public.chord_sheet_documents
  alter column arrangement set default '[]'::jsonb;

alter table public.chord_sheet_documents
  alter column arrangement set not null;

-- ---------------------------------------------------------------------------
-- 6) 히스토리 스냅샷용 JSON 빌더 갱신
-- ---------------------------------------------------------------------------
create or replace function public.chord_sheet_block_to_jsonb(b public.chord_sheet_blocks)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', (b).id,
      'document_id', (b).document_id,
      'section_tag', (b).section_tag,
      'custom_label', (b).custom_label,
      'order_index', (b).order_index,
      'lines_json', (b).lines_json,
      'transpose_semitones', (b).transpose_semitones,
      'created_at', (b).created_at,
      'updated_at', (b).updated_at
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 7) 리더 전용: 진행 순서(arrangement) 저장
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 8) 새 마스터 블록 → 진행 순서 맨 끤에 자동 추가 / 삭제 시 arrangement 정리
-- ---------------------------------------------------------------------------
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

commit;
