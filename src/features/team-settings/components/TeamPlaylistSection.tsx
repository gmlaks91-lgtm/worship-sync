"use client";

import { useState } from "react";

import { updateTeamPlaylist } from "@/features/team-settings/actions/teamSettingsActions";
import { toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TeamPlaylistSectionProps = {
  playlistId: string | null;
  canEdit: boolean;
  embedUrl: string | null;
};

export function TeamPlaylistSection({ playlistId, canEdit, embedUrl }: TeamPlaylistSectionProps) {
  const [playlistInput, setPlaylistInput] = useState(playlistId ?? "");
  const [pending, setPending] = useState(false);

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    try {
      await toastPromise(
        updateTeamPlaylist({ playlistInput }).then((res) => {
          if (!res.ok) throw new Error(res.message);
        }),
        "플레이리스트를 저장하는 중입니다...",
      ).unwrap();
    } catch {
      // toastPromise에서 처리됨
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">추천 플레이리스트</CardTitle>
        <CardDescription>팀이 함께 들을 유튜브 플레이리스트입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {embedUrl ? (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/15">
            <iframe
              title="Ahaba 팀 추천 플레이리스트"
              src={embedUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-[320px] w-full"
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            아직 등록된 플레이리스트가 없습니다.
          </p>
        )}

        {canEdit ? (
          <div className="space-y-2">
            <Input
              value={playlistInput}
              onChange={(e) => setPlaylistInput(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              disabled={pending}
            />
            <Button type="button" onClick={onSave} disabled={pending}>
              {pending ? "저장 중..." : "플레이리스트 저장"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
