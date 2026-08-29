import type { LessonRecap, ProgressSnapshot } from "@/lib/types";
import { createEmptyProgress } from "@/lib/progress";
import {
  FIXTURE_LEARNER_ID,
  FIXTURE_SESSION_ID,
} from "../fixtures/coach-payloads";

export function fixtureProgress(
  patch: Partial<ProgressSnapshot> = {},
): ProgressSnapshot {
  const base = createEmptyProgress();
  return {
    ...base,
    ...patch,
    profile: {
      ...base.profile,
      interests: ["סדרות"],
      learningGoal: "דיבור",
      ...patch.profile,
    },
  };
}

export function fixtureRecap(
  patch: Partial<LessonRecap> = {},
): LessonRecap {
  return {
    sessionId: FIXTURE_SESSION_ID,
    learnerId: FIXTURE_LEARNER_ID,
    words: ["home — בית"],
    rules: ["Present simple"],
    nextSteps: ["תרגלו שוב"],
    cefr: "A2",
    lessonNumber: 1,
    createdAt: "2026-08-29T10:00:00.000Z",
    ...patch,
  };
}
