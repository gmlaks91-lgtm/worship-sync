import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { normalizeSupabaseUrl } from "@/utils/supabase/url";

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : rawUrl;

  if (!url || !key) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.",
    );
  }

  return createBrowserClient<Database>(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
