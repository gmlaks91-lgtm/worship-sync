-- =============================================================================
-- 1) chord_sheet_blocks.section_tag CHECK: V / T / E 등 레거시·실무 태그 허용
-- 2) chord_sheet_block_to_jsonb + chord_sheet_log_block_history + reorder RPC
--    CREATE OR REPLACE 로 테이블 행 타입(lines_json 등)과 동기화
-- 3) PostgREST 스키마 캐시 리로드 힌트 (로컬/호스팅 환경에 따라 무시될 수 있음)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 복구 준비: 예전 history 트리거가 auth.uid() = NULL 에서 실패할 수 있으므로
-- 스키마 보정/백필 중에는 잠시 분리
-- ---------------------------------------------------------------------------
drop trigger if exists trg_chord_sheet_blocks_history on public.chord_sheet_blocks;

-- ---------------------------------------------------------------------------
-- lines_json 복구: 누락된 환경에서도 이 마이그레이션 하나로 self-heal
-- ---------------------------------------------------------------------------
alter table public.chord_sheet_blocks
  add column if not exists lines_json jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chord_sheet_blocks'
      and column_name = 'lyrics'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chord_sheet_blocks'
      and column_name = 'chords'
  ) then
    execute $sql$
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
      where b.id = sub.id
        and b.lines_json is null
    $sql$;

    execute $sql$
      update public.chord_sheet_blocks b
      set lines_json = jsonb_set(
        coalesce(b.lines_json, '{"version":1,"lines":[]}'::jsonb),
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
        and jsonb_array_length(coalesce(b.lines_json #> '{lines}', '[]'::jsonb)) > 0
    $sql$;
  end if;
end
$$;

update public.chord_sheet_blocks
set lines_json = '{"version":1,"lines":[]}'::jsonb
where lines_json is null;

alter table public.chord_sheet_blocks
  alter column lines_json set default '{"version":1,"lines":[]}'::jsonb;

alter table public.chord_sheet_blocks
  alter column lines_json set not null;

-- ---------------------------------------------------------------------------
-- section_tag
-- ---------------------------------------------------------------------------
update public.chord_sheet_blocks
set section_tag = case section_tag
  when 'Intro' then 'I'
  when 'Bridge' then 'B'
  when 'PreChorus' then 'B'
  when 'Outro' then 'O'
  when 'Instrumental' then '간주'
  when 'Custom' then 'A'
  else section_tag
end
where section_tag in ('Intro', 'Bridge', 'PreChorus', 'Outro', 'Instrumental', 'Custom');

alter table public.chord_sheet_blocks
  drop constraint if exists chord_sheet_blocks_section_tag_check;

alter table public.chord_sheet_blocks
  add constraint chord_sheet_blocks_section_tag_check check (
    section_tag in (
      'I',
      'A',
      'B',
      'C',
      '간주',
      'O',
      'V',
      'T',
      'E'
    )
  );

-- ---------------------------------------------------------------------------
-- 스냅샷 빌더: chord_sheet_blocks 현재 컬럼만 직렬화
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
-- 블록 히스토리 트리거: UPDATE 시 lines_json 포함 동등 비교
-- ---------------------------------------------------------------------------
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

-- 트리거는 동일 이름·본문으로 재부착해 실행 계획/캐시를 확실히 갱신
drop trigger if exists trg_chord_sheet_blocks_history on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_history
  after insert or update or delete on public.chord_sheet_blocks
  for each row
  execute function public.chord_sheet_log_block_history();

-- ---------------------------------------------------------------------------
-- reorder RPC (스냅샷에 chord_sheet_block_to_jsonb 사용)
-- ---------------------------------------------------------------------------
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

-- API 레이어가 오래된 컬럼 목록을 들고 있을 때 스키마 리로드 유도
notify pgrst, 'reload schema';

commit;
