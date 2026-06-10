import { redirect } from "next/navigation";

import { QtFeedBoard } from "@/features/qt-share/components/QtFeedBoard";
import { getQtFeedData } from "@/features/qt-share/queries/getQtFeedData";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function QtSharePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/qt");
  }

  const data = await getQtFeedData();

  return (
    <div className="-mx-6 -mt-10 sm:-mx-8">
      <QtFeedBoard {...data} currentUserId={user.id} />
    </div>
  );
}
