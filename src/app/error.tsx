"use client";

import { RouteErrorView } from "@/components/error/route-error-view";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return <RouteErrorView error={error} reset={reset} boundary="root" fullPage />;
}
