import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, HandHeart, HeartPulse, LayoutList, MessagesSquare, MoreHorizontal, ShoppingBag, Users } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const APP_NAV_ITEMS_ALL: Array<AppNavItem & { hidden?: boolean }> = [
  { href: "/", label: "송리스트", icon: LayoutList },
  { href: "/sheets", label: "악보", icon: BookOpen },
  { href: "/schedule", label: "일정", icon: CalendarDays },
  { href: "/prayer", label: "기도나눔", icon: HandHeart },
  // 임시 숨김: 경건생활 기능
  { href: "/faith", label: "신앙", icon: HeartPulse, hidden: true },
  // 임시 숨김: 상점 기능
  { href: "/shop", label: "상점", icon: ShoppingBag, hidden: true },
  { href: "/team", label: "팀", icon: Users },
  { href: "/board", label: "게시판", icon: MessagesSquare },
  { href: "/more", label: "더보기", icon: MoreHorizontal },
];

export const APP_NAV_ITEMS: AppNavItem[] = APP_NAV_ITEMS_ALL.filter((item) => !item.hidden);
