-- =============================================================================
-- 기도 공유(prayer_requests): 본인 또는 리더/관리자 수정·삭제 허용
-- - UPDATE 정책이 없어 수정이 불가능했음 → 본인/리더 UPDATE 정책 추가
-- - DELETE는 011 스크립트에서 본인/리더 허용했으나, 미적용 환경 대비 재정의
-- =============================================================================

begin;

alter table public.prayer_requests enable row level security;

drop policy if exists "prayer_requests_update_own_or_leader" on public.prayer_requests;
create policy "prayer_requests_update_own_or_leader"
  on public.prayer_requests
  for update
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()))
  with check (auth.uid() = user_id or public.is_leader(auth.uid()));

drop policy if exists "prayer_requests_delete_own_or_leader" on public.prayer_requests;
create policy "prayer_requests_delete_own_or_leader"
  on public.prayer_requests
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()));

notify pgrst, 'reload schema';

commit;
