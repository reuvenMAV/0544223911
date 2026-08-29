import { describe, expect, it } from "vitest";
import { selectCocaSample } from "../src/lib/coca";
import { runLocalCoach } from "../src/lib/coach/mock-engine";
import { parseCoachRequest, parseCoachResponse } from "../src/lib/validation";

describe("validation", () => {
  it("accepts a valid coach request", () => {
    const parsed = parseCoachRequest({
      learnerId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      messageType: "start",
      locale: "he",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid response payloads safely", () => {
    const parsed = parseCoachResponse({ replyText: "" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a full coach response", () => {
    const parsed = parseCoachResponse({
      replyText: "שאלה",
      choices: [
        { id: "1", label: "א" },
        { id: "other", label: "אחר / הערות", opensTextInput: true },
      ],
      phase: "onboarding",
      progressSaved: true,
      meta: {},
    });
    expect(parsed.success).toBe(true);
  });
});

describe("coca sample", () => {
  it("returns a limited relevant sample", () => {
    const sample = selectCocaSample({
      cefr: "A2",
      interests: ["series", "music"],
      limit: 5,
    });
    expect(sample.length).toBeLessThanOrEqual(5);
    expect(sample[0]?.word).toBeTruthy();
  });
});

describe("local coach flow", () => {
  it("starts onboarding with clickable choices ending in other", async () => {
    const learnerId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const res = await runLocalCoach({
      learnerId,
      sessionId,
      messageType: "start",
      locale: "he",
    });
    expect(res.phase).toBe("onboarding");
    expect(res.choices.length).toBeGreaterThan(2);
    expect(res.choices.at(-1)?.id).toBe("other");
    expect(res.choices.at(-1)?.opensTextInput).toBe(true);
  });

  it("persists progress across turns", async () => {
    const learnerId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    await runLocalCoach({
      learnerId,
      sessionId,
      messageType: "start",
      locale: "he",
    });
    const second = await runLocalCoach({
      learnerId,
      sessionId,
      messageType: "choice",
      choiceId: "1",
      choiceText: "סדרות וסרטים",
      locale: "he",
    });
    expect(second.replyText).toContain("סדרות");
    expect(second.progressSaved).toBe(true);
  });
});
