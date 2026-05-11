-- =============================================================================
-- WorshipSync — 신규 유저 프로필 자동 생성 + 게시판(posts, comments) + RLS
-- Supabase SQL Editor에서 실행하세요.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) auth.users 삽입 시 public.profiles 자동 생성
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if uname is null or length(trim(uname)) = 0 then
    uname := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username, role)
  values (new.id, left(trim(uname), 80), 'member')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) 게시판 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('prayer', 'feedback', 'general')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_category_created_idx
  on public.posts (category, created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_created_idx
  on public.comments (post_id, created_at asc);

-- ---------------------------------------------------------------------------
-- 3) RLS — posts
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated"
  on public.posts
  for select
  to authenticated
  using (true);

-- INSERT: 로그인 사용자 누구나 글 작성 가능 (단, user_id 는 본인 id 여야 타인 도용 불가)
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) RLS — comments
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
  on public.comments
  for select
  to authenticated
  using (true);

-- INSERT: 로그인 사용자 누구나 댓글 작성 (user_id 는 본인만)
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
  on public.comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- (선택) 이미 가입된 사용자에게 프로필이 없을 때 1회 백필
-- ---------------------------------------------------------------------------
-- insert into public.profiles (id, username, role)
-- select
--   u.id,
--   left(coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)), 80),
--   'member'
-- from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id)
-- on conflict (id) do nothing;
