"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppBottomNavProps = {
  className?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppBottomNav({ className }: AppBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg",
        "shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]",
        className,
      )}
      aria-label="주요 메뉴"
    >
      <div
        className="mx-auto grid max-w-3xl px-1 pt-2 pb-1 sm:px-2"
        style={{ gridTemplateColumns: `repeat(${APP_NAV_ITEMS.length}, minmax(0, 1fr))` }}
      >
        {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-[10px] font-medium transition-colors sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-[background,box-shadow,color]",
                  active
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    : "bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

