import { z } from "zod";

import { TEAM_ROLE_OPTIONS } from "@/lib/team-roles";

const teamRoleCodes = TEAM_ROLE_OPTIONS.map((r) => r.code) as [
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

export const parsedScheduleTrackSchema = z.object({
  title: z.string().min(1),
  youtubeUrl: z.string().optional().nullable(),
});

export const parsedScheduleLineupSchema = z.object({
  roleCode: z.enum(teamRoleCodes),
  memberNames: z.array(z.string()),
});

export const parsedScheduleSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .default("19:00"),
  kind: z.enum(["practice", "worship", "social"]).optional(),
  tracks: z.array(parsedScheduleTrackSchema),
  lineup: z.array(parsedScheduleLineupSchema),
});

export type ParsedScheduleResult = z.infer<typeof parsedScheduleSchema>;

export const parseScheduleRequestSchema = z.object({
  text: z.string().trim().min(10, "붙여넣을 텍스트가 너무 짧습니다.").max(12000),
});
