import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import type { Database } from "@/types/database";
import { normalizeSupabaseUrl } from "@/utils/supabase/url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const host = forwardedHost ?? requestHeaders.get("host");
  const safeOrigin =
    host && forwardedProto ? `${forwardedProto}://${host}` : new URL(request.url).origin;
  const safeNext = sanitizeNextPath(next);

  if (!code) {
    return NextResponse.redirect(`${safeOrigin}/login?error=missing_code`);
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : rawUrl;

  if (!url || !key) {
    return NextResponse.redirect(`${safeOrigin}/login?error=not_configured`);
  }

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: false,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${safeOrigin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const response = NextResponse.redirect(`${safeOrigin}${safeNext}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as never);
  });
  return response;
}

function sanitizeNextPath(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (next === "/login" || next.startsWith("/auth")) return "/";
  return next;
}
