import type { ReactNode } from "react";

import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { AppHeader } from "@/components/layout/app-header";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export async function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col bg-background", className)}>
      <AppHeader />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-32 pt-10 sm:px-8 sm:pb-36 sm:pt-12">
        {children}
      </main>
      <AppBottomNav />
    </div>
  );
}
