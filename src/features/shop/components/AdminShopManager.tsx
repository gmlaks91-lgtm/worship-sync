"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteShopItem, upsertShopItem } from "@/features/shop/actions/adminShopActions";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  effectValue: string;
  pricePoints: string;
  currentImageUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: "avatar",
  effectValue: "",
  pricePoints: "0",
  currentImageUrl: "",
};

export function AdminShopManager({ items }: { items: ShopItemRow[] }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);

  const submitLabel = form.id ? "상품 수정" : "상품 등록";
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.price_points - b.price_points), [items]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      if (form.id) fd.set("id", form.id);
      fd.set("name", form.name);
      fd.set("description", form.description);
      fd.set("category", form.category);
      fd.set("effectValue", form.effectValue);
      fd.set("pricePoints", form.pricePoints);
      fd.set("currentImageUrl", form.currentImageUrl);
      if (file) fd.set("image", file);

      const res = await upsertShopItem(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(form.id ? "상품을 수정했습니다." : "상품을 등록했습니다.");
      setForm(EMPTY_FORM);
      setFile(null);
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("이 상품을 삭제할까요?")) return;
    start(async () => {
      const res = await deleteShopItem({ id });
      if (!res.ok) return toastError(res.message);
      toastSuccess("상품을 삭제했습니다.");
      if (form.id === id) {
        setForm(EMPTY_FORM);
        setFile(null);
      }
    });
  };

  const onEdit = (item: ShopItemRow) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      effectValue: item.effect_value,
      pricePoints: String(item.price_points),
      currentImageUrl: item.image_url,
    });
    setFile(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
        <h2 className="text-base font-semibold tracking-tight">{submitLabel}</h2>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">상품명</label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">설명</label>
          <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">카테고리</label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as FormState["category"] }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">가격(P)</label>
            <Input
              type="number"
              min={0}
              value={form.pricePoints}
              onChange={(e) => setForm((p) => ({ ...p, pricePoints: e.target.value }))}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">효과값 (avatar URL / frame 색상 / badge 문자열)</label>
          <Input value={form.effectValue} onChange={(e) => setForm((p) => ({ ...p, effectValue: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">상품 이미지 업로드</label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {form.currentImageUrl ? <p className="text-xs text-muted-foreground">현재 이미지가 저장되어 있습니다.</p> : null}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {submitLabel}
          </Button>
          {form.id ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(EMPTY_FORM);
                setFile(null);
              }}
            >
              새로 작성
            </Button>
          ) : null}
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">등록된 상품</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedItems.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="aspect-[16/9] border-b border-border/60 bg-muted/20">
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.description ?? "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category} · {item.price_points}P
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                    <Pencil className="size-3.5" />
                    수정
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                    <Trash2 className="size-3.5" />
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
