export function extensionFromFile(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  if (dot !== -1) {
    const ext = name.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }
  const t = file.type;
  if (t === "application/pdf") return "pdf";
  if (t === "image/png") return "png";
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  return "bin";
}

export function isPdfUrl(url: string) {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".pdf");
}

export function isImageUrl(url: string) {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(png|jpe?g|gif|webp)$/i.test(path);
}
