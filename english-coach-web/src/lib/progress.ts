import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { CoachPhase, LessonRecap, ProgressSnapshot } from "@/lib/types";

const memoryProgress = new Map<string, ProgressSnapshot>();
const memoryRecaps = new Map<string, LessonRecap>();

/** Test-only reset for deterministic isolation. */
export function __resetProgressStoresForTests() {
  memoryProgress.clear();
  memoryRecaps.clear();
}

export function createEmptyProgress(): ProgressSnapshot {
  return {
    currentPhase: "onboarding",
    currentLessonNumber: 0,
    onboardingStep: 0,
    placementStep: 0,
    planningStep: 0,
    lessonStep: 0,
    profile: {
      strongestLanguage: "he",
      interests: [],
      avoidedTopics: [],
    },
    placementScore: 0,
    placementAnswers: [],
    vocabulary: [],
    recentSessions: [],
    conversationHints: [],
  };
}

export async function ensureLearner(learnerId: string, locale = "he") {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("learners").upsert(
    {
      id: learnerId,
      locale,
    },
    { onConflict: "id" },
  );
}

export async function loadProgress(
  learnerId: string,
): Promise<ProgressSnapshot> {
  if (!isSupabaseConfigured()) {
    return memoryProgress.get(learnerId) ?? createEmptyProgress();
  }

  const supabase = getSupabaseAdmin()!;
  await ensureLearner(learnerId);

  const { data, error } = await supabase
    .from("progress")
    .select("progress_json, current_phase, current_lesson_number")
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (error || !data?.progress_json) {
    return createEmptyProgress();
  }

  return data.progress_json as ProgressSnapshot;
}

export async function saveProgress(
  learnerId: string,
  progress: ProgressSnapshot,
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    memoryProgress.set(learnerId, progress);
    return true;
  }

  const supabase = getSupabaseAdmin()!;
  await ensureLearner(learnerId, "he");

  const { error } = await supabase.from("progress").upsert(
    {
      learner_id: learnerId,
      current_phase: progress.currentPhase,
      current_lesson_number: progress.currentLessonNumber,
      progress_json: progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "learner_id" },
  );

  if (!error) {
    await supabase
      .from("learners")
      .update({
        cefr_level: progress.profile.estimatedCefr ?? null,
        learning_goal: progress.profile.learningGoal ?? null,
        interests: progress.profile.interests,
      })
      .eq("id", learnerId);
  }

  return !error;
}

export async function saveSessionRecap(recap: LessonRecap): Promise<boolean> {
  memoryRecaps.set(recap.sessionId, recap);

  if (!isSupabaseConfigured()) return true;

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from("sessions").upsert(
    {
      id: recap.sessionId,
      learner_id: recap.learnerId,
      started_at: recap.createdAt,
      ended_at: new Date().toISOString(),
      summary_json: recap,
      status: "completed",
    },
    { onConflict: "id" },
  );

  return !error;
}

export async function getSessionRecap(
  sessionId: string,
): Promise<LessonRecap | null> {
  if (memoryRecaps.has(sessionId)) {
    return memoryRecaps.get(sessionId) ?? null;
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase
    .from("sessions")
    .select("summary_json")
    .eq("id", sessionId)
    .maybeSingle();

  return (data?.summary_json as LessonRecap | undefined) ?? null;
}

export function shouldCheckpoint(phase: CoachPhase, event: string): boolean {
  if (event === "end_lesson") return true;
  if (event === "plan_approved") return true;
  if (event === "profile_changed") return true;
  if (event === "lesson_complete") return true;
  if (phase === "recap") return true;
  return false;
}
