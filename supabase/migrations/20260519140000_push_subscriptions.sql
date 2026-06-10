begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own_select" on public.push_subscriptions;
create policy "push_subscriptions_own_select"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_own_insert" on public.push_subscriptions;
create policy "push_subscriptions_own_insert"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_own_update" on public.push_subscriptions;
create policy "push_subscriptions_own_update"
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_own_delete" on public.push_subscriptions;
create policy "push_subscriptions_own_delete"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;
