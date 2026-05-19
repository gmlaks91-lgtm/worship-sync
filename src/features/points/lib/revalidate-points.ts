import { revalidatePath } from "next/cache";

/** 포인트 잔액이 표시되는 페이지·레이아웃 캐시 무효화 */
export function revalidatePointsRoutes() {
  revalidatePath("/more");
  revalidatePath("/profile");
  revalidatePath("/points");
  revalidatePath("/shop");
  revalidatePath("/faith");
  revalidatePath("/", "layout");
}
