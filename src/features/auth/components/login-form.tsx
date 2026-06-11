"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { signInWithFormAction, signUpWithFormAction } from "@/features/auth/actions";
import { toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 min-h-11 w-full px-4 text-sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function LoginForm({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);
  const urlError = searchParams.get("error");
  const signupSuccess = searchParams.get("signup") === "1";
  const loginReward = searchParams.get("login_reward");
  const [mode, setMode] = useState<Mode>("signin");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (toastShownRef.current) return;
    if (signupSuccess) {
      toastShownRef.current = true;
      toastSuccess("회원가입이 완료되었습니다. 로그인해 주세요.");
    }
  }, [signupSuccess]);

  useEffect(() => {
    if (toastShownRef.current || !loginReward) return;
    toastShownRef.current = true;
    toastSuccess(`로그인 보상 +${loginReward}P`);
  }, [loginReward]);

  return (
    <Card className={cn("surface-card w-full max-w-xl shadow-md", className)}>
      <CardHeader className="gap-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-600">아하바</p>
        <CardTitle className="text-2xl font-semibold tracking-tight">Ahava에 오신 것을 환영합니다</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          청년대학부와 함께하는 공간입니다. 가입하고 서비스를 시작해 보세요.
        </CardDescription>
        {urlError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {decodeMaybe(urlError)}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 rounded-xl bg-primary/10 p-1">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              mode === "signin"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("signin")}
          >
            로그인
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              mode === "signup"
                ? "bg-card text-amber-700 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        {mode === "signin" ? (
          <form action={signInWithFormAction} method="post" className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <FieldSet className="gap-3">
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="loginId">아이디</FieldLabel>
                  <Input
                    id="loginId"
                    name="loginId"
                    placeholder="아이디"
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">비밀번호</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    minLength={6}
                    required
                  />
                </Field>
              </FieldGroup>
              <SubmitButton label="로그인" pendingLabel="처리 중..." />
              <button
                type="button"
                className="min-h-11 w-full rounded-lg px-3 py-3 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline active:bg-muted/40"
                onClick={() => setForgotPasswordOpen(true)}
              >
                비밀번호를 잊으셨나요?
              </button>
            </FieldSet>
          </form>
        ) : (
          <form action={signUpWithFormAction} method="post" className="flex flex-col gap-5">
            <FieldSet className="gap-4">
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="username">이름</FieldLabel>
                  <Input id="username" name="username" maxLength={80} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-loginId">아이디</FieldLabel>
                  <Input
                    id="signup-loginId"
                    name="loginId"
                    placeholder="아이디"
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-password">비밀번호</FieldLabel>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm">비밀번호 확인</FieldLabel>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </Field>
              </FieldGroup>

              <SubmitButton label="회원가입" pendingLabel="처리 중..." />
            </FieldSet>
          </form>
        )}
      </CardContent>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 찾기</DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              비밀번호를 잊으신 경우, 보안을 위해 관리자(임원진)에게 문의하여 임시 비밀번호를
              발급받아 주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent p-0 sm:justify-stretch">
            <Button
              type="button"
              className="min-h-11 h-11 w-full px-4"
              onClick={() => setForgotPasswordOpen(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 px-4 py-4">
        <p className="text-center text-xs text-muted-foreground">
          계속하면 <Link href="#" className="underline underline-offset-4">서비스 이용약관</Link>에 동의한 것으로 간주됩니다.
        </p>
      </CardFooter>
    </Card>
  );
}

function decodeMaybe(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
