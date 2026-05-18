import * as Sentry from "@sentry/nextjs";

import { getBaseSentryOptions } from "@/lib/sentry-options";

Sentry.init({
  ...getBaseSentryOptions(),
  integrations: [Sentry.browserTracingIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
