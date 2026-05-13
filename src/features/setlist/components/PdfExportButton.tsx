"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { toastError, toastPromise } from "@/lib/app-toast";

export const SETLIST_PRINT_ROOT_ID = "setlist-chord-print-root";

type PdfExportButtonProps = {
  fileName: string;
};

export function PdfExportButton({ fileName }: PdfExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const runExport = useCallback(async () => {
    const el = document.getElementById(SETLIST_PRINT_ROOT_ID);
    if (!el) {
      toastError("인쇄 영역을 찾을 수 없습니다.");
      return;
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;

    let drawW = maxW;
    let drawH = (canvas.height * drawW) / canvas.width;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = (canvas.width * drawH) / canvas.height;
    }

    pdf.addImage(imgData, "PNG", margin, margin, drawW, drawH);
    pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  }, [fileName]);

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
      콘티 PDF 다운로드
    </Button>
  );
}
