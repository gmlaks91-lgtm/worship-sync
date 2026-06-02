-- =============================================================================
-- QT 나눔방: 게시글(qt_posts) + 댓글(qt_comments) — 채팅형 qt_shares 대체
-- =============================================================================

begin;

-- 기존 채팅형 테이블 제거 (qt_images 버킷은 유지)
drop table if exists public.qt_shares cascade;

-- -----------------------------------------------------------------------------
-- 오늘의 말씀 (메인 QT)
-- -----------------------------------------------------------------------------
create table if not exists public.qt_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  image_url text not null,
  bible_verses text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists qt_posts_created_at_idx
  on public.qt_posts (created_at desc);

alter table public.qt_posts enable row level security;

drop policy if exists "qt_posts_select_all" on public.qt_posts;
create policy "qt_posts_select_all"
  on public.qt_posts for select to public using (true);

drop policy if exists "qt_posts_insert_all" on public.qt_posts;
create policy "qt_posts_insert_all"
  on public.qt_posts for insert to public with check (true);

drop policy if exists "qt_posts_update_all" on public.qt_posts;
create policy "qt_posts_update_all"
  on public.qt_posts for update to public using (true) with check (true);

drop policy if exists "qt_posts_delete_all" on public.qt_posts;
create policy "qt_posts_delete_all"
  on public.qt_posts for delete to public using (true);

-- -----------------------------------------------------------------------------
-- 나눔 댓글
-- -----------------------------------------------------------------------------
create table if not exists public.qt_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.qt_posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  quoted_verse text not null default '',
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists qt_comments_post_created_idx
  on public.qt_comments (post_id, created_at asc);

alter table public.qt_comments enable row level security;

drop policy if exists "qt_comments_select_all" on public.qt_comments;
create policy "qt_comments_select_all"
  on public.qt_comments for select to public using (true);

drop policy if exists "qt_comments_insert_all" on public.qt_comments;
create policy "qt_comments_insert_all"
  on public.qt_comments for insert to public with check (true);

drop policy if exists "qt_comments_update_all" on public.qt_comments;
create policy "qt_comments_update_all"
  on public.qt_comments for update to public using (true) with check (true);

drop policy if exists "qt_comments_delete_all" on public.qt_comments;
create policy "qt_comments_delete_all"
  on public.qt_comments for delete to public using (true);

-- Realtime: 새 나눔 댓글
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.qt_comments;
  end if;
exception
  when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';

commit;
