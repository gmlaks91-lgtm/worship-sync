"use client";

import { HeaderPointsBadge } from "@/features/points/components/HeaderPointsBadge";

/** 헤더에는 포인트만 두고, 프로필·로그아웃·설치는 메뉴로 */
export function AppHeaderActions() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <HeaderPointsBadge className="border-sky-300/35 bg-sky-950/40 text-sky-50 hover:border-sky-200/50 hover:bg-sky-900/55 hover:text-white [&_svg]:text-amber-200" />
    </div>
  );
}
