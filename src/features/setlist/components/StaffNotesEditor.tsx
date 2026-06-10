"use client";

import { useState, useTransition } from "react";

import { updateStaffNotes } from "@/features/setlist/actions/staffNotesActions";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/app-toast";

export function StaffNotesEditor({ setlistId, initialValue }: { setlistId: string; initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");
  const [pending, start] = useTransition();

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-card/60 p-4">
      <h2 className="text-sm font-semibold">STAFF 피드백 & 메모</h2>
      <textarea
        className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        placeholder="마이크 배터리, 조명 큐, 볼륨 조절 등 메모를 남겨 주세요."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await updateStaffNotes({ setlistId, staffNotes: value });
            if (!res.ok) return toastError(res.message);
            toastSuccess("메모가 저장되었습니다.");
          })
        }
      >
        저장
      </Button>
    </section>
  );
}
