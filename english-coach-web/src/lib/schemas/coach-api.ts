import { z } from "zod";
import { ACCEPTED_SCHEMA_VERSIONS } from "@/lib/versions";

export const ChannelSchema = z.enum(["web", "telegram"]);

export const TelegramContextSchema = z.object({
  telegramUserId: z.number().int().positive().nullable(),
  chatId: z.number().int().nullable(),
  updateId: z.number().int().positive().nullable(),
});

export const MessageTypeSchema = z.enum([
  "choice",
  "text",
  "start",
  "end_lesson",
]);

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  opensTextInput: z.boolean().optional(),
});

export const CoachPhaseSchema = z.enum([
  "onboarding",
  "placement",
  "planning",
  "lesson",
  "recap",
]);

export const CoachMetaSchema = z.object({
  cefr: z.string().optional(),
  lessonNumber: z.number().int().nonnegative().optional(),
  sessionId: z.string().uuid().optional(),
  recapAvailable: z.boolean().optional(),
  promptVersion: z.string().optional(),
  schemaVersion: z.string().optional(),
  workflowVersion: z.string().optional(),
  requestId: z.string().uuid().optional(),
  channel: ChannelSchema.optional(),
});

export const CoachRequestSchema = z.object({
  learnerId: z.string().uuid(),
  sessionId: z.string().uuid(),
  messageType: MessageTypeSchema,
  choiceId: z.string().nullable().optional(),
  choiceText: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  locale: z.literal("he").default("he"),
});

export const UnifiedCoachRequestSchema = CoachRequestSchema.extend({
  channel: ChannelSchema,
  requestId: z.string().uuid(),
  clientVersion: z.string().min(1),
  acceptedSchemaVersions: z
    .array(z.string())
    .default([...ACCEPTED_SCHEMA_VERSIONS]),
  telegram: TelegramContextSchema.default({
    telegramUserId: null,
    chatId: null,
    updateId: null,
  }),
});

export const CoachResponseSchema = z.object({
  replyText: z.string().min(1),
  choices: z.array(ChoiceSchema).default([]),
  phase: CoachPhaseSchema,
  progressSaved: z.boolean(),
  meta: CoachMetaSchema.default({}),
});

export type CoachRequest = z.infer<typeof CoachRequestSchema>;
export type UnifiedCoachRequest = z.infer<typeof UnifiedCoachRequestSchema>;
export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type CoachPhase = z.infer<typeof CoachPhaseSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type TelegramContext = z.infer<typeof TelegramContextSchema>;

const MAX_USER_TEXT_LENGTH = 2000;

/** Strip control chars and neutralize obvious HTML/script payloads. */
export function sanitizeUserText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_USER_TEXT_LENGTH);
  if (!trimmed) return null;
  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "");
}

export function sanitizeCoachRequest(
  input: CoachRequest,
): CoachRequest {
  return {
    ...input,
    choiceText: sanitizeUserText(input.choiceText),
    text: sanitizeUserText(input.text),
  };
}

export function parseCoachRequest(input: unknown) {
  const parsed = CoachRequestSchema.safeParse(input);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: sanitizeCoachRequest(parsed.data),
  };
}

export function parseUnifiedCoachRequest(input: unknown) {
  const parsed = UnifiedCoachRequestSchema.safeParse(input);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: sanitizeCoachRequest(parsed.data) as UnifiedCoachRequest,
  };
}

export function toCoachRequest(
  unified: UnifiedCoachRequest,
): CoachRequest {
  return {
    learnerId: unified.learnerId,
    sessionId: unified.sessionId,
    messageType: unified.messageType,
    choiceId: unified.choiceId,
    choiceText: unified.choiceText,
    text: unified.text,
    locale: unified.locale,
  };
}

export function parseCoachResponse(input: unknown) {
  return CoachResponseSchema.safeParse(input);
}

export function friendlyParseError(message = "תשובה לא תקינה מהשרת") {
  return {
    replyText: `${message}. אפשר לנסות שוב בעוד רגע.`,
    choices: [] as const,
    phase: "onboarding" as const,
    progressSaved: false as const,
    meta: {} as Record<string, never>,
  };
}
