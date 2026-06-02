-- 청년/오후 예배: 단순 참석(youthService)은 0점, 10분 전 입실(youthEarlyArrival)만 4점

create or replace function public.calculate_weekly_checklist_points(
  p_daily_records jsonb,
  p_worship_records jsonb
)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_total integer := 0;
  v_day jsonb;
  v_bible integer;
  v_qt boolean;
  v_prayer boolean;
  v_day_points integer;
begin
  if coalesce(jsonb_typeof(p_daily_records), 'null') = 'array' then
    for v_day in
      select value
      from jsonb_array_elements(p_daily_records)
    loop
      v_bible := case
        when coalesce(v_day ->> 'bibleChapters', '') ~ '^\d+$' then (v_day ->> 'bibleChapters')::integer
        else 0
      end;
      v_qt := coalesce(v_day ->> 'qtDone', 'false') = 'true';
      v_prayer := coalesce(v_day ->> 'prayerDone', 'false') = 'true';

      v_day_points :=
        case when v_bible >= 7 then 2 else 0 end +
        case when v_qt then 2 else 0 end +
        case when v_prayer then 2 else 0 end;

      if v_bible >= 7 and v_qt and v_prayer then
        v_total := v_total + 12;
      else
        v_total := v_total + v_day_points;
      end if;
    end loop;
  end if;

  if coalesce(p_worship_records ->> 'sundayFirstService', 'false') = 'true'
     or coalesce(p_worship_records ->> 'sundaySecondService', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'youthEarlyArrival', 'false') = 'true' then
    v_total := v_total + 4;
  end if;

  if coalesce(p_worship_records ->> 'wednesdayService', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'fridayPrayer', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'saturdayPrayer', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  return least(v_total, 100);
end;
$$;
