"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AppHeaderActions } from "@/components/layout/app-header-actions";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppHeaderClientProps = {
  isLoggedIn: boolean;
  canManageSetlists: boolean;
  teamMembers: Array<{ id: string; username: string }>;
  recentSongWarningByVideoId: Record<string, number>;
  className?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeaderClient({
  isLoggedIn,
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId,
  className,
}: AppHeaderClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border/60 bg-background",
          className,
        )}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-white text-foreground transition hover:border-foreground/70 hover:text-foreground"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <Link href="/" className="group flex flex-col gap-0.5 transition-opacity hover:opacity-90">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                찬양팀
              </span>
              <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Ahava</span>
            </Link>
          </div>

          <AppHeaderActions
            isLoggedIn={isLoggedIn}
            canManageSetlists={canManageSetlists}
            teamMembers={teamMembers}
            recentSongWarningByVideoId={recentSongWarningByVideoId}
          />
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        role="button"
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[80vw] flex-col border-r border-border/70 bg-background p-5 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">사이드 메뉴</p>
            <p className="text-lg font-semibold tracking-tight text-foreground">Ahava</p>
          </div>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-white text-foreground transition hover:border-foreground/70 hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-white text-foreground hover:border-foreground/70 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-2xl",
                    active ? "bg-primary/15 text-primary" : "bg-neutral-100 text-neutral-700",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-border/60 bg-white p-4 shadow-sm shadow-neutral-100/60">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">계정</p>
          <p className="mt-2 text-sm text-foreground">프로필, 로그아웃, 기능 버튼을 빠르게 확인하세요.</p>
        </div>
      </aside>
    </>
  );
}
