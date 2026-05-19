"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import { createScheduleWithSetlist } from "@/features/schedule/actions";
import { ScheduleAiPastePanel } from "@/features/schedule/components/ScheduleAiPastePanel";
import type { ParsedScheduleResult } from "@/features/schedule/lib/parsed-schedule-schema";
import {
  collectUnmatchedMemberNames,
  mapParsedLineupToForm,
  type MemberOption,
} from "@/features/schedule/lib/match-lineup-members";
import {
  scheduleRegistrationFormSchema,
  type ScheduleRegistrationFormValues,
} from "@/features/schedule/schemas/scheduleRegistration";
import { fetchYoutubeOEmbedTitle } from "@/features/setlist/utils/youtube-meta";
import { getYoutubeVideoId } from "@/features/setlist/utils/youtube";
import type { ScheduleKind } from "@/types/database";
import {
  isMultiMemberRole,
  TEAM_ROLE_OPTIONS,
  teamRoleLabel,
  type TeamRoleCode,
} from "@/lib/team-roles";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toastError, toastPromise } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ScheduleKind, string> = {
  practice: "연습",
  worship: "예배",
  social: "모임",
};

function makeDefaultLineup() {
  return TEAM_ROLE_OPTIONS.map((role) => ({ roleCode: role.code, memberIds: [] as string[] }));
}

function RoleMemberField({
  value,
  onChange,
  roleCode,
  members,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  roleCode: TeamRoleCode;
  members: MemberOption[];
}) {
  if (isMultiMemberRole(roleCode)) {
    return (
      <RoleMultiSelect value={value} onChange={onChange} members={members} />
    );
  }

  return (
    <select
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      value={value[0] ?? ""}
      onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
    >
      <option value="">미배정</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.username}
        </option>
      ))}
    </select>
  );
}

function RoleMultiSelect({
  value,
  onChange,
  members,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  members: MemberOption[];
}) {
  return (
    <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-input bg-background p-2">
      {members.map((member) => {
        const checked = value.includes(member.id);
        return (
          <label key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, member.id]);
                else onChange(value.filter((id) => id !== member.id));
              }}
            />
            <span className="text-sm">{member.username}</span>
          </label>
        );
      })}
    </div>
  );
}

type ScheduleRegistrationFormProps = {
  teamMembers: MemberOption[];
  recentSongWarningByVideoId: Record<string, number>;
};

export function ScheduleRegistrationForm({
  teamMembers,
  recentSongWarningByVideoId,
}: ScheduleRegistrationFormProps) {
  const router = useRouter();

  const form = useForm<ScheduleRegistrationFormValues>({
    resolver: zodResolver(scheduleRegistrationFormSchema),
    defaultValues: {
      title: "",
      kind: "practice",
      eventDate: new Date(),
      eventTime: "19:00",
      tracks: [{ title: "", youtubeUrl: "" }],
      lineup: makeDefaultLineup(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

  const eventDateValue = useWatch({ control: form.control, name: "eventDate" });
  const lineupValues = useWatch({ control: form.control, name: "lineup" }) ?? makeDefaultLineup();
  const memberOptions = useMemo(() => teamMembers, [teamMembers]);

  const applyParsed = useCallback(
    (data: ParsedScheduleResult) => {
      form.setValue("title", data.title, { shouldValidate: true });

      const [y, m, d] = data.eventDate.split("-").map(Number);
      if (y && m && d) {
        form.setValue("eventDate", new Date(y, m - 1, d), { shouldValidate: true });
      }

      form.setValue("eventTime", data.eventTime ?? "19:00", { shouldValidate: true });
      if (data.kind) {
        form.setValue("kind", data.kind, { shouldValidate: true });
      }

      const tracks =
        data.tracks.length > 0
          ? data.tracks.map((t) => ({
              title: t.title.trim(),
              youtubeUrl: (t.youtubeUrl ?? "").trim(),
            }))
          : [{ title: "", youtubeUrl: "" }];
      form.setValue("tracks", tracks, { shouldValidate: true });

      const lineup = mapParsedLineupToForm(data.lineup, teamMembers);
      form.setValue("lineup", lineup, { shouldValidate: true });

      const unmatched = collectUnmatchedMemberNames(data.lineup, teamMembers);
      if (unmatched.length > 0) {
        toastError(`다음 이름을 팀원 목록에서 찾지 못했습니다: ${unmatched.join(", ")}`);
      }
    },
    [form, teamMembers],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const eventDateStr = format(values.eventDate, "yyyy-MM-dd");
    const startsAt = new Date(`${eventDateStr}T${values.eventTime}:00`).toISOString();

    const payload = {
      title: values.title.trim(),
      kind: values.kind,
      startsAt,
      eventDate: eventDateStr,
      tracks: values.tracks.map((t) => ({
        title: t.title.trim(),
        youtubeUrl: t.youtubeUrl.trim(),
      })),
      lineup: values.lineup.map((l) => ({ roleCode: l.roleCode, memberIds: l.memberIds })),
    };

    try {
      await toastPromise(
        createScheduleWithSetlist(payload).then((result) => {
          if (!result.ok) throw new Error(result.message);
        }),
        "일정과 송리스트를 저장하는 중입니다...",
      ).unwrap();
      router.push("/schedule");
      router.refresh();
    } catch {
      /* handled */
    }
  });

  return (
    <div className="flex flex-col gap-8">
      <ScheduleAiPastePanel onParsed={applyParsed} />

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <FieldSet className="gap-5">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="reg-title">일정·송리스트 제목</FieldLabel>
              <Input
                id="reg-title"
                placeholder="예: 5월 둘째 주 주일예배"
                autoComplete="off"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reg-kind">일정 종류</FieldLabel>
                <select
                  id="reg-kind"
                  className={cn(
                    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm",
                    "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
                  )}
                  {...form.register("kind")}
                >
                  <option value="practice">{KIND_LABEL.practice}</option>
                  <option value="worship">{KIND_LABEL.worship}</option>
                  <option value="social">{KIND_LABEL.social}</option>
                </select>
                <FieldError errors={[form.formState.errors.kind]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="reg-time">시작 시간</FieldLabel>
                <Input id="reg-time" type="time" {...form.register("eventTime")} />
                <FieldError errors={[form.formState.errors.eventTime]} />
              </Field>
            </div>

            <Field>
              <FieldLabel>날짜</FieldLabel>
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start gap-2 text-left font-normal",
                        !eventDateValue && "text-muted-foreground",
                      )}
                    />
                  }
                >
                  <CalendarIcon className="size-4 opacity-70" />
                  {eventDateValue ? (
                    format(eventDateValue, "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDateValue}
                    onSelect={(d) => {
                      if (d) form.setValue("eventDate", d, { shouldValidate: true });
                    }}
                    locale={ko}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              <FieldError errors={[form.formState.errors.eventDate]} />
            </Field>
          </FieldGroup>

          <FieldGroup className="gap-3">
            <div className="flex items-end justify-between gap-2">
              <span className="text-sm font-medium leading-none">수록곡</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => append({ title: "", youtubeUrl: "" })}
              >
                <Plus className="size-3.5" />
                줄 추가
              </Button>
            </div>
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <li key={field.id} className="rounded-lg border border-border/60 bg-card/50 p-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="곡 제목"
                      aria-invalid={!!form.formState.errors.tracks?.[index]?.title}
                      {...form.register(`tracks.${index}.title` as const)}
                    />
                    <FieldError errors={[form.formState.errors.tracks?.[index]?.title]} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      aria-invalid={!!form.formState.errors.tracks?.[index]?.youtubeUrl}
                      {...form.register(`tracks.${index}.youtubeUrl` as const)}
                      onBlur={async (e) => {
                        const url = e.target.value.trim();
                        if (!url) return;
                        const currentTitle = form.getValues(`tracks.${index}.title`).trim();
                        if (currentTitle) return;
                        const autoTitle = await fetchYoutubeOEmbedTitle(url);
                        if (autoTitle) {
                          form.setValue(`tracks.${index}.title`, autoTitle, { shouldValidate: true });
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label="줄 삭제"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {(() => {
                    const currentUrl = form.getValues(`tracks.${index}.youtubeUrl`);
                    const videoId = getYoutubeVideoId(currentUrl);
                    const weeks = videoId ? recentSongWarningByVideoId[videoId] : undefined;
                    if (weeks === undefined) return null;
                    return (
                      <p className="mt-1 text-xs text-amber-800">
                        ⚠️ 최근({weeks}주 전) 불렀던 곡입니다.
                      </p>
                    );
                  })()}
                  <FieldError errors={[form.formState.errors.tracks?.[index]?.youtubeUrl]} />
                </li>
              ))}
            </ul>
          </FieldGroup>

          <FieldGroup className="gap-3">
            <span className="text-sm font-medium leading-none">라인업 배정</span>
            <FieldDescription>
              V(보컬), STAFF(스텝)는 여러 명을 동시에 선택할 수 있습니다.
            </FieldDescription>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TEAM_ROLE_OPTIONS.map((role, index) => {
                const current = lineupValues[index]?.memberIds ?? [];
                return (
                  <li key={role.code} className="rounded-lg border border-border/60 bg-card/50 p-3">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {teamRoleLabel(role.code)}
                    </label>
                    <RoleMemberField
                      value={current}
                      roleCode={role.code}
                      members={memberOptions}
                      onChange={(next) => {
                        form.setValue(`lineup.${index}.roleCode`, role.code, { shouldValidate: true });
                        form.setValue(`lineup.${index}.memberIds`, next, { shouldValidate: true });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </FieldGroup>
        </FieldSet>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/schedule")}
            disabled={form.formState.isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "일정·송리스트 저장"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
