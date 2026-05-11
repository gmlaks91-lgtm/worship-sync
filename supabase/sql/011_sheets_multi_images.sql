-- Ahaba update: multiple sheet images per song

begin;

alter table public.sheets
  add column if not exists image_urls text[] not null default '{}';

update public.sheets
set image_urls = case
  when file_url is null or btrim(file_url) = '' then '{}'
  else array[file_url]
end
where coalesce(array_length(image_urls, 1), 0) = 0;

alter table public.sheets
  drop constraint if exists sheets_image_urls_not_empty;
alter table public.sheets
  add constraint sheets_image_urls_not_empty
  check (coalesce(array_length(image_urls, 1), 0) > 0);

alter table public.sheets
  drop column if exists file_url;

commit;
