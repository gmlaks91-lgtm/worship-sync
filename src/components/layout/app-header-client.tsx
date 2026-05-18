"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AppHeaderActions } from "@/components/layout/app-header-actions";
import { getHomePathForRole } from "@/lib/roles";
import { getNavItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { ProfileRole } from "@/types/database";

type AppHeaderClientProps = {
  isLoggedIn: boolean;
  userRole: ProfileRole | null;
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
  userRole,
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId,
  className,
}: AppHeaderClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItemsForRole(userRole);
  const homeHref = getHomePathForRole(userRole);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-slate-100 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-200",
          className,
        )}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 active:scale-95"
            >
              <Menu className="h-5 w-5 text-sky-500" aria-hidden />
            </button>
            <Link
              href={homeHref}
              className="group flex flex-col gap-0.5 transition-all duration-200 hover:opacity-90"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-rose-400">Ahava</span>
              <span className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">Ahava</span>
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
          "fixed inset-0 z-40 bg-sky-950/10 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        role="button"
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[80vw] flex-col border-r border-slate-100 bg-white p-5 shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">사이드 메뉴</p>
            <p className="text-lg font-semibold tracking-tight text-slate-800">Ahava</p>
          </div>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "border-sky-200 bg-sky-50 text-sky-700 shadow-sm"
                    : "border-slate-100 bg-white text-slate-700 hover:border-sky-100 hover:bg-sky-50/50 hover:text-sky-600 active:scale-[0.99]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-colors duration-200",
                    active ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500 group-hover:text-sky-500",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="surface-card mt-auto rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">계정</p>
          <p className="mt-2 text-sm text-slate-600">프로필, 로그아웃, 기능 버튼을 빠르게 확인하세요.</p>
        </div>
      </aside>
    </>
  );
}
