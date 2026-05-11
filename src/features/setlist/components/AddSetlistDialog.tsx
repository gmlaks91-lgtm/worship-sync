"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import { createPrepSetlist } from "@/features/setlist/actions/setlistActions";
import {
  addSetlistFormSchema,
  type AddSetlistFormValues,
} from "@/features/setlist/schemas/addSetlist";
import { fetchYoutubeOEmbedTitle } from "@/features/setlist/utils/youtube-meta";
import { getYoutubeVideoId } from "@/features/setlist/utils/youtube";
import { isMultiMemberRole, TEAM_ROLE_OPTIONS, teamRoleLabel, type TeamRoleCode } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toastPromise } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

export type LineupMemberOption = {
  id: string;
  username: string;
};

type AddSetlistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: LineupMemberOption[];
  recentSongWarningByVideoId: Record<string, number>;
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
  members: LineupMemberOption[];
}) {
  if (isMultiMemberRole(roleCode)) {
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

export function AddSetlistDialog({
  open,
  onOpenChange,
  teamMembers,
  recentSongWarningByVideoId,
}: AddSetlistDialogProps) {
  const form = useForm<AddSetlistFormValues>({
    resolver: zodResolver(addSetlistFormSchema),
    defaultValues: {
      title: "",
      eventDate: new Date(),
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

  const resetForm = () => {
    form.reset({
      title: "",
      eventDate: new Date(),
      tracks: [{ title: "", youtubeUrl: "" }],
      lineup: makeDefaultLineup(),
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      eventDate: format(values.eventDate, "yyyy-MM-dd"),
      tracks: values.tracks.map((t) => ({
        title: t.title.trim(),
        youtubeUrl: t.youtubeUrl.trim(),
      })),
      lineup: values.lineup.map((l) => ({ roleCode: l.roleCode, memberIds: l.memberIds })),
    };

    try {
      await toastPromise(
        createPrepSetlist(payload).then((result) => {
          if (!result.ok) throw new Error(result.message);
        }),
        "콘티를 저장하는 중입니다...",
      ).unwrap();
      onOpenChange(false);
      resetForm();
    } catch {
      /* handled */
    }
  });

  const memberOptions = useMemo(() => teamMembers, [teamMembers]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,760px)] w-[calc(100%-1.5rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-lg">이 주의 콘티 추가</DialogTitle>
            <DialogDescription>곡과 라인업을 함께 저장합니다.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-6 px-5 py-5 sm:px-6">
          <FieldSet className="gap-5">
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="setlist-title">콘티 제목</FieldLabel>
                <Input
                  id="setlist-title"
                  placeholder="예: 5월 둘째 주 주일예배"
                  autoComplete="off"
                  aria-invalid={!!form.formState.errors.title}
                  {...form.register("title")}
                />
                <FieldError errors={[form.formState.errors.title]} />
              </Field>

              <Field>
                <FieldLabel>콘티 날짜</FieldLabel>
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
                    {eventDateValue ? format(eventDateValue, "PPP", { locale: ko }) : <span>날짜 선택</span>}
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
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => append({ title: "", youtubeUrl: "" })}>
                  <Plus className="size-3.5" />
                  줄 추가
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <li key={field.id} className="rounded-lg border border-border/60 bg-card/50 p-4 shadow-sm">
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
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddSetlistTriggerButton({
  className,
  variant = "outline",
  size = "sm",
  teamMembers,
  recentSongWarningByVideoId = {},
}: {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  teamMembers: LineupMemberOption[];
  recentSongWarningByVideoId?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("gap-1.5 shadow-sm", className)}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        콘티 추가
      </Button>
      <AddSetlistDialog
        open={open}
        onOpenChange={setOpen}
        teamMembers={teamMembers}
        recentSongWarningByVideoId={recentSongWarningByVideoId}
      />
    </>
  );
}
