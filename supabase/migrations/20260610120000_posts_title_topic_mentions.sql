-- =============================================================================
-- 게시글 구조화: 제목 / 말머리(topic) / 멘션 대상
-- =============================================================================

begin;

alter table public.posts
  add column if not exists title text not null default '';

alter table public.posts
  add column if not exists topic text;

alter table public.posts
  add column if not exists mentioned_user_ids uuid[] not null default '{}';

alter table public.posts
  drop constraint if exists posts_topic_check;

alter table public.posts
  add constraint posts_topic_check
  check (
    topic is null
    or topic in (
      'schedule',
      'notice',
      'urgent',
      'other',
      'question',
      'share',
      'prayer',
      'review'
    )
  );

comment on column public.posts.title is '게시글 제목 (비어 있으면 레거시 content 첫 줄 폴백)';
comment on column public.posts.topic is '말머리 코드 (공지/자유 보드별 허용값)';
comment on column public.posts.mentioned_user_ids is '본문에서 @태그한 프로필 id 목록';

notify pgrst, 'reload schema';

commit;
