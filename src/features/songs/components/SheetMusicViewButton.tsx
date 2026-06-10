"use client";

import { FileMusic } from "lucide-react";
import { useState } from "react";

import { SheetMusicViewer } from "@/features/songs/components/SheetMusicViewer";
import { Button } from "@/components/ui/button";

type SheetMusicViewButtonProps = {
  title: string;
  sheetMusicUrl: string | null;
  size?: "sm" | "default";
};

export function SheetMusicViewButton({ title, sheetMusicUrl, size = "sm" }: SheetMusicViewButtonProps) {
  const [open, setOpen] = useState(false);

  if (!sheetMusicUrl?.trim()) return null;

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <FileMusic className="mr-1.5 size-4" aria-hidden />
        악보 보기
      </Button>
      <SheetMusicViewer
        open={open}
        onOpenChange={setOpen}
        title={title}
        sheetMusicUrl={sheetMusicUrl.trim()}
      />
    </>
  );
}
