-- =============================================================================
-- WorshipSync — Storage 버킷 `sheets` + RLS
-- Supabase SQL Editor에 붙여넣어 실행하세요.
--
-- 참고: 공개(public) 버킷 + 객체 SELECT 허용 정책은 브라우저에서
-- getPublicUrl 로 연 `<img>` / `<iframe>` 이 인증 헤더 없이 로드되게 합니다.
-- 업로드(INSERT)는 authenticated 전용입니다.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.sheets 테이블 (없으면 생성) — 악보 메타데이터
-- ---------------------------------------------------------------------------
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  file_url text not null,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.sheets
  add column if not exists created_at timestamptz not null default now();

create index if not exists sheets_song_id_created_idx
  on public.sheets (song_id, created_at desc);

alter table public.sheets enable row level security;

drop policy if exists "authenticated_all_sheets_table" on public.sheets;
create policy "authenticated_all_sheets_table"
  on public.sheets
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage: 버킷 생성
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sheets',
  'sheets',
  true,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage: RLS 정책 (storage.objects)
-- ---------------------------------------------------------------------------
drop policy if exists "sheets_authenticated_insert" on storage.objects;
create policy "sheets_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sheets');

drop policy if exists "sheets_authenticated_select" on storage.objects;
create policy "sheets_authenticated_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'sheets');

-- 공개 URL로 파일을 열람할 때(이미지/PDF) 익명 GET 이 필요하면 아래 정책을 유지하세요.
drop policy if exists "sheets_public_select" on storage.objects;
create policy "sheets_public_select"
  on storage.objects
  for select
  using (bucket_id = 'sheets');
