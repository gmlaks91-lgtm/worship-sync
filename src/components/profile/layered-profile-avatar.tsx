"use client";
/* eslint-disable @next/next/no-img-element */

import { UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type LayeredProfileAvatarProps = {
  avatarUrl: string | null;
  frameUrl?: string | null;
  badgeUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackLabel?: string;
};

const SIZE_MAP = {
  sm: {
    wrapper: "size-14",
    frame: "size-[3.9rem]",
    badge: "size-5",
    icon: "size-5",
    text: "text-sm",
  },
  md: {
    wrapper: "size-20",
    frame: "size-[5.6rem]",
    badge: "size-6",
    icon: "size-7",
    text: "text-base",
  },
  lg: {
    wrapper: "size-32",
    frame: "size-[8.9rem]",
    badge: "size-8",
    icon: "size-10",
    text: "text-lg",
  },
} as const;

function initials(name?: string) {
  if (!name) return "?";
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 2);
}

export function LayeredProfileAvatar({
  avatarUrl,
  frameUrl,
  badgeUrl,
  size = "md",
  className,
  fallbackLabel,
}: LayeredProfileAvatarProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={cn("relative isolate", s.wrapper, className)}>
      <Avatar className={cn("absolute inset-0", s.wrapper)}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback className={cn("bg-muted font-semibold text-muted-foreground", s.text)}>
          {fallbackLabel ? initials(fallbackLabel) : <UserRound className={s.icon} aria-hidden />}
        </AvatarFallback>
      </Avatar>

      {frameUrl ? (
        <img
          src={frameUrl}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 object-contain",
            s.frame,
          )}
        />
      ) : null}

      {badgeUrl ? (
        <img
          src={badgeUrl}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-0.5 -right-0.5 z-20 rounded-full border border-background/80 bg-background object-cover",
            s.badge,
          )}
        />
      ) : null}
    </div>
  );
}
