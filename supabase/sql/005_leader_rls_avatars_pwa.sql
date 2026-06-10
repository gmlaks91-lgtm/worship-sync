-- =============================================================================
-- WorshipSync — 리더 전용 콘티/곡 RLS + profiles.avatar_url + avatars Storage
-- Supabase SQL Editor에서 실행하세요. (기존 001~004 적용 후 권장)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles.avatar_url
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'Supabase Storage public URL (bucket avatars)';

-- ---------------------------------------------------------------------------
-- 2) 리더 여부 헬퍼 (RLS 정책 가독성)
-- ---------------------------------------------------------------------------
create or replace function public.is_leader(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'leader' from public.profiles p where p.id = uid limit 1),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) songs — 읽기는 전원, 쓰기는 리더만
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_all_songs" on public.songs;

drop policy if exists "songs_select_authenticated" on public.songs;
create policy "songs_select_authenticated"
  on public.songs
  for select
  to authenticated
  using (true);

drop policy if exists "songs_insert_leader" on public.songs;
create policy "songs_insert_leader"
  on public.songs
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "songs_update_leader" on public.songs;
create policy "songs_update_leader"
  on public.songs
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "songs_delete_leader" on public.songs;
create policy "songs_delete_leader"
  on public.songs
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) setlists — 읽기 전원, 쓰기 리더만
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_all_setlists" on public.setlists;

drop policy if exists "setlists_select_authenticated" on public.setlists;
create policy "setlists_select_authenticated"
  on public.setlists
  for select
  to authenticated
  using (true);

drop policy if exists "setlists_insert_leader" on public.setlists;
create policy "setlists_insert_leader"
  on public.setlists
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlists_update_leader" on public.setlists;
create policy "setlists_update_leader"
  on public.setlists
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlists_delete_leader" on public.setlists;
create policy "setlists_delete_leader"
  on public.setlists
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

-- ---------------------------------------------------------------------------
-- 5) setlist_songs — 읽기 전원, 쓰기 리더만
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_all_setlist_songs" on public.setlist_songs;

drop policy if exists "setlist_songs_select_authenticated" on public.setlist_songs;
create policy "setlist_songs_select_authenticated"
  on public.setlist_songs
  for select
  to authenticated
  using (true);

drop policy if exists "setlist_songs_insert_leader" on public.setlist_songs;
create policy "setlist_songs_insert_leader"
  on public.setlist_songs
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlist_songs_update_leader" on public.setlist_songs;
create policy "setlist_songs_update_leader"
  on public.setlist_songs
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlist_songs_delete_leader" on public.setlist_songs;
create policy "setlist_songs_delete_leader"
  on public.setlist_songs
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) profiles — 본인 프로필 수정(이름·아바타 등)만 허용 (SELECT는 팀 조회용 유지)
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_all_profiles" on public.profiles;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 7) Storage: public 버킷 avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 경로 규칙: {auth.uid()}/...  (예: {uuid}/avatar)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
