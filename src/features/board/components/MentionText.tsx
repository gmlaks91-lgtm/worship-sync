"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import {
  extractMentionIdsFromBody,
  filterMembersByQuery,
  getActiveAtQuery,
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

type MentionTextareaProps = {
  id?: string;
  value: string;
  members: MentionMember[];
  onChange: (nextBody: string, mentionedIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function MentionTextarea({
  id,
  value,
  members,
  onChange,
  disabled,
  placeholder,
  rows = 4,
  className,
  onFocus,
  onBlur,
}: MentionTextareaProps) {
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suppressBlurClose = useRef(false);

  const active = getActiveAtQuery(value, cursor);
  const suggestions = active ? filterMembersByQuery(members, active.query) : [];
  const showMenu = open && Boolean(active) && suggestions.length > 0 && members.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [active?.query, active?.start]);

  useLayoutEffect(() => {
    if (!showMenu) return;
    setActiveIndex((i) => Math.min(i, Math.max(0, suggestions.length - 1)));
  }, [showMenu, suggestions.length]);

  const emit = (next: string, nextCursor?: number) => {
    onChange(next, extractMentionIdsFromBody(next, members));
    if (typeof nextCursor === "number") {
      setCursor(nextCursor);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
    }
  };

  const pick = (member: MentionMember) => {
    if (!active) return;
    const before = value.slice(0, active.start);
    const after = value.slice(cursor);
    const insertion = `@${member.username} `;
    const next = `${before}${insertion}${after}`;
    const nextCursor = before.length + insertion.length;
    setOpen(false);
    emit(next, nextCursor);
  };

  const syncCursor = () => {
    const el = textareaRef.current;
    if (!el) return;
    setCursor(el.selectionStart ?? 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={showMenu ? listId : undefined}
        aria-expanded={showMenu}
        onChange={(e) => {
          const next = e.target.value;
          const nextCursor = e.target.selectionStart ?? next.length;
          setCursor(nextCursor);
          setOpen(true);
          emit(next);
        }}
        onClick={syncCursor}
        onKeyUp={syncCursor}
        onSelect={syncCursor}
        onFocus={() => {
          setOpen(true);
          onFocus?.();
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (suppressBlurClose.current) {
              suppressBlurClose.current = false;
              return;
            }
            setOpen(false);
            onBlur?.();
          }, 0);
        }}
        onKeyDown={(e) => {
          if (!showMenu) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const member = suggestions[activeIndex];
            if (member) pick(member);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className={className}
      />

      {showMenu ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {suggestions.map((member, index) => (
            <li key={member.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                  index === activeIndex ? "bg-sky-50 text-sky-900" : "text-foreground hover:bg-muted/60",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  suppressBlurClose.current = true;
                }}
                onClick={() => {
                  pick(member);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-medium">@{member.username}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {members.length > 0 ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">@를 입력하면 사람을 태그할 수 있어요.</p>
      ) : null}
    </div>
  );
}
