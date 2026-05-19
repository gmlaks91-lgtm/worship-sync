import { redirect } from "next/navigation";

import { getTodayPrepSetlistId } from "@/features/setlist/queries/getTodayPrepSetlistId";
import { isGeneralRole } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * QR·딥링크 진입: 로그인 후 오늘(또는 가장 가까운) 송리스트·악보 페이지로 이동
 */
export default async function QrTodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/qr/today");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (isGeneralRole(profile?.role)) {
    redirect("/journal?from=qr");
  }

  const setlistId = await getTodayPrepSetlistId();

  if (setlistId) {
    redirect(`/setlists/${setlistId}`);
  }

  redirect("/?qr=no_setlist");
}
