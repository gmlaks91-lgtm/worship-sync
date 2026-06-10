"use client";

import { CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureRouteError, type RouteErrorBoundary } from "@/lib/sentry";
import { cn } from "@/lib/utils";

export type { RouteErrorBoundary };

export type RouteErrorViewProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** 라우트별 제목 (예: 포인트 상점) */
  segmentTitle?: string;
  /** Sentry 태그용 Error Boundary 구분 */
  boundary?: RouteErrorBoundary;
  /** global-error 등 전체 화면 중앙 정렬 */
  fullPage?: boolean;
  className?: string;
};

export function RouteErrorView({
  error,
  reset,
  segmentTitle,
  boundary = "route",
  fullPage = false,
  className,
}: RouteErrorViewProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    captureRouteError(error, { segmentTitle, boundary });
  }, [error, segmentTitle, boundary]);

  function handleGoHome() {
    reset();
    router.push("/");
  }

  const heading = segmentTitle
    ? `${segmentTitle} 페이지를 열지 못했어요`
    : "잠시 문제가 생겼어요";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-1 items-center justify-center px-4 py-10 sm:py-14",
        fullPage && "min-h-svh",
        className,
      )}
    >
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden
          className="decorative-blur pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-sky-100/70"
        />
        <div
          aria-hidden
          className="decorative-blur pointer-events-none absolute -bottom-8 -left-6 size-28 rounded-full bg-rose-100/60"
        />

        <article className="surface-card relative overflow-hidden rounded-[2rem] px-8 py-10 text-center shadow-md">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 via-white to-sky-100/90 ring-1 ring-sky-100/80">
            <CloudOff className="size-7 text-sky-500" strokeWidth={1.5} aria-hidden />
          </div>

          <p className="page-eyebrow mb-2">Worship Sync</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">{heading}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            잠시 후 다시 시도해 주세요
          </p>

          <Button
            type="button"
            size="lg"
            className="mt-8 h-11 w-full rounded-2xl text-[0.9375rem] font-medium shadow-sm"
            onClick={handleGoHome}
          >
            홈으로 돌아가기
          </Button>
        </article>
      </div>
    </div>
  );
}
