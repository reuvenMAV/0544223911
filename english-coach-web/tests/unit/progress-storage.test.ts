import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createEmptyProgress,
  loadProgress,
  saveProgress,
  __resetProgressStoresForTests,
} from "@/lib/progress";

describe("progress storage (memory)", () => {
  beforeEach(() => {
    __resetProgressStoresForTests();
    vi.unstubAllEnvs();
  });

  it("stores and reloads progress in memory", async () => {
    const learnerId = crypto.randomUUID();
    const progress = createEmptyProgress();
    progress.onboardingStep = 2;
    await saveProgress(learnerId, progress);
    const loaded = await loadProgress(learnerId);
    expect(loaded.onboardingStep).toBe(2);
  });
});
