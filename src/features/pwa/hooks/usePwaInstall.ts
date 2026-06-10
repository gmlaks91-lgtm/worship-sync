"use client";

import {
  usePwaInstallContext,
  type PwaPlatform,
  type PwaPromptState,
} from "@/features/pwa/context/PwaInstallProvider";

export type { PwaPlatform, PwaPromptState };

export function usePwaInstall() {
  return usePwaInstallContext();
}
