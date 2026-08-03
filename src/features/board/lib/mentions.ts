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

/** 본문에서 @이름과 일치하는 멤버 id 목록을 추출한다. */
export function extractMentionIdsFromBody(body: string, members: MentionMember[]): string[] {
  if (!body || members.length === 0) return [];

  const nameToId = new Map(
    members
      .filter((m) => m.username.trim())
      .map((m) => [m.username.trim().toLowerCase(), m.id] as const),
  );
  const names = [...new Set(members.map((m) => m.username.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (names.length === 0) return [];

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(?:${escaped.join("|")})`, "gi");
  const ids = new Set<string>();
  for (const match of body.matchAll(re)) {
    const name = match[0].slice(1);
    const id = nameToId.get(name.toLowerCase());
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * 커서 바로 앞의 `@검색어` 구간.
 * `@` 앞이 공백/줄시작이어야 하고, 검색어에는 공백·개행이 없어야 한다.
 */
export function getActiveAtQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;

  const prev = at === 0 ? " " : before[at - 1];
  if (prev && !/[\s([{（「『]/.test(prev)) return null;

  const query = before.slice(at + 1);
  if (/[\s\n]/.test(query)) return null;
  if (query.length > 40) return null;

  return { start: at, query };
}

export function filterMembersByQuery(members: MentionMember[], query: string): MentionMember[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? members.filter((m) => m.username.toLowerCase().includes(q))
    : members;
  return list.slice(0, 8);
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
