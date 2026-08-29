import type { ProgressSnapshot } from "@/lib/types";

/**
 * Merge a partial progress update without dropping unknown existing fields.
 */
export function mergeProgressSnapshot(
  existing: ProgressSnapshot,
  patch: Partial<ProgressSnapshot>,
): ProgressSnapshot {
  return {
    ...existing,
    ...patch,
    profile: {
      ...existing.profile,
      ...patch.profile,
      interests: patch.profile?.interests ?? existing.profile.interests,
      avoidedTopics:
        patch.profile?.avoidedTopics ?? existing.profile.avoidedTopics,
    },
    placementAnswers: patch.placementAnswers ?? existing.placementAnswers,
    vocabulary: patch.vocabulary ?? existing.vocabulary,
    recentSessions: patch.recentSessions ?? existing.recentSessions,
    conversationHints: patch.conversationHints ?? existing.conversationHints,
  };
}
