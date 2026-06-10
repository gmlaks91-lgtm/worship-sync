begin;

-- =============================================================================
-- 디지털 부루마블(Blue Marble): 목장 점수/위치/얼굴 이미지 관리
--  * blue_marble 테이블 + RLS (전체 조회 가능, 리더/관리자만 수정)
--  * 7개 목장 초기 데이터(Seed)
--  * marble_faces public 스토리지 버킷 + 정책
-- =============================================================================

-- updated_at 자동 갱신 함수 (이미 있으면 재정의, 없으면 생성)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) blue_marble 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.blue_marble (
  id uuid primary key default gen_random_uuid(),
  team_name text not null unique,
  score integer not null default 0,
  position integer not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.blue_marble is '디지털 부루마블 목장 현황 (점수/위치/얼굴 이미지)';
comment on column public.blue_marble.team_name is '목장 이름';
comment on column public.blue_marble.score is '누적 점수';
comment on column public.blue_marble.position is '보드판 현재 칸 (0부터 시작, 총 24칸)';
comment on column public.blue_marble.image_url is '목자 얼굴 이미지 public URL (bucket: marble_faces)';

drop trigger if exists trg_blue_marble_updated_at on public.blue_marble;
create trigger trg_blue_marble_updated_at
  before update on public.blue_marble
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS: 누구나 조회 가능 / 리더·관리자만 수정
-- ---------------------------------------------------------------------------
alter table public.blue_marble enable row level security;

drop policy if exists "blue_marble_select_all" on public.blue_marble;
create policy "blue_marble_select_all"
  on public.blue_marble
  for select
  using (true);

drop policy if exists "blue_marble_leader_insert" on public.blue_marble;
create policy "blue_marble_leader_insert"
  on public.blue_marble
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "blue_marble_leader_update" on public.blue_marble;
create policy "blue_marble_leader_update"
  on public.blue_marble
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "blue_marble_leader_delete" on public.blue_marble;
create policy "blue_marble_leader_delete"
  on public.blue_marble
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) 초기 데이터(Seed) — 7개 목장
--    team_name unique → 재실행해도 중복 생성되지 않음(on conflict do nothing)
-- ---------------------------------------------------------------------------
insert into public.blue_marble (team_name, score, position)
values
  ('세진목장', 299, 5),
  ('채영목장', 579, 11),
  ('유찬목장', 0, 0),
  ('성욱목장', 46, 0),
  ('희만목장', 370, 7),
  ('희언목장', 419, 8),
  ('홍기목장', 212, 4)
on conflict (team_name) do nothing;

-- ---------------------------------------------------------------------------
-- 4) marble_faces public 스토리지 버킷 + 정책
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marble_faces',
  'marble_faces',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marble_faces_public_read" on storage.objects;
create policy "marble_faces_public_read"
  on storage.objects
  for select
  using (bucket_id = 'marble_faces');

drop policy if exists "marble_faces_leader_insert" on storage.objects;
create policy "marble_faces_leader_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'marble_faces'
    and public.is_leader(auth.uid())
    and name like 'marble/%'
  );

drop policy if exists "marble_faces_leader_update" on storage.objects;
create policy "marble_faces_leader_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'marble_faces'
    and public.is_leader(auth.uid())
    and name like 'marble/%'
  )
  with check (
    bucket_id = 'marble_faces'
    and public.is_leader(auth.uid())
    and name like 'marble/%'
  );

drop policy if exists "marble_faces_leader_delete" on storage.objects;
create policy "marble_faces_leader_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'marble_faces'
    and public.is_leader(auth.uid())
    and name like 'marble/%'
  );

commit;
