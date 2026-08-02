import {
  appendMentionToken,
  removeMentionToken,
  splitMentionSegments,
  type MentionMember,
} from "@/features/board/lib/mentions";
import { cn } from "@/lib/utils";

export type { MentionMember };

type MentionTextProps = {
  text: string;
  members: MentionMember[];
  className?: string;
};

export function MentionText({ text, members, className }: MentionTextProps) {
  const segments = splitMentionSegments(text, members);
  return (
    <p className={cn("whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95", className)}>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span
            key={`${seg.value}-${i}`}
            className="rounded-md bg-sky-100/80 px-1 py-0.5 font-medium text-sky-800"
          >
            {seg.value}
          </span>
        ) : (
          <span key={`t-${i}`}>{seg.value}</span>
        ),
      )}
    </p>
  );
}

type MentionPickerProps = {
  members: MentionMember[];
  selectedIds: string[];
  onChange: (nextIds: string[], nextBody: string) => void;
  body: string;
  disabled?: boolean;
};

export function MentionPicker({
  members,
  selectedIds,
  onChange,
  body,
  disabled,
}: MentionPickerProps) {
  if (members.length === 0) return null;

  const selected = new Set(selectedIds);

  const toggle = (member: MentionMember) => {
    if (selected.has(member.id)) {
      onChange(
        selectedIds.filter((id) => id !== member.id),
        removeMentionToken(body, member.username),
      );
      return;
    }
    onChange([...selectedIds, member.id], appendMentionToken(body, member.username));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">사람 태그</p>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {members.map((m) => {
          const active = selected.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggle(m)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-sky-400 bg-sky-100 text-sky-800"
                  : "border-border/70 bg-background text-muted-foreground hover:border-sky-300 hover:text-foreground",
                disabled && "opacity-50",
              )}
            >
              @{m.username}
            </button>
          );
        })}
      </div>
    </div>
  );
}
