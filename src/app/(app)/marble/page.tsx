import { PageIntro } from "@/components/layout/page-intro";
import { MarbleBoard } from "@/features/marble/components/MarbleBoard";
import { getBlueMarbleTeams } from "@/features/marble/queries/getBlueMarbleTeams";
import { tokenColorForIndex } from "@/features/marble/types";

export const dynamic = "force-dynamic";

export default async function MarblePage() {
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
      <PageIntro
        eyebrow="목장 대항전"
        title="디지털 부루마블"
        description="7개 목장이 점수를 모아 보드판을 완주하는 경쟁! 우리 목장의 위치를 확인해 보세요."
      />

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
          <div className="surface-card rounded-[2rem] p-4 sm:p-6">
            <MarbleBoard teams={teams} />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">목장 순위</h2>
            <ol className="space-y-2">
              {teams.map((team, rank) => (
                <li
                  key={team.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <span className="w-6 text-center text-sm font-bold text-slate-400">{rank + 1}</span>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: colorByTeamId[team.id] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                    {team.team_name}
                  </span>
                  <span className="text-xs text-slate-400">{team.position}칸</span>
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
