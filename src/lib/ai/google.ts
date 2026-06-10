import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** Vercel AI SDK 권장: 빠른 최신 Flash 계열 (환경 변수로 변경 가능) */
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export function getGoogleGenerativeApiKey(): string | null {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;
}

export function getGeminiModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function createGoogleProvider() {
  const apiKey = getGoogleGenerativeApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요.",
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}

export function getGeminiModel() {
  const google = createGoogleProvider();
  return google(getGeminiModelId());
}
