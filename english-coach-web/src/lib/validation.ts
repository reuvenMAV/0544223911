import { CoachRequestSchema, CoachResponseSchema } from "@/lib/types";

export function parseCoachRequest(input: unknown) {
  return CoachRequestSchema.safeParse(input);
}

export function parseCoachResponse(input: unknown) {
  return CoachResponseSchema.safeParse(input);
}

export function friendlyParseError(message = "תשובה לא תקינה מהשרת"): {
  replyText: string;
  choices: never[];
  phase: "onboarding";
  progressSaved: false;
  meta: Record<string, never>;
} {
  return {
    replyText: `${message}. אפשר לנסות שוב בעוד רגע.`,
    choices: [],
    phase: "onboarding",
    progressSaved: false,
    meta: {},
  };
}
