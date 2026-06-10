export function extractYouTubePlaylistId(input: string) {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const listId = url.searchParams.get("list");
    if (listId) return listId;
  } catch {
    // URL이 아니면 아래에서 ID 패턴으로 처리
  }

  const listFromQuery = value.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1];
  if (listFromQuery) return listFromQuery;

  if (/^[a-zA-Z0-9_-]+$/.test(value)) {
    return value;
  }

  return null;
}

export function youtubePlaylistEmbedUrl(playlistId: string) {
  return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&loop=1`;
}
