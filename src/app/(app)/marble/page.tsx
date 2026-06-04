import Link from "next/link";
import { Crown, Settings } from "lucide-react";

import { PageIntro } from "@/components/layout/page-intro";
import { MarbleBoard } from "@/features/marble/components/MarbleBoard";
import { getBlueMarbleTeams } from "@/features/marble/queries/getBlueMarbleTeams";
import { positionFromScore, tokenColorForIndex } from "@/features/marble/types";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarblePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 리더/관리자에게만 관리자 바로가기 버튼을 노출 (일반 청년부원에게는 절대 미노출)
  let canManage = false;
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    canManage = me?.role === "leader" || me?.role === "admin";
  }

  const { teams, error } = await getBlueMarbleTeams();

  // 색상은 보드판과 동일하게 id 정렬 기준으로 고정
  const colorByTeamId = [...teams]
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce<Record<string, string>>((acc, team, i) => {
      acc[team.id] = tokenColorForIndex(i);
      return acc;
    }, {});

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <PageIntro
          eyebrow="목장 대항전"
          title="디지털 부루마블"
          description="50점마다 1칸! 7개 목장이 점수를 모아 별 미션 칸을 향해 달리는 목장 대항전입니다."
        />

        {canManage ? (
          <Link
            href="/admin/marble"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings className="mr-1.5 h-4 w-4" />
            관리자 조작창 바로가기
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          보드판을 불러오지 못했습니다: {error}
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          아직 등록된 목장이 없습니다.
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200 p-4 shadow-[0_20px_50px_-12px_rgba(14,165,233,0.45)] sm:p-7">
            {/* 역동적인 배경 데코: 구름/햇살 느낌의 광원 */}
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-emerald-300/40 blur-3xl" />
            <div className="pointer-events-none absolute right-6 top-6 h-24 w-24 rounded-full bg-amber-200/50 blur-2xl" />
            <div className="relative">
              <MarbleBoard teams={teams} />
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">목장 순위</h2>
            <ol className="space-y-2">
              {teams.map((team, rank) => (
                <li
                  key={team.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors",
                    rank === 0
                      ? "border-amber-300 bg-gradient-to-r from-amber-50 to-white"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <span className="flex w-6 shrink-0 justify-center">
                    {rank === 0 ? (
                      <Crown className="h-5 w-5 text-amber-500" fill="currentColor" />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">{rank + 1}</span>
                    )}
                  </span>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: colorByTeamId[team.id] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                    {team.team_name}
                  </span>
                  <span className="text-xs text-slate-400">{positionFromScore(team.score)}칸</span>
                  <span className="w-16 text-right text-sm font-semibold text-sky-600">
                    {team.score.toLocaleString()}점
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
