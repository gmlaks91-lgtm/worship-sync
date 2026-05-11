/**
 * YouTube URL에서 video id 추출 (watch, short, youtu.be).
 */
export function getYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortIdx = parts.indexOf("shorts");
      if (shortIdx !== -1 && parts[shortIdx + 1]) return parts[shortIdx + 1];
    }
  } catch {
    const watch = trimmed.match(/[?&]v=([^&]+)/);
    if (watch?.[1]) return watch[1];
    const shortUrl = trimmed.match(/youtu\.be\/([^?&#]+)/);
    if (shortUrl?.[1]) return shortUrl[1];
  }

  return null;
}

export function getYoutubeThumbnailUrl(videoId: string, quality: "hq" | "mq" | "sd" = "mq") {
  const map = { hq: "hqdefault", mq: "mqdefault", sd: "sddefault" } as const;
  return `https://img.youtube.com/vi/${videoId}/${map[quality]}.jpg`;
}

/** DB·중복 판별용 정규화 URL */
export function toYoutubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
