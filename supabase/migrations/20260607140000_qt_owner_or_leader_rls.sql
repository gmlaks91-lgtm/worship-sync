-- =============================================================================
-- QT 나눔방 RLS 강화: 수정/삭제는 "본인 글 또는 리더/관리자"만 허용
-- - 기존 정책(qt_posts/qt_comments의 update_all, delete_all = using(true))은
--   누구나 DB 직접 접근 시 남의 글을 수정/삭제할 수 있어 보안상 위험했음.
-- - 조회(select)/작성(insert)은 기존처럼 개방 유지.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- qt_posts
-- -----------------------------------------------------------------------------
drop policy if exists "qt_posts_update_all" on public.qt_posts;
drop policy if exists "qt_posts_update_own_or_leader" on public.qt_posts;
create policy "qt_posts_update_own_or_leader"
  on public.qt_posts
  for update
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()))
  with check (auth.uid() = user_id or public.is_leader(auth.uid()));

drop policy if exists "qt_posts_delete_all" on public.qt_posts;
drop policy if exists "qt_posts_delete_own_or_leader" on public.qt_posts;
create policy "qt_posts_delete_own_or_leader"
  on public.qt_posts
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()));

-- -----------------------------------------------------------------------------
-- qt_comments
-- -----------------------------------------------------------------------------
drop policy if exists "qt_comments_update_all" on public.qt_comments;
drop policy if exists "qt_comments_update_own_or_leader" on public.qt_comments;
create policy "qt_comments_update_own_or_leader"
  on public.qt_comments
  for update
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()))
  with check (auth.uid() = user_id or public.is_leader(auth.uid()));

drop policy if exists "qt_comments_delete_all" on public.qt_comments;
drop policy if exists "qt_comments_delete_own_or_leader" on public.qt_comments;
create policy "qt_comments_delete_own_or_leader"
  on public.qt_comments
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()));

notify pgrst, 'reload schema';

commit;
