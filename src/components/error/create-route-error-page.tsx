"use client";

import { RouteErrorView, type RouteErrorViewProps } from "@/components/error/route-error-view";

type RouteErrorPageProps = Pick<RouteErrorViewProps, "error" | "reset">;

type CreateRouteErrorPageOptions = {
  segmentTitle?: string;
};

export function createRouteErrorPage({ segmentTitle }: CreateRouteErrorPageOptions = {}) {
  function RouteErrorPage({ error, reset }: RouteErrorPageProps) {
    return (
      <RouteErrorView
        error={error}
        reset={reset}
        segmentTitle={segmentTitle}
        boundary="route"
      />
    );
  }

  return RouteErrorPage;
}
