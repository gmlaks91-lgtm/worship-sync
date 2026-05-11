import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/callback");
}

function safeInternalPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function middleware(request: NextRequest) {
  const { response, user, authConfigured } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (authConfigured && !user && !isPublicPath(pathname)) {
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
