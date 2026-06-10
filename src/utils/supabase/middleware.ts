import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";
import type { ProfileRole } from "@/types/database";

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
  profileRole: ProfileRole | null;
  authConfigured: boolean;
};

/**
 * 요청 쿠키에 Supabase 세션을 동기화해 클라이언트·서버 간 인증 상태를 맞춥니다.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { response: supabaseResponse, user: null, profileRole: null, authConfigured: false };
  }

  const supabase = createServerClient<Database>(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: false,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileRole: ProfileRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profileRole = profile?.role ?? null;
  }

  return { response: supabaseResponse, user, profileRole, authConfigured: true };
}
