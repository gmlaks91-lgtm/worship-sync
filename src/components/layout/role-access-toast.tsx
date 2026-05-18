"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { TEAM_ONLY_QUERY_FLAG } from "@/lib/route-access";

const TEAM_ONLY_MESSAGE = "찬양팀 전용 메뉴입니다.";

export function RoleAccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (searchParams.get(TEAM_ONLY_QUERY_FLAG) !== "1") return;

    shownRef.current = true;
    toast.error(TEAM_ONLY_MESSAGE);

    const params = new URLSearchParams(searchParams.toString());
    params.delete(TEAM_ONLY_QUERY_FLAG);
    const query = params.toString();
    const pathname = window.location.pathname;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, searchParams]);

  return null;
}
