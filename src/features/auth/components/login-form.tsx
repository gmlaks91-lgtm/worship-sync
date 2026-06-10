"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithIdAction, signUpWithIdAction, type SignupMembershipType } from "@/features/auth/actions";
import { sanitizeLoginIdRawInput } from "@/features/auth/login-id-email";
import { TEAM_ROLE_OPTIONS } from "@/lib/team-roles";
import { toastError, toastSuccess } from "@/lib/app-toast";
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
    membershipType: z.enum(["worship_team", "youth"]),
    authCode: z.string().optional(),
    rolePriority1: z.string().optional(),
    rolePriority2: z.string().optional(),
    rolePriority3: z.string().optional(),
    confirm: z.string().min(6, "비밀번호 확인을 입력해 주세요."),
  })
  .superRefine((data, ctx) => {
    if (data.membershipType === "worship_team") {
      if (!data.authCode?.trim()) {
        ctx.addIssue({ code: "custom", message: "인증 코드를 입력해 주세요.", path: ["authCode"] });
      }
      if (!data.rolePriority1?.trim()) {
        ctx.addIssue({ code: "custom", message: "역할 1순위를 선택해 주세요.", path: ["rolePriority1"] });
      }
    }
  })
  .refine((data) => data.password === data.confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirm"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type Mode = "signin" | "signup";

const MEMBERSHIP_OPTIONS: { value: SignupMembershipType; label: string; description: string }[] = [
  {
    value: "worship_team",
    label: "찬양팀 멤버",
    description: "리더가 발급한 인증 코드가 필요합니다.",
  },
  {
    value: "youth",
    label: "청년대학부원",
    description: "인증 코드 없이 바로 가입할 수 있습니다.",
  },
];

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);
  const urlError = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("signin");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

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
      membershipType: "youth",
      authCode: "",
      rolePriority1: "",
      rolePriority2: "",
      rolePriority3: "",
    },
  });

  const membershipType = signUpForm.watch("membershipType");
  const isWorshipTeamSignup = membershipType === "worship_team";

  const onSignIn = signInForm.handleSubmit(async ({ loginId, password }) => {
    const { error, awardedPoints } = await signInWithIdAction({ loginId, password });
    if (error) {
      toastError(error);
      return;
    }
    if (awardedPoints > 0) {
      toastSuccess(`로그인 보상 +${awardedPoints}P`);
    } else {
      toastSuccess("로그인되었습니다.");
    }
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  });

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    const { error } = await signUpWithIdAction({
      loginId: values.loginId,
      password: values.password,
      username: values.username,
      membershipType: values.membershipType,
      authCode: values.authCode,
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
    <Card className={cn("surface-card w-full max-w-xl shadow-md", className)}>
      <CardHeader className="gap-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400">아하바</p>
        <CardTitle className="text-2xl font-semibold tracking-tight">Ahava에 오신 것을 환영합니다</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          찬양팀과 청년대학부가 함께하는 공간입니다. 가입 유형을 선택하고 서비스를 시작해 보세요.
        </CardDescription>
        {urlError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            인증 오류: {decodeMaybe(urlError)}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100/90 p-1">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              mode === "signin"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800",
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
                ? "bg-white text-rose-600 shadow-sm"
                : "text-gray-500 hover:text-gray-800",
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
              <Button type="submit" className="h-11 min-h-11 w-full px-4 text-sm" disabled={signInForm.formState.isSubmitting}>
                {signInForm.formState.isSubmitting ? "처리 중..." : "로그인"}
              </Button>
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
          <form onSubmit={onSignUp} className="flex flex-col gap-5">
            <FieldSet className="gap-4">
              <Field>
                <FieldLabel>가입 유형</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MEMBERSHIP_OPTIONS.map((option) => {
                    const selected = membershipType === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "cursor-pointer rounded-2xl border px-4 py-4 transition",
                          selected
                            ? option.value === "worship_team"
                              ? "border-sky-300 bg-sky-50 ring-1 ring-sky-200"
                              : "border-rose-300 bg-rose-50 ring-1 ring-rose-200"
                            : "border-gray-100 bg-white hover:border-sky-100 hover:shadow-sm",
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          value={option.value}
                          {...signUpForm.register("membershipType")}
                        />
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                      </label>
                    );
                  })}
                </div>
              </Field>

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

                {isWorshipTeamSignup ? (
                  <>
                    <Field>
                      <FieldLabel>인증 코드</FieldLabel>
                      <Input
                        placeholder="인증 코드를 입력하세요"
                        autoComplete="off"
                        {...signUpForm.register("authCode")}
                      />
                      <FieldError errors={[signUpForm.formState.errors.authCode]} />
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
                            <option key={role.code} value={role.code}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {field.key === "rolePriority1" ? (
                          <FieldError errors={[signUpForm.formState.errors.rolePriority1]} />
                        ) : null}
                      </Field>
                    ))}
                  </>
                ) : null}
              </FieldGroup>

              <Button type="submit" className="h-11 w-full text-sm" disabled={signUpForm.formState.isSubmitting}>
                {signUpForm.formState.isSubmitting ? "처리 중..." : "회원가입"}
              </Button>
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
