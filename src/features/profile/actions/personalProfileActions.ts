"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

export type PersonalProfileActionResult = { ok: true } | { ok: false; message: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const personalProfileSchema = z.object({
  birthday: z
    .union([z.string(), z.null()])
    .transform((v) => (v === null || v === "" ? null : v))
    .refine((v) => v === null || YMD.test(v), "생일은 YYYY-MM-DD 형식이어야 합니다."),
  mbti: z
    .string()
    .max(16, "MBTI는 16자 이내로 입력해 주세요.")
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t.toUpperCase();
    }),
  favorite_song: z
    .string()
    .max(200, "곡 제목은 200자 이내로 입력해 주세요.")
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
});

export async function updatePersonalProfile(raw: {
  birthday?: string | null;
  mbti?: string | null;
  favorite_song?: string | null;
}): Promise<PersonalProfileActionResult> {
  const parsed = personalProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        birthday: parsed.data.birthday,
        mbti: parsed.data.mbti,
        favorite_song: parsed.data.favorite_song,
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/profile");
    revalidatePath("/more");
    revalidatePath("/team");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}
