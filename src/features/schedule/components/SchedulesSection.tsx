"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { CalendarPlus, Check, Trash2, X } from "lucide-react";
import { ko } from "date-fns/locale";

import {
  createSchedule,
  deleteSchedule,
  setScheduleAttendance,
} from "@/features/schedule/actions";
import type {
  ProfileRow,
  ScheduleAttendanceRow,
  ScheduleListRow,
} from "@/features/schedule/queries/getSchedulesPageData";
import type { ScheduleAttendanceStatus, ScheduleKind } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ScheduleKind, string> = {
  practice: "연습",
  worship: "예배",
  social: "회식·모임",
};

const KIND_BADGE_CLASS: Record<ScheduleKind, string> = {
  practice: "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-50",
  worship: "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-50",
  social: "border-orange-500/35 bg-orange-500/10 text-orange-950 dark:text-orange-50",
};

function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 2);
}

function formatScheduleWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      weekday: "short",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function dayKey(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInCheckWindow(iso: string) {
  const now = new Date();
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 13);
  end.setHours(23, 59, 59, 999);
  const target = new Date(iso);
  return target >= start && target <= end;
}

type SchedulesSectionProps = {
  schedules: ScheduleListRow[];
  attendances: ScheduleAttendanceRow[];
  profiles: ProfileRow[];
  currentUserId: string | null;
  isLeader: boolean;
};

function MyResponsePicker({
  schedule,
  myRow,
}: {
  schedule: ScheduleListRow;
  myRow: ScheduleAttendanceRow | null;
}) {
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<ScheduleAttendanceStatus | null>(myRow?.status ?? null);
  const [reason, setReason] = useState(myRow?.reason ?? "");
  const canCheck = isInCheckWindow(schedule.starts_at);

  const onPick = (status: ScheduleAttendanceStatus) => {
    if (!canCheck) {
      toastError("이번 주와 다음 주 일정만 응답할 수 있습니다.");
      return;
    }

    let absentReason = reason;
    if (status === "absent") {
      absentReason = window.prompt("불참 사유를 입력해 주세요.", reason) ?? "";
      if (!absentReason.trim()) {
        toastError("불참 사유를 입력해 주세요.");
        return;
      }
      setReason(absentReason);
    }

    setLocal(status);
    startTransition(async () => {
      const res = await setScheduleAttendance({
        scheduleId: schedule.id,
        status,
        reason: status === "absent" ? absentReason : undefined,
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess();
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
        {(
          [
            { key: "attending" as const, icon: Check, label: "참석" },
            { key: "absent" as const, icon: X, label: "불참" },
          ] as const
        ).map(({ key, icon: Icon, label }) => {
          const active = local === key;
          const palette =
            key === "attending"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-50"
              : "border-red-500/45 bg-red-500/10 text-red-950 dark:text-red-50";
          return (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || !canCheck}
              className={cn(
                "h-auto flex-col gap-1 py-3 text-xs font-semibold",
                active ? cn("ring-2 ring-ring/60", palette) : "text-muted-foreground",
              )}
              onClick={() => onPick(key)}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Button>
          );
        })}
      </div>
      {!canCheck ? (
        <p className="text-xs text-muted-foreground">이번 주와 다음 주 일정만 응답할 수 있습니다.</p>
      ) : null}
      {local === "absent" && reason ? <p className="text-xs text-muted-foreground">불참 사유: {reason}</p> : null}
    </div>
  );
}

function TeamStrip({
  title,
  tone,
  members,
  reasons,
}: {
  title: string;
  tone: "emerald" | "red" | "muted";
  members: ProfileRow[];
  reasons?: Record<string, string>;
}) {
  const toneMap = {
    emerald: "border-emerald-500/25 bg-emerald-500/5",
    red: "border-red-500/25 bg-red-500/5",
    muted: "border-border/70 bg-muted/30",
  } as const;

  return (
    <div className={cn("rounded-lg border border-border/60 p-4 shadow-sm", toneMap[tone])}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
          {members.length}
        </Badge>
      </div>
      {members.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">없음</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Avatar className="size-7 border border-border/60">
                  <AvatarFallback className="text-[9px] font-semibold">{initials(p.username)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate text-[11px] font-medium">{p.username}</span>
              </div>
              {reasons?.[p.id] ? <span className="text-[10px] text-muted-foreground">{reasons[p.id]}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduleEventCard({
  schedule,
  rowsForSchedule,
  profiles,
  currentUserId,
  isLeader,
}: {
  schedule: ScheduleListRow;
  rowsForSchedule: ScheduleAttendanceRow[];
  profiles: ProfileRow[];
  currentUserId: string | null;
  isLeader: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const byUser = new Map<string, ScheduleAttendanceRow>();
    for (const r of rowsForSchedule) byUser.set(r.user_id, r);

    const attending: ProfileRow[] = [];
    const absent: ProfileRow[] = [];
    const unanswered: ProfileRow[] = [];
    const absentReasons: Record<string, string> = {};

    for (const p of profiles) {
      const row = byUser.get(p.id);
      if (!row) {
        unanswered.push(p);
        continue;
      }
      if (row.status === "attending") attending.push(p);
      else {
        absent.push(p);
        if (row.reason) absentReasons[p.id] = row.reason;
      }
    }

    return { attending, absent, unanswered, absentReasons };
  }, [profiles, rowsForSchedule]);

  const myRow = useMemo(
    () => rowsForSchedule.find((r) => r.user_id === currentUserId) ?? null,
    [rowsForSchedule, currentUserId],
  );

  const onDelete = () => {
    if (!confirm("이 일정을 삭제할까요? 팀원 참석 기록도 함께 삭제됩니다.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSchedule({ scheduleId: schedule.id });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess();
    });
  };

  return (
    <Card className="border-border/70 shadow-sm ring-1 ring-border/35">
      <CardHeader className="gap-2 border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-[11px] font-semibold", KIND_BADGE_CLASS[schedule.kind])}>
                {KIND_LABEL[schedule.kind]}
              </Badge>
              <CardTitle className="text-lg font-semibold tracking-tight">{schedule.title}</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">{formatScheduleWhen(schedule.starts_at)}</CardDescription>
          </div>
          {isLeader ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={pending}
              onClick={onDelete}
              aria-label="일정 삭제"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-8 pt-6">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">내 응답</h3>
          {!currentUserId ? (
            <p className="text-sm text-muted-foreground">로그인 후 선택할 수 있습니다.</p>
          ) : (
            <MyResponsePicker key={`${myRow?.id ?? "new"}:${myRow?.status ?? "x"}`} schedule={schedule} myRow={myRow} />
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">팀 현황</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TeamStrip title="참석" tone="emerald" members={grouped.attending} />
            <TeamStrip title="불참" tone="red" members={grouped.absent} reasons={grouped.absentReasons} />
            <TeamStrip title="미응답" tone="muted" members={grouped.unanswered} />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function AddScheduleDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ScheduleKind>("practice");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("19:00");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setKind("practice");
    const d = new Date();
    setDate(d.toISOString().slice(0, 10));
    setTime("19:00");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toastError("일정 이름을 입력하세요.");
      return;
    }
    const local = new Date(`${date}T${time}:00`);
    if (Number.isNaN(local.getTime())) {
      toastError("날짜·시간을 확인하세요.");
      return;
    }

    startTransition(async () => {
      const res = await createSchedule({
        title: trimmed,
        kind,
        startsAt: local.toISOString(),
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess();
      setOpen(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button type="button" className="gap-2 shadow-sm" disabled={disabled} />}>
        <CalendarPlus className="size-4" aria-hidden />
        일정 추가
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>새 일정</DialogTitle>
            <DialogDescription>연습·예배·모임 일정을 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="sch-title">이름</Label>
              <Input id="sch-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 이번 주 토요 연습" maxLength={200} autoComplete="off" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sch-kind">종류</Label>
              <select
                id="sch-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as ScheduleKind)}
                className={cn(
                  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
                  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
                )}
              >
                <option value="practice">{KIND_LABEL.practice}</option>
                <option value="worship">{KIND_LABEL.worship}</option>
                <option value="social">{KIND_LABEL.social}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sch-date">날짜</Label>
                <Input id="sch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sch-time">시간</Label>
                <Input id="sch-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SchedulesSection({
  schedules,
  attendances,
  profiles,
  currentUserId,
  isLeader,
}: SchedulesSectionProps) {
  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [schedules],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const highlightedDates = useMemo(() => sortedSchedules.map((s) => new Date(s.starts_at)), [sortedSchedules]);

  const selectedDaySchedules = useMemo(() => {
    const key = dayKey(selectedDate.toISOString());
    return sortedSchedules.filter((s) => dayKey(s.starts_at) === key);
  }, [selectedDate, sortedSchedules]);

  return (
    <div className="flex flex-col gap-8">
      {isLeader ? (
        <div className="flex flex-wrap items-center justify-end gap-4">
          <AddScheduleDialog />
        </div>
      ) : null}

      <Card className="border-border/70 shadow-sm ring-1 ring-border/35">
        <CardHeader>
          <CardTitle className="text-base">캘린더</CardTitle>
          <CardDescription>이번 주와 다음 주 일정 응답에 집중해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ko}
            modifiers={{ hasEvent: highlightedDates }}
            modifiersClassNames={{ hasEvent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-200" }}
          />
        </CardContent>
      </Card>

      {selectedDaySchedules.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-muted/25 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">선택한 날짜의 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {selectedDaySchedules.map((schedule) => {
            const rowsForSchedule = attendances.filter((a) => a.schedule_id === schedule.id);
            return (
              <ScheduleEventCard
                key={schedule.id}
                schedule={schedule}
                rowsForSchedule={rowsForSchedule}
                profiles={profiles}
                currentUserId={currentUserId}
                isLeader={isLeader}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
