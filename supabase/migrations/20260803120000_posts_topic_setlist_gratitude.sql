-- 공지 말머리 `setlist`(콘티), 자유게시판 `gratitude`(감사) 추가

begin;

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
      'review',
      'setlist',
      'gratitude'
    )
  );

comment on column public.posts.topic is
  '말머리 코드 (공지: schedule/notice/urgent/setlist/other, 자유: question/share/prayer/review/gratitude/other)';

notify pgrst, 'reload schema';

commit;
