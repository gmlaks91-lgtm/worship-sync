export function extractYouTubeVideoId(input: string) {
  const value = input.trim();
  if (!value) return null;

  const normalizeVideoId = (candidate: string | null | undefined) => {
    if (!candidate) return null;
    const cleaned = candidate.trim();
    return /^[a-zA-Z0-9_-]{11}$/.test(cleaned) ? cleaned : null;
  };

  const fromPath = (pathname: string) => pathname.split("/").filter(Boolean);

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = fromPath(url.pathname);

    if (host === "youtu.be") {
      const idFromPath = normalizeVideoId(path[0]);
      if (idFromPath) return idFromPath;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromV = normalizeVideoId(url.searchParams.get("v"));
      if (fromV) return fromV;

      const markerIndex = path.findIndex((segment) =>
        segment === "shorts" || segment === "embed" || segment === "live",
      );
      if (markerIndex !== -1) {
        const idFromMarker = normalizeVideoId(path[markerIndex + 1]);
        if (idFromMarker) return idFromMarker;
      }
    }
  } catch {
    // URL이 아니면 아래 정규식으로 처리
  }

  const match = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/);
  if (match?.[1]) return match[1];

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  return null;
}

export function youtubeVideoEmbedUrl(videoId: string) {
  const encoded = encodeURIComponent(videoId);
  return `https://www.youtube.com/embed/${encoded}?loop=1&playlist=${encoded}`;
}
