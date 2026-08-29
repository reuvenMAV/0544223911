import { describe, expect, it } from "vitest";
import { runLocalCoach } from "@/lib/coach/mock-engine";
import { loadProgress } from "@/lib/progress";

const learnerId = () => crypto.randomUUID();
const sessionId = () => crypto.randomUUID();

async function clickChoice(
  learner: string,
  session: string,
  label: string,
) {
  return runLocalCoach({
    learnerId: learner,
    sessionId: session,
    messageType: "choice",
    choiceId: "1",
    choiceText: label,
    locale: "he",
  });
}

describe("mock coach phases", () => {
  it("starts in onboarding with other choice last", async () => {
    const res = await runLocalCoach({
      learnerId: learnerId(),
      sessionId: sessionId(),
      messageType: "start",
      locale: "he",
    });
    expect(res.phase).toBe("onboarding");
    expect(res.choices.at(-1)?.id).toBe("other");
    expect(res.choices.at(-1)?.opensTextInput).toBe(true);
  });

  it("advances through onboarding to placement", async () => {
    const l = learnerId();
    const s = sessionId();
    await runLocalCoach({ learnerId: l, sessionId: s, messageType: "start", locale: "he" });
    await clickChoice(l, s, "סדרות וסרטים");
    await clickChoice(l, s, "קומדיה");
    await clickChoice(l, s, "מוזיקה");
    await clickChoice(l, s, "מבוגר/ת");
    await clickChoice(l, s, "לדבר בביטחון");
    await clickChoice(l, s, "הכול");
    const toPlacement = await clickChoice(l, s, "הכול מדויק — אפשר לעבור לבדיקת הרמה");
    expect(toPlacement.phase).toBe("placement");
  });

  it("handles end_lesson with progressSaved", async () => {
    const l = learnerId();
    const s = sessionId();
    const res = await runLocalCoach({
      learnerId: l,
      sessionId: s,
      messageType: "end_lesson",
      text: "סיימתי את השיעור",
      locale: "he",
    });
    expect(res.progressSaved).toBe(true);
    expect(res.phase).toBe("recap");
  });

  it("persists progress between turns", async () => {
    const l = learnerId();
    const s = sessionId();
    await runLocalCoach({ learnerId: l, sessionId: s, messageType: "start", locale: "he" });
    await clickChoice(l, s, "סדרות וסרטים");
    const progress = await loadProgress(l);
    expect(progress.onboardingStep).toBeGreaterThan(1);
  });
});
