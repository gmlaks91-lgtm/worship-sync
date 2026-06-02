"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteShopItem, upsertShopItem } from "@/features/shop/actions/adminShopActions";
import { ExpandableDescription } from "@/features/shop/components/ExpandableDescription";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "avatar", label: "아바타" },
  { value: "frame", label: "테두리" },
  { value: "badge", label: "배지" },
] as const;

type FormState = {
  id?: string;
  name: string;
  description: string;
  category: "avatar" | "frame" | "badge";
  pricePoints: string;
  stock: string;
  currentImageUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: "avatar",
  pricePoints: "100",
  stock: "",
  currentImageUrl: "",
};

export function AdminShopManager({ items }: { items: ShopItemRow[] }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const submitLabel = form.id ? "상품 수정" : "상품 등록";
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.price_points - b.price_points), [items]);
  const displayPreview = previewUrl ?? (form.currentImageUrl || null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFile(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      if (form.id) fd.set("id", form.id);
      fd.set("name", form.name);
      fd.set("description", form.description);
      fd.set("category", form.category);
      fd.set("pricePoints", form.pricePoints);
      fd.set("stock", form.stock);
      fd.set("currentImageUrl", form.currentImageUrl);
      if (file) fd.set("image", file);

      const res = await upsertShopItem(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(form.id ? "상품을 수정했습니다." : "상품을 등록했습니다.");
      resetForm();
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("이 상품을 삭제할까요?")) return;
    start(async () => {
      const res = await deleteShopItem({ id });
      if (!res.ok) return toastError(res.message);
      toastSuccess("상품을 삭제했습니다.");
      if (form.id === id) resetForm();
    });
  };

  const onEdit = (item: ShopItemRow) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      pricePoints: String(item.price_points),
      stock: item.stock === null ? "" : String(item.stock),
      currentImageUrl: item.image_url,
    });
    setFile(null);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,400px)_1fr]">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">{submitLabel}</h2>
          <p className="text-xs text-slate-500">상품명·가격·설명·이미지를 입력하고 등록하세요.</p>
        </div>

        <ShopImageUploadSection displayPreview={displayPreview} setFile={setFile} />

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">상품명</span>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 다윗의 기타"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">설명</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="상품에 대한 짧은 설명"
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus-visible:border-sky-300 focus-visible:ring-3 focus-visible:ring-sky-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">카테고리</span>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus-visible:border-sky-300 focus-visible:ring-3 focus-visible:ring-sky-100"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value as FormState["category"] }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">가격 (포인트)</span>
              <Input
                type="number"
                min={0}
                value={form.pricePoints}
                onChange={(e) => setForm((p) => ({ ...p, pricePoints: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">재고</span>
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="비우면 무제한"
              />
              <p className="text-xs text-slate-400">0 = 품절, 비워두면 무제한 판매</p>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {submitLabel}
          </Button>
          {form.id ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              새로 작성
            </Button>
          ) : null}
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">등록된 상품</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-slate-50">
                <RemoteImage src={item.image_url} alt={item.name} fill variant="card" className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <p className="font-semibold text-slate-800">{item.name}</p>
                <ExpandableDescription text={item.description ?? "-"} className="text-xs" />
                <p className="text-sm font-medium text-sky-600">
                  {item.price_points}P
                  {item.stock !== null ? ` · 재고 ${item.stock}` : " · 무제한"}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)} disabled={pending}>
                    <Pencil className="h-3.5 w-3.5" />
                    수정
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ShopImageUploadSection({
  displayPreview,
  setFile,
}: {
  displayPreview: string | null;
  setFile: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-sky-100 bg-gradient-to-br from-sky-50/80 to-rose-50/60",
          displayPreview && "border-solid border-white shadow-md",
        )}
      >
        {displayPreview ? (
          <RemoteImage src={displayPreview} alt="상품 미리보기" fill variant="card" className="object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <ImagePlus className="h-8 w-8" />
            <span className="text-xs">이미지 미리보기</span>
          </div>
        )}
      </div>
      <label className="cursor-pointer text-sm font-medium text-sky-600 hover:text-sky-700">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        이미지 선택
      </label>
    </div>
  );
}
