-- qt_posts: 작성자 user_id 추가 (누구나 메인 QT 등록)

begin;

alter table public.qt_posts
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists qt_posts_user_id_idx
  on public.qt_posts (user_id);

comment on column public.qt_posts.user_id is '메인 QT 등록한 사용자';

notify pgrst, 'reload schema';

commit;
