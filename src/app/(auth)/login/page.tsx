import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

function LoginFallback() {
  return (
    <div className="surface-card p-8 text-center text-sm text-gray-500 sm:p-10">
      Ahaba 로그인 화면으로 이동 중입니다...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50 py-10">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
