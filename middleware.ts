import { type NextRequest, NextResponse } from "next/server";

import { getGeneralAccessRedirect } from "@/lib/route-access";
import { isLeaderRole } from "@/lib/roles";
import { updateSession } from "@/utils/supabase/middleware";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/callback");
}

/** Vercel Cron 등 서버-투-서버 호출 (세션 없음, 라우트에서 CRON_SECRET 검증) */
function isCronApiPath(pathname: string) {
  return pathname.startsWith("/api/cron/");
}

function safeInternalPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function middleware(request: NextRequest) {
  const { response, user, profileRole, authConfigured } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (authConfigured && !user && !isPublicPath(pathname) && !isCronApiPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(url);
  }

  if (authConfigured && user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = safeInternalPath(url.searchParams.get("next"));
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (authConfigured && user) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (!isLeaderRole(profileRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    const redirectTarget = getGeneralAccessRedirect(pathname, profileRole);
    if (redirectTarget) {
      const url = request.nextUrl.clone();
      const [path, search] = redirectTarget.split("?");
      url.pathname = path;
      url.search = search ? `?${search}` : "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
