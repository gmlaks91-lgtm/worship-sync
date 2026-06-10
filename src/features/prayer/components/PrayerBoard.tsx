"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import {
  createPrayerRequest,
  deletePrayerRequest,
  togglePrayerReaction,
  updatePrayerRequest,
} from "@/features/prayer/actions/prayerActions";
import type { PrayerCardRow } from "@/features/prayer/queries/getPrayerPageData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";

type PrayerBoardProps = {
  prayers: PrayerCardRow[];
  canManage?: boolean;
};

export function PrayerBoard({ prayers, canManage = false }: PrayerBoardProps) {
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createPrayerRequest({ content, isAnonymous: anonymous });
      if (!res.ok) return toastError(res.message);
      toastSuccess();
      setContent("");
      setAnonymous(false);
    });
  };

  const startEdit = (item: PrayerCardRow) => {
    setEditingId(item.id);
    setEditDraft(item.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = (id: string) => {
    const value = editDraft.trim();
    if (!value) return toastError("내용을 입력해 주세요.");
    start(async () => {
      const res = await updatePrayerRequest({ id, content: value });
      if (!res.ok) return toastError(res.message);
      toastSuccess("기도제목이 수정되었습니다.");
      cancelEdit();
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("이 기도제목을 삭제할까요?")) return;
    start(async () => {
      const res = await deletePrayerRequest({ id });
      if (!res.ok) return toastError(res.message);
      toastSuccess("기도제목이 삭제되었습니다.");
    });
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기도제목 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="함께 기도받고 싶은 내용을 적어 주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            익명으로 올리기
          </label>
          <Button type="button" disabled={pending || !content.trim()} onClick={onCreate}>
            작성하기
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {prayers.map((item) => {
          const canModify = item.is_owner || canManage;
          const isEditing = editingId === item.id;
          return (
            <Card key={item.id} className="border-border/70">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.author_name}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                    {canModify && !isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={pending}
                          aria-label="기도제목 수정"
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-sky-600 disabled:opacity-50"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={pending}
                          aria-label="기도제목 삭제"
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      maxLength={1000}
                      disabled={pending}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={cancelEdit}>
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        disabled={pending || !editDraft.trim()}
                        onClick={() => saveEdit(item.id)}
                      >
                        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                )}

                {!isEditing ? (
                  <Button
                    type="button"
                    variant={item.reacted_by_me ? "secondary" : "outline"}
                    className="gap-2"
                    onClick={() =>
                      start(async () => {
                        const res = await togglePrayerReaction({ requestId: item.id });
                        if (!res.ok) return toastError(res.message);
                        toastSuccess();
                      })
                    }
                    disabled={pending}
                  >
                    기도할게요 🙏 <span className="text-xs">{item.reaction_count}</span>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
