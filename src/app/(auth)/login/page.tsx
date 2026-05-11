import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

function LoginFallback() {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm sm:p-10">
      Ahaba 로그인 화면으로 이동 중입니다...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-10">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
