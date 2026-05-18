import { PageIntro } from "@/components/layout/page-intro";

export default function PlaylistPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageIntro
        eyebrow="음악"
        title="송리스트 / 추천 플리"
        description="주간 송리스트와 팀 추천 플레이리스트를 곧 이곳에서 확인할 수 있어요."
      />
      <div className="rounded-[2rem] border border-gray-100 bg-white px-6 py-12 text-center shadow-sm ">
        <p className="text-sm text-muted-foreground">준비 중인 페이지입니다.</p>
      </div>
    </div>
  );
}
