import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "@/lib/sentry-options";

export type RouteErrorBoundary = "route" | "app" | "root" | "global";

type RouteErrorContext = {
  segmentTitle?: string;
  boundary?: RouteErrorBoundary;
};

/** Error Boundary(error.tsx)에서 잡힌 클라이언트 에러를 Sentry로 전송 */
export function captureRouteError(
  error: Error & { digest?: string },
  context?: RouteErrorContext,
) {
  if (!isSentryEnabled) return;

  Sentry.captureException(error, {
    tags: {
      error_boundary: context?.boundary ?? "route",
      ...(context?.segmentTitle ? { route_segment: context.segmentTitle } : {}),
    },
    extra: {
      digest: error.digest,
    },
  });
}
