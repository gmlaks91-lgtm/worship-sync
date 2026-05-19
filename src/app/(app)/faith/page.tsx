import { FaithCheckBoard } from "@/features/faith/components/FaithCheckBoard";
import { getFaithPageData } from "@/features/faith/queries/getFaithPageData";

export const dynamic = "force-dynamic";

export default async function FaithPage() {
  const data = await getFaithPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahaba</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">신앙 점검표</h1>
      </header>

      {data.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {data.error}
        </div>
      ) : null}

      {!data.userId ? (
        <div className="rounded-lg border border-border/60 bg-muted/25 px-6 py-10 text-center text-sm text-muted-foreground">
          로그인 후 이용할 수 있습니다.
        </div>
      ) : (
        <FaithCheckBoard checksByDate={data.checksByDate} />
      )}
    </div>
  );
}
