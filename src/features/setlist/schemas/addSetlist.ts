import { z } from "zod";

import { MULTI_MEMBER_ROLE_CODES, TEAM_ROLE_OPTIONS } from "@/lib/team-roles";
import { getYoutubeVideoId } from "@/features/setlist/utils/youtube";

const teamRoleCodeValues = TEAM_ROLE_OPTIONS.map((r) => r.code) as [
  "L",
  "M",
  "S",
  "D",
  "A/G",
  "B/G",
  "E/G",
  "V",
  "STAFF",
];

const roleCodeSchema = z.enum(teamRoleCodeValues);

export const addSetlistTrackSchema = z.object({
  title: z.string().trim().min(1, "곡 제목을 입력하세요"),
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL을 입력하세요")
    .refine((u) => !!getYoutubeVideoId(u), "유효하지 않은 YouTube URL입니다"),
});

export const lineupAssignSchema = z
  .object({
    roleCode: roleCodeSchema,
    memberIds: z.array(z.string().uuid()),
  })
  .superRefine((value, ctx) => {
    const isMulti = MULTI_MEMBER_ROLE_CODES.includes(value.roleCode);
    if (!isMulti && value.memberIds.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.roleCode} 역할은 한 명만 선택할 수 있습니다`,
      });
    }
  });

export const addSetlistFormSchema = z.object({
  title: z.string().min(1, "송리스트 제목을 입력하세요"),
  eventDate: z.date(),
  tracks: z.array(addSetlistTrackSchema).min(1, "최소 한 곡 이상 추가하세요"),
  lineup: z.array(lineupAssignSchema),
});

export type AddSetlistFormValues = z.infer<typeof addSetlistFormSchema>;

export const createPrepSetlistPayloadSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  tracks: z.array(addSetlistTrackSchema).min(1),
  lineup: z.array(lineupAssignSchema),
});

export type CreatePrepSetlistPayload = z.infer<typeof createPrepSetlistPayloadSchema>;
