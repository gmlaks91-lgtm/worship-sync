-- =============================================================================
-- QT 나눔방: qt_images 버킷 + qt_shares 테이블 (정책 완전 개방)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Storage: qt_images (Public)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qt_images',
  'qt_images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "qt_images_public_select" on storage.objects;
create policy "qt_images_public_select"
  on storage.objects
  for select
  to public
  using (bucket_id = 'qt_images');

drop policy if exists "qt_images_public_insert" on storage.objects;
create policy "qt_images_public_insert"
  on storage.objects
  for insert
  to public
  with check (bucket_id = 'qt_images');

drop policy if exists "qt_images_public_update" on storage.objects;
create policy "qt_images_public_update"
  on storage.objects
  for update
  to public
  using (bucket_id = 'qt_images')
  with check (bucket_id = 'qt_images');

drop policy if exists "qt_images_public_delete" on storage.objects;
create policy "qt_images_public_delete"
  on storage.objects
  for delete
  to public
  using (bucket_id = 'qt_images');

-- -----------------------------------------------------------------------------
-- Table: qt_shares
-- -----------------------------------------------------------------------------
create table if not exists public.qt_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '팀원',
  author_avatar_url text,
  message text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists qt_shares_created_at_idx
  on public.qt_shares (created_at asc);

alter table public.qt_shares enable row level security;

drop policy if exists "qt_shares_select_all" on public.qt_shares;
create policy "qt_shares_select_all"
  on public.qt_shares
  for select
  to public
  using (true);

drop policy if exists "qt_shares_insert_all" on public.qt_shares;
create policy "qt_shares_insert_all"
  on public.qt_shares
  for insert
  to public
  with check (true);

drop policy if exists "qt_shares_update_all" on public.qt_shares;
create policy "qt_shares_update_all"
  on public.qt_shares
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "qt_shares_delete_all" on public.qt_shares;
create policy "qt_shares_delete_all"
  on public.qt_shares
  for delete
  to public
  using (true);

-- Realtime (채팅방 즉시 반영)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.qt_shares;
  end if;
exception
  when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';

commit;
