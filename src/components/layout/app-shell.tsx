import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { SummerAtmosphere } from "@/components/layout/SummerAtmosphere";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export async function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("relative flex min-h-full flex-1 flex-col", className)}>
      <SummerAtmosphere />
      <AppHeader />
      <main className="relative z-[1] mx-auto flex w-full max-w-3xl flex-1 flex-col rounded-t-[2rem] border-t-4 border-sky-300/80 bg-white/95 px-6 pb-16 pt-10 shadow-[0_-8px_40px_oklch(0.45_0.06_210_/_0.28)] sm:bg-white/92 sm:px-8 sm:pb-20 sm:pt-12 sm:backdrop-blur-md">
        {children}
      </main>
    </div>
  );
}
