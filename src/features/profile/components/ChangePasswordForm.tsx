"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { changePasswordAction } from "@/features/auth/actions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const changePasswordSchema = z
  .object({
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
    confirm: z.string().min(6, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((data) => data.password === data.confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirm"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setSubmitting(true);
    try {
      const result = await changePasswordAction({ password });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      toastSuccess(result.message);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FieldSet className="gap-3">
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="new-password">새 비밀번호</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              disabled={submitting}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">새 비밀번호 확인</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              disabled={submitting}
              {...form.register("confirm")}
            />
            <FieldError errors={[form.formState.errors.confirm]} />
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          className="h-11 min-h-11 w-full px-4 text-sm sm:w-auto"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          비밀번호 변경
        </Button>
      </FieldSet>
    </form>
  );
}
