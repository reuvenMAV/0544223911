import { z } from "zod";

export const MessageTypeSchema = z.enum([
  "choice",
  "text",
  "start",
  "end_lesson",
]);

export const CoachRequestSchema = z.object({
  learnerId: z.string().uuid(),
  sessionId: z.string().uuid(),
  messageType: MessageTypeSchema,
  choiceId: z.string().nullable().optional(),
  choiceText: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  locale: z.literal("he").default("he"),
});

export type CoachRequest = z.infer<typeof CoachRequestSchema>;

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

export const CoachResponseSchema = z.object({
  replyText: z.string().min(1),
  choices: z.array(ChoiceSchema).default([]),
  phase: CoachPhaseSchema,
  progressSaved: z.boolean(),
  meta: z
    .object({
      cefr: z.string().optional(),
      lessonNumber: z.number().int().nonnegative().optional(),
      sessionId: z.string().uuid().optional(),
      recapAvailable: z.boolean().optional(),
    })
    .default({}),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type CoachPhase = z.infer<typeof CoachPhaseSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: string;
};

export type LessonRecap = {
  sessionId: string;
  learnerId: string;
  words: string[];
  rules: string[];
  nextSteps: string[];
  cefr?: string;
  lessonNumber?: number;
  createdAt: string;
};

export type ProgressSnapshot = {
  currentPhase: CoachPhase;
  currentLessonNumber: number;
  onboardingStep: number;
  placementStep: number;
  planningStep: number;
  lessonStep: number;
  profile: {
    preferredName?: string;
    ageGroup?: "child" | "teen" | "adult";
    strongestLanguage: "he";
    estimatedCefr?: string;
    learningGoal?: string;
    learningFocus?: string;
    interests: string[];
    avoidedTopics: string[];
    lessonsPerWeek?: string;
    minutesPerLesson?: string;
  };
  placementScore: number;
  placementAnswers: Array<{ questionId: string; correct: boolean }>;
  vocabulary: Array<{
    item: string;
    meaning: string;
    status: "new" | "learning" | "review" | "acquired";
  }>;
  recentSessions: LessonRecap[];
  conversationHints: string[];
};
