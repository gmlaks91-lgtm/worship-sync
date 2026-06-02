import { redirect } from "next/navigation";

import { QtShareRoom } from "@/features/qt-share/components/QtShareRoom";
import { getQtShares } from "@/features/qt-share/queries/getQtShares";
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

  const { shares, error } = await getQtShares();

  return (
    <div className="-mx-6 -mt-10 sm:-mx-8">
      <QtShareRoom initialShares={shares} currentUserId={user.id} loadError={error} />
    </div>
  );
}
