"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TEAM_ROLE_OPTIONS } from "@/lib/team-roles";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { signInWithIdAction, signUpWithIdAction } from "@/features/auth/actions";
import { sanitizeLoginIdRawInput } from "@/features/auth/login-id-email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const signInSchema = z.object({
  loginId: z
    .string()
    .transform((s) => sanitizeLoginIdRawInput(s))
    .pipe(
      z
        .string()
        .min(1, "아이디를 입력해 주세요.")
        .regex(/^[^@\s]+$/, "아이디에는 '@' 또는 공백을 포함할 수 없습니다."),
    ),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

const signUpSchema = signInSchema
  .extend({
    username: z.string().trim().min(1, "이름을 입력해 주세요.").max(80, "이름은 80자 이하로 입력해 주세요."),
    rolePriority1: z.string().min(1, "역할 1순위를 선택해 주세요."),
    rolePriority2: z.string().optional(),
    rolePriority3: z.string().optional(),
    confirm: z.string().min(6, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((data) => data.password === data.confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirm"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type Mode = "signin" | "signup";

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);
  const urlError = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("signin");

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { loginId: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      loginId: "",
      password: "",
      confirm: "",
      rolePriority1: "",
      rolePriority2: "",
      rolePriority3: "",
    },
  });

  const onSignIn = signInForm.handleSubmit(async ({ loginId, password }) => {
    const { error } = await signInWithIdAction({ loginId, password });
    if (error) {
      toastError(error);
      return;
    }
    toastSuccess("로그인되었습니다.");
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  });

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    const { error } = await signUpWithIdAction({
      loginId: values.loginId,
      password: values.password,
      username: values.username,
      rolePriority1: values.rolePriority1,
      rolePriority2: values.rolePriority2,
      rolePriority3: values.rolePriority3,
    });
    if (error) {
      toastError(error);
      return;
    }
    toastSuccess("회원가입이 완료되었습니다. 로그인해 주세요.");
    setMode("signin");
  });

  return (
    <Card className={cn("w-full max-w-xl border-border/80", className)}>
      <CardHeader className="gap-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">아하바 찬양팀</p>
        <CardTitle className="text-2xl font-semibold tracking-tight">Ahava에 오신 것을 환영합니다</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          함께 예배를 준비하는 공간입니다. 로그인 후 콘티, 라인업, 악보를 편하게 관리해 보세요.
        </CardDescription>
        {urlError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            인증 오류: {decodeMaybe(urlError)}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 rounded-lg bg-muted/50 p-1 ring-1 ring-border/60">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "signin"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("signin")}
          >
            로그인
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "signup"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={onSignIn} className="flex flex-col gap-4">
            <FieldSet className="gap-3">
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel>아이디</FieldLabel>
                  <Input placeholder="아이디" autoComplete="username" {...signInForm.register("loginId")} />
                  <FieldError errors={[signInForm.formState.errors.loginId]} />
                </Field>
                <Field>
                  <FieldLabel>비밀번호</FieldLabel>
                  <Input type="password" autoComplete="current-password" {...signInForm.register("password")} />
                  <FieldError errors={[signInForm.formState.errors.password]} />
                </Field>
              </FieldGroup>
              <Button type="submit" className="h-11 w-full text-sm" disabled={signInForm.formState.isSubmitting}>
                {signInForm.formState.isSubmitting ? "처리 중..." : "로그인"}
              </Button>
            </FieldSet>
          </form>
        ) : (
          <form onSubmit={onSignUp} className="flex flex-col gap-4">
            <FieldSet className="gap-3">
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel>이름</FieldLabel>
                  <Input {...signUpForm.register("username")} />
                  <FieldError errors={[signUpForm.formState.errors.username]} />
                </Field>
                <Field>
                  <FieldLabel>아이디</FieldLabel>
                  <Input placeholder="아이디" autoComplete="username" {...signUpForm.register("loginId")} />
                  <FieldError errors={[signUpForm.formState.errors.loginId]} />
                </Field>
                <Field>
                  <FieldLabel>비밀번호</FieldLabel>
                  <Input type="password" autoComplete="new-password" {...signUpForm.register("password")} />
                  <FieldError errors={[signUpForm.formState.errors.password]} />
                </Field>
                <Field>
                  <FieldLabel>비밀번호 확인</FieldLabel>
                  <Input type="password" autoComplete="new-password" {...signUpForm.register("confirm")} />
                  <FieldError errors={[signUpForm.formState.errors.confirm]} />
                </Field>
                {[
                  { key: "rolePriority1", label: "역할 1순위" },
                  { key: "rolePriority2", label: "역할 2순위" },
                  { key: "rolePriority3", label: "역할 3순위" },
                ].map((field) => (
                  <Field key={field.key}>
                    <FieldLabel>{field.label}</FieldLabel>
                    <select
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      {...signUpForm.register(field.key as "rolePriority1" | "rolePriority2" | "rolePriority3")}
                    >
                      <option value="">선택 안 함</option>
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={role.code} value={role.code}>{role.label}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </FieldGroup>
              <Button type="submit" className="h-11 w-full text-sm" disabled={signUpForm.formState.isSubmitting}>
                {signUpForm.formState.isSubmitting ? "처리 중..." : "회원가입"}
              </Button>
            </FieldSet>
          </form>
        )}

      </CardContent>

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
