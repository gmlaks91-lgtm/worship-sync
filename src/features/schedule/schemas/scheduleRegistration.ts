import { z } from "zod";

import {
  addSetlistFormSchema,
  lineupAssignSchema,
  addSetlistTrackSchema,
} from "@/features/setlist/schemas/addSetlist";

export const scheduleRegistrationFormSchema = addSetlistFormSchema.extend({
  kind: z.enum(["practice", "worship", "social"]),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/, "시간 형식이 올바르지 않습니다 (HH:mm)"),
});

export type ScheduleRegistrationFormValues = z.infer<typeof scheduleRegistrationFormSchema>;

export const createScheduleWithSetlistPayloadSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["practice", "worship", "social"]),
  startsAt: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tracks: z.array(addSetlistTrackSchema).min(1),
  lineup: z.array(lineupAssignSchema),
});

export type CreateScheduleWithSetlistPayload = z.infer<typeof createScheduleWithSetlistPayloadSchema>;
