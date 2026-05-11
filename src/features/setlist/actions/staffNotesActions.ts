"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const updateSchema = z.object({
  setlistId: z.string().uuid(),
  staffNotes: z.string().max(4000),
});

export async function updateStaffNotes(raw: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "입력값을 확인해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, message: "로그인이 필요합니다." };

    const { error } = await supabase
      .from("setlists")
      .update({ staff_notes: parsed.data.staffNotes })
      .eq("id", parsed.data.setlistId);
    if (error) return { ok: false as const, message: error.message };

    revalidatePath(`/setlists/${parsed.data.setlistId}`);
    revalidatePath("/");
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ok: false as const, message };
  }
}
