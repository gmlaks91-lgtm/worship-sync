"use client";

import { RouteErrorView } from "@/components/error/route-error-view";

type AppGroupErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppGroupError({ error, reset }: AppGroupErrorProps) {
  return <RouteErrorView error={error} reset={reset} boundary="app" />;
}
