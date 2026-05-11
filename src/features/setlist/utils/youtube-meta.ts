/**
 * YouTube oEmbed — 제목 미리보기·서버 저장용 제목 조회.
 */
export async function fetchYoutubeOEmbedTitle(videoPageUrl: string): Promise<string | null> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoPageUrl)}&format=json`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}
