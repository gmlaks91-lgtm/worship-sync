import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Dices,
  Home,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
  Sun,
} from "lucide-react";

import type { ProfileRole } from "@/types/database";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "송리스트", icon: Home },
  { href: "/journal", label: "경건 일지", icon: BookOpen },
  { href: "/qt", label: "QT 나눔방", icon: Sun },
  { href: "/prayer", label: "기도 공유", icon: Sparkles },
  { href: "/free-board", label: "자유 게시판", icon: MessageSquare },
  { href: "/announcements", label: "공지사항", icon: Megaphone },
  { href: "/marble", label: "부루마블", icon: Dices },
  { href: "/shop", label: "포인트 상점", icon: ShoppingBag },
  { href: "/more", label: "마이페이지", icon: MoreHorizontal },
];

/** @deprecated use APP_NAV_ITEMS */
export const GENERAL_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.href !== "/");

/** @deprecated use APP_NAV_ITEMS */
export const WORSHIP_TEAM_NAV_ITEMS = APP_NAV_ITEMS;

export function getNavItemsForRole(_role: ProfileRole | null | undefined): AppNavItem[] {
  return APP_NAV_ITEMS;
}
