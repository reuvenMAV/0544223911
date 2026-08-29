import type { CoachPhase } from "@/lib/schemas/coach-api";

export type {
  Choice,
  CoachPhase,
  CoachRequest,
  CoachResponse,
} from "@/lib/schemas/coach-api";

export {
  ChoiceSchema,
  CoachMetaSchema,
  CoachPhaseSchema,
  CoachRequestSchema,
  CoachResponseSchema,
  MessageTypeSchema,
} from "@/lib/schemas/coach-api";

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

import { z } from "zod";

export const LearnerIdSchema = z.string().uuid();
export const SessionIdSchema = z.string().uuid();
