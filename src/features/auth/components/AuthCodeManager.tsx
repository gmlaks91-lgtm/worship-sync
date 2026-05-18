"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAuthCodeAction } from "@/features/auth/actions/authCodeActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthCodeManagerProps = {
  initialCode: string;
};

export function AuthCodeManager({ initialCode }: AuthCodeManagerProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-white p-6 shadow-sm shadow-neutral-100/60 sm:p-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">찬양팀 가입 인증 코드</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          새 코드를 저장하면 이후 찬양팀 회원가입 시 이 코드와 일치해야만 가입됩니다.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="새 인증 코드"
          className="h-11 max-w-md border-neutral-200 bg-white"
          autoComplete="off"
        />
        <Button
          type="button"
          disabled={pending || !code.trim()}
          onClick={() => {
            start(async () => {
              const res = await updateAuthCodeAction({ code });
              if (!res.ok) {
                toastError(res.message);
                return;
              }
              toastSuccess("인증 코드를 저장했습니다.");
              router.refresh();
            });
          }}
        >
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
