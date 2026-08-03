import type { PostCategory } from "@/types/database";

export type BoardTopic =
  | "schedule"
  | "notice"
  | "urgent"
  | "setlist"
  | "other"
  | "question"
  | "share"
  | "prayer"
  | "review"
  | "gratitude";

export type BoardTopicOption = {
  value: BoardTopic;
  label: string;
};

const ANNOUNCEMENT_TOPICS: BoardTopicOption[] = [
  { value: "schedule", label: "일정" },
  { value: "notice", label: "안내" },
  { value: "urgent", label: "긴급" },
  { value: "setlist", label: "콘티" },
  { value: "other", label: "기타" },
];

const FREE_BOARD_TOPICS: BoardTopicOption[] = [
  { value: "question", label: "질문" },
  { value: "share", label: "나눔" },
  { value: "prayer", label: "기도" },
  { value: "review", label: "후기" },
  { value: "gratitude", label: "감사" },
  { value: "other", label: "기타" },
];

const ALL_TOPICS = new Map<BoardTopic, string>(
  [...ANNOUNCEMENT_TOPICS, ...FREE_BOARD_TOPICS].map((t) => [t.value, t.label]),
);

export function getTopicsForCategory(category: PostCategory): BoardTopicOption[] {
  if (category === "prayer") return ANNOUNCEMENT_TOPICS;
  if (category === "general") return FREE_BOARD_TOPICS;
  return [];
}

export function isValidTopicForCategory(
  category: PostCategory,
  topic: string | null | undefined,
): topic is BoardTopic {
  if (!topic) return false;
  return getTopicsForCategory(category).some((t) => t.value === topic);
}

export function topicLabel(topic: string | null | undefined): string | null {
  if (!topic) return null;
  return ALL_TOPICS.get(topic as BoardTopic) ?? null;
}

export function defaultTopicForCategory(category: PostCategory): BoardTopic | null {
  const topics = getTopicsForCategory(category);
  return topics[0]?.value ?? null;
}
