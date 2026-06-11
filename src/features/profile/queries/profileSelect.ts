import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const PROFILE_CORE_SELECT =
  "id, username, role, avatar_url, role_priority_1, role_priority_2, role_priority_3, points, active_badge, active_border_color, active_background_color, birthday, mbti, favorite_song, updated_at";

export const PROFILE_WITH_REMINDER_SELECT =
  `${PROFILE_CORE_SELECT}, wants_daily_reminder, daily_reminder_time`;

export function isMissingReminderColumnsError(message: string) {
  return (
    message.includes("wants_daily_reminder") ||
    message.includes("daily_reminder_time")
  );
}

type ProfileCoreRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function fetchMyProfileRow(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{
  data: ProfileCoreRow | null;
  error: string | null;
  dailyReminderAvailable: boolean;
}> {
  const withReminder = await supabase
    .from("profiles")
    .select(PROFILE_WITH_REMINDER_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!withReminder.error && withReminder.data) {
    return {
      data: withReminder.data as ProfileCoreRow,
      error: null,
      dailyReminderAvailable: true,
    };
  }

  if (withReminder.error && !isMissingReminderColumnsError(withReminder.error.message)) {
    return { data: null, error: withReminder.error.message, dailyReminderAvailable: false };
  }

  const core = await supabase
    .from("profiles")
    .select(PROFILE_CORE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (core.error) {
    return { data: null, error: core.error.message, dailyReminderAvailable: false };
  }

  if (!core.data) {
    return { data: null, error: null, dailyReminderAvailable: false };
  }

  return {
    data: {
      ...(core.data as ProfileCoreRow),
      wants_daily_reminder: false,
      daily_reminder_time: null,
    },
    error: null,
    dailyReminderAvailable: false,
  };
}
