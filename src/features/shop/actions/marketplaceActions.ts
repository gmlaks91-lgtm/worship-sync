"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

type MarketplaceActionResult =
  | { ok: true; message: string; points?: number }
  | { ok: false; message: string };

const listingIdSchema = z.object({ listingId: z.string().uuid() });

const createListingSchema = z.object({
  inventoryId: z.string().uuid(),
  pricePoints: z.coerce.number().int().min(1).max(1_000_000),
});

function parseRpcResult(result: unknown): { ok: boolean; message: string } {
  const row = result as { ok?: boolean; message?: string } | null;
  return {
    ok: Boolean(row?.ok),
    message: row?.message ?? "처리에 실패했습니다.",
  };
}

export async function createMarketplaceListing(
  raw: z.infer<typeof createListingSchema>,
): Promise<MarketplaceActionResult> {
  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data, error } = await supabase.rpc("create_inventory_listing", {
      p_inventory_id: parsed.data.inventoryId,
      p_price_points: parsed.data.pricePoints,
    });
    if (error) return { ok: false, message: error.message };

    const result = parseRpcResult(data);
    if (!result.ok) return { ok: false, message: result.message };

    revalidatePath("/shop");
    return { ok: true, message: result.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

export async function cancelMarketplaceListing(
  raw: z.infer<typeof listingIdSchema>,
): Promise<MarketplaceActionResult> {
  const parsed = listingIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "잘못된 요청입니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data, error } = await supabase.rpc("cancel_inventory_listing", {
      p_listing_id: parsed.data.listingId,
    });
    if (error) return { ok: false, message: error.message };

    const result = parseRpcResult(data);
    if (!result.ok) return { ok: false, message: result.message };

    revalidatePath("/shop");
    return { ok: true, message: result.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

export async function purchaseMarketplaceListing(
  raw: z.infer<typeof listingIdSchema>,
): Promise<MarketplaceActionResult> {
  const parsed = listingIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "잘못된 요청입니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data, error } = await supabase.rpc("purchase_inventory_listing", {
      p_listing_id: parsed.data.listingId,
    });
    if (error) return { ok: false, message: error.message };

    const result = parseRpcResult(data);
    if (!result.ok) return { ok: false, message: result.message };

    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .maybeSingle();

    revalidatePath("/shop");
    revalidatePath("/more");
    revalidatePath("/profile");

    return {
      ok: true,
      message: result.message,
      points: profile?.points ?? undefined,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}
