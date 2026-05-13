import type { LucideIcon } from "lucide-react";
import { BookOpen, Home, MessageSquare, MoreHorizontal, ShoppingBag, Users } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/board", label: "공지사항", icon: MessageSquare },
  { href: "/prayer", label: "기도", icon: Users },
  { href: "/journal", label: "경건 일지", icon: BookOpen },
  { href: "/shop", label: "포인트 상점", icon: ShoppingBag },
  { href: "/more", label: "마이페이지", icon: MoreHorizontal },
];
