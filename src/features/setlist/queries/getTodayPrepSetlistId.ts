import "server-only";

import {
  saturdayOfWeekFromSundayYmd,
  sundayOfKstWeekContaining,
  todayYmdKst,
} from "@/lib/date-kst";
import { createClient } from "@/utils/supabase/server";

/** KST 오늘 → 가장 가까운 prep 송리스트 id (오늘 → 이후 일정 → 이번 주) */
export async function getTodayPrepSetlistId(): Promise<string | null> {
  const supabase = await createClient();
  const today = todayYmdKst();

  const { data: todayRow } = await supabase
    .from("setlists")
    .select("id")
    .eq("status", "prep")
    .eq("event_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (todayRow?.id) return todayRow.id;

  const { data: upcoming } = await supabase
    .from("setlists")
    .select("id")
    .eq("status", "prep")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming?.id) return upcoming.id;

  const sunday = sundayOfKstWeekContaining(today);
  const saturday = saturdayOfWeekFromSundayYmd(sunday);

  const { data: weekRow } = await supabase
    .from("setlists")
    .select("id")
    .eq("status", "prep")
    .gte("event_date", sunday)
    .lte("event_date", saturday)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return weekRow?.id ?? null;
}
