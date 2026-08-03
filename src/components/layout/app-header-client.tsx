"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Sun, UserRound, X } from "lucide-react";

import { AppHeaderActions } from "@/components/layout/app-header-actions";
import { PwaInstallButton } from "@/components/layout/PwaInstallButton";
import { signOut } from "@/features/auth/actions";
import { getHomePathForRole } from "@/lib/roles";
import { getNavItemsForRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileRole } from "@/types/database";

type AppHeaderClientProps = {
  isLoggedIn: boolean;
  userRole: ProfileRole | null;
  className?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeaderClient({ isLoggedIn, userRole, className }: AppHeaderClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItemsForRole(userRole);
  const homeHref = getHomePathForRole(userRole);

  return (
    <>
      <header
        className={cn(
          "glass-surface transform-gpu sticky top-0 z-40 shadow-md transition-[box-shadow] duration-200",
          className,
        )}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/40 bg-sky-950/40 text-sky-100 shadow-sm transition-all duration-200 hover:border-sky-200 hover:bg-sky-900/60 active:scale-95"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <Link
              href={homeHref}
              className="group flex items-center gap-2 transition-all duration-200 hover:opacity-90"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-xl border border-amber-200/35 bg-amber-200/15">
                <Sun className="size-4 text-amber-200" aria-hidden />
              </span>
              <span className="text-base font-black tracking-tight text-white sm:text-lg">Ahava</span>
            </Link>
          </div>

          <AppHeaderActions />
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-sky-950/25 transition-opacity duration-200 md:backdrop-blur-[2px]",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "will-change-transform transform-gpu fixed inset-y-0 left-0 z-50 flex w-80 max-w-[80vw] flex-col border-r border-primary/15 bg-card p-5 shadow-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
      >
        <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-5">
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">Ahava</p>
            <p className="mt-0.5 text-xs text-muted-foreground">청년대학부</p>
          </div>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
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
                    ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-primary active:scale-[0.99]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-colors duration-200",
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
          <div className="px-1">
            <PwaInstallButton />
          </div>
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                <UserRound className="size-4 text-muted-foreground" aria-hidden />
                내 프로필
              </Link>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut className="size-4" aria-hidden />
                  로그아웃
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
