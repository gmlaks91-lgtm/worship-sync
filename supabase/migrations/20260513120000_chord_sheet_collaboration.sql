-- =============================================================================
-- WorshipSync — 협업형 코드 악보 (블록 + 히스토리 + 리더 전용 재정렬 RPC)
-- 기존 public.sheets(이미지 악보)와 별도 트랙입니다.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helpers (테이블 타입을 쓰지 않는 것만 먼저 정의)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_chord_sheet_layout(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role in ('leader', 'admin')
      from public.profiles p
      where p.id = p_uid
      limit 1
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.chord_sheet_documents (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  title text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint chord_sheet_documents_song_id_key unique (song_id)
);

create index if not exists chord_sheet_documents_updated_idx
  on public.chord_sheet_documents (updated_at desc);

create table if not exists public.chord_sheet_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.chord_sheet_documents (id) on delete cascade,
  section_tag text not null,
  custom_label text,
  order_index integer not null,
  lyrics text not null default '',
  chords text not null default '',
  transpose_semitones smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chord_sheet_blocks_section_tag_check check (
    section_tag in (
      'V',
      'C',
      'T',
      'Intro',
      'Bridge',
      'PreChorus',
      'Outro',
      'Instrumental',
      'Custom'
    )
  ),
  constraint chord_sheet_blocks_transpose_check check (
    transpose_semitones between -12 and 12
  )
);

create index if not exists chord_sheet_blocks_doc_order_idx
  on public.chord_sheet_blocks (document_id, order_index);

create index if not exists chord_sheet_blocks_document_id_idx
  on public.chord_sheet_blocks (document_id);

-- chord_sheet_blocks 행 타입이 생긴 뒤에만 정의 가능
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
      'lyrics', (b).lyrics,
      'chords', (b).chords,
      'transpose_semitones', (b).transpose_semitones,
      'created_at', (b).created_at,
      'updated_at', (b).updated_at
    )
  );
$$;

create table if not exists public.chord_sheet_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.chord_sheet_documents (id) on delete cascade,
  block_id uuid references public.chord_sheet_blocks (id) on delete set null,
  action text not null,
  snapshot_before jsonb not null,
  snapshot_after jsonb,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint chord_sheet_history_action_check check (
    action in ('block_insert', 'block_update', 'block_delete', 'reorder')
  )
);

create index if not exists chord_sheet_history_doc_created_idx
  on public.chord_sheet_history (document_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at on blocks
-- ---------------------------------------------------------------------------
drop trigger if exists trg_chord_sheet_blocks_updated_at on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_updated_at
  before update on public.chord_sheet_blocks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Touch parent document (RLS 우회 — SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.touch_chord_sheet_document_from_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc uuid;
begin
  v_doc := coalesce(new.document_id, old.document_id);
  if v_doc is null then
    return coalesce(new, old);
  end if;

  update public.chord_sheet_documents d
  set
    updated_at = now(),
    updated_by = auth.uid()
  where d.id = v_doc;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_chord_sheet_blocks_touch_doc on public.chord_sheet_blocks;
create trigger trg_chord_sheet_blocks_touch_doc
  after insert or update or delete on public.chord_sheet_blocks
  for each row
  execute function public.touch_chord_sheet_document_from_block();

-- ---------------------------------------------------------------------------
-- History: 블록 단위 insert / update / delete
-- 순수 order_index 변경만 있는 UPDATE는 로그 생략 → reorder RPC가 한 번에 기록
-- ---------------------------------------------------------------------------
create or replace function public.chord_sheet_log_block_history()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc uuid;
  v_only_order boolean;
begin
  if tg_op = 'INSERT' then
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
      and old.lyrics is not distinct from new.lyrics
      and old.chords is not distinct from new.chords
      and old.transpose_semitones is not distinct from new.transpose_semitones
      and old.section_tag is not distinct from new.section_tag
      and old.custom_label is not distinct from new.custom_label
      and old.document_id is not distinct from new.document_id;

    if v_only_order then
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

-- ---------------------------------------------------------------------------
-- 리더/관리자: 블록 순서 일괄 변경 + reorder 히스토리 1건
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
end;
$$;

grant execute on function public.reorder_chord_sheet_blocks(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.chord_sheet_documents enable row level security;
alter table public.chord_sheet_blocks enable row level security;
alter table public.chord_sheet_history enable row level security;

-- documents
drop policy if exists "chord_sheet_documents_select_auth" on public.chord_sheet_documents;
create policy "chord_sheet_documents_select_auth"
  on public.chord_sheet_documents
  for select
  to authenticated
  using (true);

drop policy if exists "chord_sheet_documents_insert_auth" on public.chord_sheet_documents;
create policy "chord_sheet_documents_insert_auth"
  on public.chord_sheet_documents
  for insert
  to authenticated
  with check (
    exists (select 1 from public.songs s where s.id = song_id)
  );

drop policy if exists "chord_sheet_documents_update_auth" on public.chord_sheet_documents;
create policy "chord_sheet_documents_update_auth"
  on public.chord_sheet_documents
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "chord_sheet_documents_delete_leader" on public.chord_sheet_documents;
create policy "chord_sheet_documents_delete_leader"
  on public.chord_sheet_documents
  for delete
  to authenticated
  using (public.can_manage_chord_sheet_layout(auth.uid()));

-- blocks
drop policy if exists "chord_sheet_blocks_select_auth" on public.chord_sheet_blocks;
create policy "chord_sheet_blocks_select_auth"
  on public.chord_sheet_blocks
  for select
  to authenticated
  using (true);

drop policy if exists "chord_sheet_blocks_insert_auth" on public.chord_sheet_blocks;
create policy "chord_sheet_blocks_insert_auth"
  on public.chord_sheet_blocks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chord_sheet_documents d
      where d.id = document_id
    )
  );

drop policy if exists "chord_sheet_blocks_update_auth" on public.chord_sheet_blocks;
create policy "chord_sheet_blocks_update_auth"
  on public.chord_sheet_blocks
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "chord_sheet_blocks_delete_auth" on public.chord_sheet_blocks;
create policy "chord_sheet_blocks_delete_auth"
  on public.chord_sheet_blocks
  for delete
  to authenticated
  using (true);

-- history (읽기 전원 / 쓰기는 트리거·RPC가 actor_id=auth.uid()로 삽입)
drop policy if exists "chord_sheet_history_select_auth" on public.chord_sheet_history;
create policy "chord_sheet_history_select_auth"
  on public.chord_sheet_history
  for select
  to authenticated
  using (true);

drop policy if exists "chord_sheet_history_insert_own_actor" on public.chord_sheet_history;
create policy "chord_sheet_history_insert_own_actor"
  on public.chord_sheet_history
  for insert
  to authenticated
  with check (actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime (대시보드에서 publication 존재 시에만 추가)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.chord_sheet_blocks';
    exception
      when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.chord_sheet_documents';
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$$;

commit;
