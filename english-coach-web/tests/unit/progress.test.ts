import { describe, expect, it } from "vitest";
import { mergeProgressSnapshot } from "@/lib/progress-merge";
import { createEmptyProgress, shouldCheckpoint } from "@/lib/progress";
import { fixtureProgress } from "../fixtures/progress";

describe("progress merge and checkpoints", () => {
  it("merges profile and arrays without dropping existing fields", () => {
    const base = fixtureProgress({
      profile: {
        strongestLanguage: "he",
        interests: ["music"],
        avoidedTopics: ["work"],
        learningGoal: "travel",
      },
    });

    const merged = mergeProgressSnapshot(base, {
      currentPhase: "lesson",
      profile: {
        strongestLanguage: "he",
        interests: ["music", "series"],
        avoidedTopics: ["work"],
        learningFocus: "speaking",
      },
    });

    expect(merged.currentPhase).toBe("lesson");
    expect(merged.profile.interests).toEqual(["music", "series"]);
    expect(merged.profile.avoidedTopics).toEqual(["work"]);
    expect(merged.profile.learningGoal).toBe("travel");
    expect(merged.profile.learningFocus).toBe("speaking");
  });

  it("creates empty progress with onboarding phase", () => {
    const empty = createEmptyProgress();
    expect(empty.currentPhase).toBe("onboarding");
    expect(empty.onboardingStep).toBe(0);
  });

  it("flags checkpoint events", () => {
    expect(shouldCheckpoint("lesson", "end_lesson")).toBe(true);
    expect(shouldCheckpoint("planning", "plan_approved")).toBe(true);
    expect(shouldCheckpoint("recap", "anything")).toBe(true);
    expect(shouldCheckpoint("onboarding", "noop")).toBe(false);
  });
});
