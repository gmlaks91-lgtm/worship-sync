import "server-only";

import { generateObject } from "ai";

import { parsedScheduleSchema, type ParsedScheduleResult } from "@/features/schedule/lib/parsed-schedule-schema";
import { getGeminiModel } from "@/lib/ai/google";

const EXAMPLE = `
[찬양팀 일정 안내]
📅 3월 15일(토) 오후 2시 연습
📍 OO교회 2층

🎵 셋리스트
1. 주님만이 - https://youtu.be/abc123
2. 놀라운 은혜 https://www.youtube.com/watch?v=def456

👥 라인업
L: 김철수
M: 이영희
V: 박민수, 최지우
`.trim();

export async function parseScheduleFromText(text: string): Promise<ParsedScheduleResult> {
  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: parsedScheduleSchema,
    system: `당신은 한국 교회 찬양팀 카카오톡 일정 공지를 구조화하는 도우미입니다.
입력 텍스트에서 아래 JSON 필드만 정확히 채우세요.

규칙:
- eventDate는 YYYY-MM-DD (한국어 날짜·요일을 해석, 연도가 없으면 가장 가까운 미래 날짜로 추정)
- eventTime은 HH:mm 24시간제 (없으면 연습 14:00, 예배 11:00, 모임 18:00 등 맥락 추정, 불명확하면 19:00)
- kind: 연습→practice, 예배/주일/청년예배→worship, 회식/모임→social
- tracks: 곡 순서 유지, youtubeUrl은 youtu.be / youtube.com / m.youtube 등 전체 URL (없으면 null)
- lineup.roleCode: L,M,S,D,A/G,B/G,E/G,V,STAFF 중 하나
- lineup.memberNames: 해당 역할에 배정된 이름만 (직책 라벨 제외)
- 역할이 텍스트에 없으면 해당 roleCode는 빈 memberNames 배열
- 제목(title)은 일정의 대표 제목 한 줄

역할 코드 참고: L=리더, M=메인건반, S=세컨건반, D=드럼, A/G=어쿠스틱, B/G=베이스, E/G=일렉, V=보컬, STAFF=스텝`,
    prompt: `다음 카카오톡 일정 공지를 분석해 JSON으로 추출하세요.

--- 입력 ---
${text}

--- 참고 형식 예시 ---
${EXAMPLE}`,
  });

  return object;
}
