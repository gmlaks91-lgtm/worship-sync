-- =============================================================================
-- 공지사항(posts) 고정 기능: is_pinned 컬럼 + 리더/관리자 고정 권한
-- =============================================================================

begin;

alter table public.posts
  add column if not exists is_pinned boolean not null default false;

-- 고정 글 우선 + 최신순 정렬 인덱스
create index if not exists posts_category_pinned_created_idx
  on public.posts (category, is_pinned desc, created_at desc);

comment on column public.posts.is_pinned is '공지 상단 고정 여부 (리더/관리자만 변경)';

-- 리더/관리자는 모든 글을 수정할 수 있음 (고정 토글 포함)
drop policy if exists "posts_update_leader" on public.posts;
create policy "posts_update_leader"
  on public.posts
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

notify pgrst, 'reload schema';

commit;
