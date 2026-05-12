import Link from "next/link";

import { TeamManagementSection } from "@/features/team/components/TeamManagementSection";
import { getTeamManagementData } from "@/features/team/queries/getTeamManagementData";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { members, error, isLeader, currentUserId } = await getTeamManagementData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahaba</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">팀 라인업</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {isLeader
            ? "리더는 팀원 포지션을 수정하고, 필요 시 계정을 정리할 수 있어요. 멤버 카드의 감성 정보는 각자 마이페이지에서 채웁니다."
            : "서로의 생일과 취향을 알아가며 한 팀으로 연습해 가요."}
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          팀원 정보를 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <TeamManagementSection members={members} isLeader={isLeader} currentUserId={currentUserId} />

      <footer>
        <Link href="/" className="text-xs text-muted-foreground underline underline-offset-4">
          홈으로 돌아가기
        </Link>
      </footer>
    </div>
  );
}
