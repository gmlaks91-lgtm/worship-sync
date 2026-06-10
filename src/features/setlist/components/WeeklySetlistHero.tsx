"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

import { appendTrackToPrepSetlist, updatePrepSetlistHeader } from "@/features/setlist/actions/weeklySetlistActions";
import { AddSetlistTriggerButton } from "@/features/setlist/components/AddSetlistDialog";
import { SetlistLineupEditor } from "@/features/setlist/components/SetlistLineupEditor";
import { YouTubePlayer } from "@/features/setlist/components/YouTubePlayer";
import { WeeklySongRow } from "@/features/setlist/components/WeeklySongRow";
import { weekSetlistHeadingKst } from "@/features/setlist/lib/week-label-kst";
import type { PrepSetlistRow } from "@/features/setlist/queries/getSetlists";
import { shiftWeekSundayYmd, weeklyDashboardHref } from "@/features/setlist/weekly";
import type { TeamMemberRow } from "@/features/team/queries/getTeamMembers";
import { TEAM_ROLE_OPTIONS, teamRoleLabel } from "@/lib/team-roles";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function groupLineupItems(items: Array<{ role_code: string; member_name: string }>) {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const existing = map.get(item.role_code) ?? [];
    existing.push(item.member_name);
    map.set(item.role_code, existing);
  }
  return TEAM_ROLE_OPTIONS.map((role) => ({ roleCode: role.code, memberNames: map.get(role.code) ?? [] }));
}

type WeeklySetlistHeroProps = {
  weekSundayYmd: string;
  setlist: PrepSetlistRow | null;
  error: string | null;
  canManageSetlists: boolean;
  teamMembers: TeamMemberRow[];
  recentSongWarningByVideoId?: Record<string, number>;
};

export function WeeklySetlistHero({
  weekSundayYmd,
  setlist,
  error,
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId = {},
}: WeeklySetlistHeroProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [navPending, startNav] = useTransition();
  const [listTitle, setListTitle] = useState(() => setlist?.title ?? "");
  const [eventDate, setEventDate] = useState(() => setlist?.event_date ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newYoutube, setNewYoutube] = useState("");

  const groupedLineup = useMemo(
    () => (setlist ? groupLineupItems(setlist.lineup) : []),
    [setlist],
  );

  const saveHeader = () => {
    if (!setlist) return;
    start(async () => {
      const res = await updatePrepSetlistHeader({
        setlistId: setlist.id,
        title: listTitle.trim(),
        eventDate,
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess("송리스트 정보를 저장했습니다.");
      router.refresh();
    });
  };

  const weekTitle = weekSetlistHeadingKst(weekSundayYmd);
  const prevWeekHref = weeklyDashboardHref(shiftWeekSundayYmd(weekSundayYmd, -1));
  const nextWeekHref = weeklyDashboardHref(shiftWeekSundayYmd(weekSundayYmd, 1));

  const goWeek = (href: string) => {
    startNav(() => {
      router.push(href);
    });
  };

  const appendSong = () => {
    if (!setlist) return;
    start(async () => {
      const res = await appendTrackToPrepSetlist({
        setlistId: setlist.id,
        track: { title: newTitle.trim(), youtubeUrl: newYoutube.trim() },
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      setNewTitle("");
      setNewYoutube("");
      toastSuccess("곡을 추가했습니다.");
      router.refresh();
    });
  };

  return (
    <section id="weekly-setlist" className="scroll-mt-6 space-y-6">
      <div
        className={cn(
          "rounded-2xl border border-gray-100 bg-white px-5 py-8 transition-opacity duration-200 sm:px-10 sm:py-10",
          navPending && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex flex-col gap-8 border-b border-gray-100 pb-8">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
            <button
              type="button"
              aria-label="이전 주"
              disabled={navPending}
              onClick={() => goWeek(prevWeekHref)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-gray-100 bg-white text-gray-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 text-center sm:px-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">주일</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-800 sm:text-2xl">{weekTitle}</h1>
            </div>
            <button
              type="button"
              aria-label="다음 주"
              disabled={navPending}
              onClick={() => goWeek(nextWeekHref)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-gray-100 bg-white text-gray-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-center text-sm leading-relaxed text-gray-500 sm:text-left">
              주간 단위로 송리스트를 넘겨 보며, 곡 정보와 예배 준비 흐름을 이 화면에서 빠르게 확인할 수 있어요.
            </p>
            {canManageSetlists ? (
              <AddSetlistTriggerButton
                variant="outline"
                size="sm"
                className="h-10 shrink-0 self-center border-gray-200 text-gray-800 sm:self-auto"
                teamMembers={teamMembers.map((m) => ({ id: m.id, username: m.username }))}
                recentSongWarningByVideoId={recentSongWarningByVideoId}
              />
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
            데이터를 불러오지 못했습니다: {error}
          </div>
        ) : null}

        {!setlist && !error ? (
          <div className="mt-10 flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-100 bg-slate-50/50 px-6 py-14 text-center">
            <p className="text-sm font-medium text-gray-700">이 주차에 등록된 송리스트가 없습니다.</p>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              ({weekTitle}) 리더가 송리스트를 추가하면 이곳에 표시됩니다.
            </p>
          </div>
        ) : null}

        {setlist ? (
          <div className="mt-10 space-y-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-4">
                {canManageSetlists ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500">제목</label>
                      <Input
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        className="h-11 border-gray-100 bg-white text-gray-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500">날짜</label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-11 border-gray-100 bg-white text-gray-800"
                      />
                    </div>
                    <Button type="button" variant="outline" className="h-11 border-gray-200" disabled={pending} onClick={saveHeader}>
                      {pending ? <Loader2 className="size-4 animate-spin" /> : "일정 저장"}
                    </Button>
                  </div>
                ) : null}
                {canManageSetlists && setlist ? (
                  <p className="text-xs text-gray-400">
                    일정 표시: {format(new Date(eventDate || setlist.event_date), "PPP", { locale: ko })}
                  </p>
                ) : null}
                {!canManageSetlists ? (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{setlist.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {format(new Date(setlist.event_date), "PPP", { locale: ko })}
                    </p>
                  </div>
                ) : null}

                <Link
                  href={`/setlists/${setlist.id}`}
                  className="inline-flex text-sm font-medium text-gray-700 underline-offset-4 hover:underline"
                >
                  스텝 노트 · 상세 페이지 →
                </Link>
              </div>

              {canManageSetlists ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <SetlistLineupEditor
                    setlistId={setlist.id}
                    current={setlist.lineup}
                    members={teamMembers}
                    triggerClassName="border-gray-200 text-gray-800"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-slate-50/40 px-4 py-5 sm:px-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">라인업</p>
              {setlist.lineup.length === 0 ? (
                <p className="text-sm text-gray-500">아직 배정된 멤버가 없습니다.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {groupedLineup
                    .filter((item) => item.memberNames.length > 0)
                    .map((item) => (
                      <li
                        key={`${setlist.id}-${item.roleCode}`}
                        className="rounded-full border border-gray-100 bg-white px-3 py-1.5 text-sm text-gray-800"
                      >
                        <span className="text-gray-400">{teamRoleLabel(item.roleCode)}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span>{item.memberNames.join(", ")}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">수록곡</h3>
                <span className="text-xs text-gray-400">{setlist.songs.length}곡</span>
              </div>
              <ul className="space-y-4">
                {setlist.songs.map((song, idx) => (
                  <WeeklySongRow
                    key={`${song.id}-${song.order_index}`}
                    setlistId={setlist.id}
                    song={song}
                    index={idx}
                    total={setlist.songs.length}
                    canManage={canManageSetlists}
                  />
                ))}
              </ul>
            </div>

            {canManageSetlists ? (
              <div className="rounded-2xl border border-gray-100 bg-slate-50/30 px-4 py-5 sm:px-6">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Plus className="size-4" aria-hidden />
                  곡 추���
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="곡 제목"
                    className="h-11 border-gray-100 bg-white"
                  />
                  <Input
                    value={newYoutube}
                    onChange={(e) => setNewYoutube(e.target.value)}
                    placeholder="YouTube URL"
                    className="h-11 border-gray-100 bg-white"
                  />
                  <Button
                    type="button"
                    className="h-11 bg-sky-500 text-white hover:bg-sky-600"
                    disabled={pending || !newTitle.trim() || !newYoutube.trim()}
                    onClick={appendSong}
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : "추가"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <YouTubePlayer />
    </section>
  );
}
