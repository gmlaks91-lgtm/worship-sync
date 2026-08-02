import { Suspense } from "react";

import { SummerAtmosphere } from "@/components/layout/SummerAtmosphere";
import { LoginForm } from "@/features/auth/components/login-form";

function LoginFallback() {
  return (
    <div className="surface-card p-8 text-center text-sm text-muted-foreground sm:p-10">
      Ahava 로그인 화면으로 이동 중입니다...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="summer-login-stage relative flex min-h-screen items-center justify-center px-6 py-10">
      <SummerAtmosphere />
      <div className="relative z-[1] w-full max-w-xl">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
