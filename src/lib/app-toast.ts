import { toast } from "sonner";

/** 앱 전역 토스트 톤 (성공) */
export const TOAST_SUCCESS = {
  title: "완료되었습니다.",
  description: "작업이 정상적으로 반영되었어요.",
} as const;

/** 앱 전역 토스트 톤 (실패) */
export const TOAST_ERROR = {
  title: "앗! 문제가 발생했어요.",
  description: "잠시 후 다시 시도해 주세요.",
} as const;

export function toastSuccess(description?: string) {
  toast.success(TOAST_SUCCESS.title, {
    description: description ?? TOAST_SUCCESS.description,
  });
}

export function toastError(description?: string) {
  toast.error(TOAST_ERROR.title, {
    description: description ?? TOAST_ERROR.description,
  });
}

/** Promise 작업용 — 로딩/성공/실패 문구 통일 (실패 시 `description`에 상세 메시지) */
export function toastPromise<T>(promise: Promise<T>, loadingMessage: string) {
  return toast.promise(promise, {
    loading: loadingMessage,
    success: () => ({
      message: TOAST_SUCCESS.title,
      description: TOAST_SUCCESS.description,
    }),
    error: (e) => ({
      message: TOAST_ERROR.title,
      description: e instanceof Error ? e.message : TOAST_ERROR.description,
    }),
  });
}
