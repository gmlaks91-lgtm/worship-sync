/** 공지 본문의 첫 줄을 제목, 나머지를 본문으로 분리해 게시판처럼 표시한다. */
export function splitTitleBody(content: string): { title: string | null; body: string } {
  const trimmed = content.trim();
  const newlineIndex = trimmed.indexOf("\n");
  if (newlineIndex === -1) {
    return { title: null, body: trimmed };
  }
  const title = trimmed.slice(0, newlineIndex).trim();
  const body = trimmed.slice(newlineIndex + 1).trim();
  if (!title || !body) {
    return { title: null, body: trimmed };
  }
  return { title, body };
}

/** 목록·위젯에서 한 줄로 보여줄 대표 문구(제목 우선, 없으면 본문 첫 줄). */
export function announcementHeadline(content: string): string {
  const { title, body } = splitTitleBody(content);
  const headline = (title ?? body).replace(/\s+/g, " ").trim();
  return headline || "(제목 없음)";
}
