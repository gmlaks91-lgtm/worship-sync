export type MentionMember = {
  id: string;
  username: string;
};

/** 본문에 @이름 토큰을 넣거나 유지한다. */
export function appendMentionToken(body: string, username: string): string {
  const token = `@${username.trim()}`;
  if (!username.trim()) return body;
  if (body.includes(token)) return body;
  const trimmed = body.trimEnd();
  return trimmed ? `${trimmed} ${token}` : token;
}

export function removeMentionToken(body: string, username: string): string {
  const token = `@${username.trim()}`;
  if (!username.trim()) return body;
  return body
    .replaceAll(token, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** @이름 패턴을 찾아 멘션/일반 텍스트 조각으로 나눈다. */
export function splitMentionSegments(
  text: string,
  members: MentionMember[],
): Array<{ type: "text" | "mention"; value: string; userId?: string }> {
  if (!text) return [];

  const nameToId = new Map(
    members
      .filter((m) => m.username.trim())
      .map((m) => [m.username.trim(), m.id] as const),
  );

  // 긴 이름 우선 (부분 문자열 충돌 방지)
  const names = [...nameToId.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) {
    return [{ type: "text", value: text }];
  }

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(?:${escaped.join("|")})`, "g");

  const segments: Array<{ type: "text" | "mention"; value: string; userId?: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const raw = match[0];
    const name = raw.slice(1);
    segments.push({
      type: "mention",
      value: raw,
      userId: nameToId.get(name),
    });
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}
