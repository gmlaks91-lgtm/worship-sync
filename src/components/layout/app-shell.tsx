import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { WorldCupAtmosphere } from "@/components/layout/WorldCupAtmosphere";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export async function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("relative flex min-h-full flex-1 flex-col", className)}>
      <WorldCupAtmosphere />
      <AppHeader />
      <main className="relative z-[1] mx-auto flex w-full max-w-3xl flex-1 flex-col rounded-t-[2rem] border-t-4 border-amber-400 bg-white/92 px-6 pb-16 pt-10 shadow-[0_-8px_40px_oklch(0.2_0.06_155_/_0.35)] backdrop-blur-md sm:px-8 sm:pb-20 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
