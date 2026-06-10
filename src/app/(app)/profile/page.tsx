import Link from "next/link";
import { redirect } from "next/navigation";

import { PersonalDetailsForm } from "@/features/profile/components/PersonalDetailsForm";
import { getMyProfile } from "@/features/profile/queries/getMyProfile";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePersonalPage() {
  const { profile, error } = await getMyProfile();

  if (!profile && !error) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8">
      <nav>
        <Link href="/more" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
          ← 마이페이지
        </Link>
      </nav>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          프로필을 불러오지 못했습니다: {error}
        </div>
      ) : null}

      {profile ? <PersonalDetailsForm profile={profile} /> : null}
    </div>
  );
}
