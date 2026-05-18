import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Home,
  ListMusic,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import type { ProfileRole } from "@/types/database";

import { isWorshipTeamRole } from "@/lib/roles";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** 일반 청년부원 사이드 메뉴 */
export const GENERAL_NAV_ITEMS: AppNavItem[] = [
  { href: "/journal", label: "경건 일지", icon: BookOpen },
  { href: "/prayer", label: "기도 공유", icon: Sparkles },
  { href: "/free-board", label: "자유 게시판", icon: MessageSquare },
  { href: "/announcements", label: "공지사항", icon: Megaphone },
  { href: "/playlist", label: "송리스트/추천 플리", icon: ListMusic },
];

/** 찬양팀·관리자 전체 사이드 메뉴 */
export const WORSHIP_TEAM_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "홈", icon: Home },
  ...GENERAL_NAV_ITEMS,
  { href: "/shop", label: "포인트 상점", icon: ShoppingBag },
  { href: "/more", label: "마이페이지", icon: MoreHorizontal },
];

/** @deprecated WORSHIP_TEAM_NAV_ITEMS 또는 getNavItemsForRole 사용 */
export const APP_NAV_ITEMS = WORSHIP_TEAM_NAV_ITEMS;

export function getNavItemsForRole(role: ProfileRole | null | undefined): AppNavItem[] {
  return isWorshipTeamRole(role) ? WORSHIP_TEAM_NAV_ITEMS : GENERAL_NAV_ITEMS;
}
