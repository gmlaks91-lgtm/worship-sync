"use client";

import { useMemo, useState, useTransition } from "react";

import { upsertSetlistLineup } from "@/features/setlist/actions/setlistActions";
import type { TeamMemberRow } from "@/features/team/queries/getTeamMembers";
import { isMultiMemberRole, TEAM_ROLE_OPTIONS, teamRoleLabel } from "@/lib/team-roles";
import { toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SetlistLineupEditorProps = {
  setlistId: string;
  current: Array<{ role_code: string; member_id: string }>;
  members: TeamMemberRow[];
  triggerClassName?: string;
};

export function SetlistLineupEditor({ setlistId, current, members, triggerClassName }: SetlistLineupEditorProps) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const initial = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of current) {
      const existing = map.get(item.role_code) ?? [];
      existing.push(item.member_id);
      map.set(item.role_code, existing);
    }

    return TEAM_ROLE_OPTIONS.map((r) => ({
      roleCode: r.code,
      memberIds: (map.get(r.code) ?? []).slice(),
    }));
  }, [current]);

  const [draft, setDraft] = useState(initial);

  const onSave = () => {
    start(async () => {
      try {
        await toastPromise(
          upsertSetlistLineup({
            setlistId,
            lineup: draft.map((d) => ({ roleCode: d.roleCode, memberIds: d.memberIds })),
          }).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "라인업을 저장하는 중입니다...",
        ).unwrap();
        setOpen(false);
      } catch {
        /* toastPromise */
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(initial);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className={triggerClassName} />
        }
      >
        라인업
      </DialogTrigger>
      <DialogContent className="max-w-lg border border-neutral-200 bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900">라인업</DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            V(보컬), STAFF는 여러 명 선택할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[min(70vh,480px)] gap-3 overflow-y-auto sm:grid-cols-2">
          {draft.map((item, index) => (
            <div key={item.roleCode} className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-500">{teamRoleLabel(item.roleCode)}</p>
              {isMultiMemberRole(item.roleCode) ? (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2">
                  {members.map((m) => {
                    const checked = item.memberIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = [...draft];
                            const existing = next[index].memberIds;
                            next[index] = {
                              ...next[index],
                              memberIds: e.target.checked
                                ? [...existing, m.id]
                                : existing.filter((id) => id !== m.id),
                            };
                            setDraft(next);
                          }}
                        />
                        <span className="text-sm text-neutral-800">{m.username}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <select
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                  value={item.memberIds[0] ?? ""}
                  onChange={(e) => {
                    const next = [...draft];
                    next[index] = { ...next[index], memberIds: e.target.value ? [e.target.value] : [] };
                    setDraft(next);
                  }}
                >
                  <option value="">미배정</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button type="button" onClick={onSave} disabled={pending}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
