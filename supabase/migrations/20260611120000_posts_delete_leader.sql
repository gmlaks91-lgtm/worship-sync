-- 리더/관리자는 모든 게시글 삭제 가능
begin;

drop policy if exists "posts_delete_leader" on public.posts;
create policy "posts_delete_leader"
  on public.posts
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

notify pgrst, 'reload schema';

commit;
