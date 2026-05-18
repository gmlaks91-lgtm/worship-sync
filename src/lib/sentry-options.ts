import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const isSentryEnabled = Boolean(sentryDsn);

export function getSentryEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

/** Performance tracing — dev 100%, production 10% */
export function getTracesSampleRate() {
  return getSentryEnvironment() === "production" ? 0.1 : 1;
}

export function getBaseSentryOptions(): Partial<NodeOptions & BrowserOptions & EdgeOptions> {
  return {
    dsn: sentryDsn,
    enabled: isSentryEnabled,
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
  };
}
