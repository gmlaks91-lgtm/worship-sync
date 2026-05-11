import "server-only";

import type { ScheduleAttendanceStatus, ScheduleKind } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type ProfileRow = {
  id: string;
  username: string;
  role: string;
};

export type ScheduleListRow = {
  id: string;
  title: string;
  kind: ScheduleKind;
  starts_at: string;
};

export type ScheduleAttendanceRow = {
  id: string;
  schedule_id: string;
  user_id: string;
  status: ScheduleAttendanceStatus;
  reason: string | null;
};

export async function getSchedulesPageData() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [
    { data: schedulesRaw, error: sErr },
    { data: profilesRaw, error: profErr },
    userRes,
  ] = await Promise.all([
    supabase
      .from("schedules")
      .select("id, title, kind, starts_at")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(50),
    supabase.from("profiles").select("id, username, role"),
    supabase.auth.getUser(),
  ]);

  const userId = userRes.data.user?.id ?? null;

  let role: string | null = null;
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    role = prof?.role ?? null;
  }

  if (sErr) {
    return {
      schedules: [] as ScheduleListRow[],
      attendances: [] as ScheduleAttendanceRow[],
      profiles: [] as ProfileRow[],
      currentUserId: userId,
      isLeader: role === "leader",
      error: sErr.message,
    };
  }

  const schedules = (schedulesRaw ?? []) as ScheduleListRow[];
  const scheduleIds = schedules.map((s) => s.id);

  let attendances: ScheduleAttendanceRow[] = [];
  if (scheduleIds.length > 0) {
    const { data: attRaw, error: aErr } = await supabase
      .from("attendances")
      .select("id, schedule_id, user_id, status, reason")
      .in("schedule_id", scheduleIds);

    if (aErr) {
      return {
        schedules,
        attendances: [],
        profiles: (profilesRaw ?? []) as ProfileRow[],
        currentUserId: userId,
        isLeader: role === "leader",
        error: aErr.message,
      };
    }
    attendances = (attRaw ?? []) as ScheduleAttendanceRow[];
  }

  if (profErr) {
    return {
      schedules,
      attendances,
      profiles: [] as ProfileRow[],
      currentUserId: userId,
      isLeader: role === "leader",
      error: profErr.message,
    };
  }

  return {
    schedules,
    attendances,
    profiles: (profilesRaw ?? []) as ProfileRow[],
    currentUserId: userId,
    isLeader: role === "leader",
    error: null as string | null,
  };
}
