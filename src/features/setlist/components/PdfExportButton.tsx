"use client";

import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { toastError, toastPromise } from "@/lib/app-toast";

type PdfExportButtonProps = {
  setlistTitle: string;
  songs: Array<{
    songId: string;
    title: string;
    imageUrls: string[];
  }>;
};

type PdfPageImage = {
  songTitle: string;
  imageUrl: string;
};

type LoadedPdfImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export function PdfExportButton({ setlistTitle, songs }: PdfExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const runExport = useCallback(async () => {
    const pages = songs.flatMap<PdfPageImage>((song) =>
      (song.imageUrls ?? []).filter(Boolean).map((imageUrl) => ({
        songTitle: song.title,
        imageUrl,
      })),
    );

    if (pages.length === 0) {
      throw new Error("이 송리스트에는 PDF로 묶을 악보 이미지가 없습니다.");
    }

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let addedPages = 0;
    const failedSongs = new Set<string>();

    for (const page of pages) {
      try {
        const image = await loadPdfImage(page.imageUrl);

        if (addedPages > 0) {
          pdf.addPage("a4", "portrait");
        }

        fillPdfPage(pdf, pageWidth, pageHeight, image);
        addedPages += 1;
      } catch {
        failedSongs.add(page.songTitle);
      }
    }

    if (addedPages === 0) {
      const failedSongList = [...failedSongs];
      throw new Error(
        failedSongList.length > 0
          ? `악보 이미지를 불러오지 못했습니다: ${failedSongList.join(", ")}`
          : "악보 이미지를 불러오지 못했습니다.",
      );
    }

    pdf.save(buildPdfFileName(setlistTitle));

    if (failedSongs.size > 0) {
      toastError(`일부 악보를 건너뛰었습니다: ${[...failedSongs].join(", ")}`);
    }
  }, [setlistTitle, songs]);

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="h-9 gap-2 print:hidden"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void toastPromise(
          runExport().finally(() => setBusy(false)),
          "PDF를 만들고 있어요…",
        );
      }}
    >
      <Download className="size-3.5" />
      악보 모음 PDF 다운로드
    </Button>
  );
}

async function loadPdfImage(url: string): Promise<LoadedPdfImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImageElement(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("이미지 캔버스를 만들 수 없습니다.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
    image.src = src;
  });
}

function fillPdfPage(pdf: jsPDF, pageWidth: number, pageHeight: number, image: LoadedPdfImage) {
  const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (pageWidth - drawWidth) / 2;
  const offsetY = (pageHeight - drawHeight) / 2;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.addImage(image.dataUrl, "PNG", offsetX, offsetY, drawWidth, drawHeight, undefined, "FAST");
}

function buildPdfFileName(setlistTitle: string) {
  const safeTitle = setlistTitle.replace(/[\\/:*?"<>|]+/g, " ").trim() || "송리스트";
  return `${safeTitle}_악보모음.pdf`;
}
