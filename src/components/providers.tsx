"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallProvider } from "@/features/pwa/context/PwaInstallProvider";
import { InAppBrowserEntryEscape } from "@/features/pwa/components/InAppBrowserEntryEscape";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PwaInstallProvider>
      <InAppBrowserEntryEscape />
      <TooltipProvider delay={0}>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </TooltipProvider>
    </PwaInstallProvider>
  );
}
