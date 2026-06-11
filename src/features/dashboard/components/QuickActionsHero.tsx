import Link from "next/link";
import { BookOpenCheck, Sun, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  className: string;
  iconWrapClassName: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/qt",
    title: "오늘의 QT 묵상하기",
    description: "말씀을 읽고 오늘의 묵상을 나눠보세요.",
    icon: Sun,
    className:
      "from-amber-100 to-yellow-50 border-amber-300 hover:border-amber-400 hover:shadow-amber-200/50",
    iconWrapClassName: "bg-amber-400 text-white shadow-md",
  },
  {
    href: "/journal",
    title: "이번 주 경건일지 작성",
    description: "한 주의 신앙 체크리스트를 채워보세요.",
    icon: BookOpenCheck,
    className:
      "from-emerald-100 to-green-50 border-emerald-400 hover:border-emerald-500 hover:shadow-emerald-200/50",
    iconWrapClassName: "bg-emerald-600 text-white shadow-md",
  },
];

export function QuickActionsHero() {
  return (
    <section aria-label="바로 하기" className="flex flex-col gap-4">
      <div className="px-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">오늘 할 일</h2>
        <p className="mt-1 text-sm text-muted-foreground">가장 중요한 두 가지부터 시작해요.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex min-h-[140px] flex-col justify-between gap-5 rounded-3xl border-2 bg-gradient-to-br p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-7",
                action.className,
              )}
            >
              <span
                className={cn(
                  "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
                  action.iconWrapClassName,
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={2.2} />
              </span>

              <div className="flex flex-col gap-1.5">
                <span className="text-xl font-bold leading-snug tracking-tight text-foreground">
                  {action.title}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{action.description}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
