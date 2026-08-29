import { describe, expect, it } from "vitest";
import {
  parseCoachRequest,
  parseCoachResponse,
  sanitizeUserText,
} from "@/lib/validation";
import {
  choicePayload,
  endLessonPayload,
  FIXTURE_LEARNER_ID,
  textPayload,
  validCoachRequest,
} from "../fixtures/coach-payloads";

describe("coach api validation", () => {
  it("accepts start, choice, text and end_lesson payloads", () => {
    expect(parseCoachRequest(validCoachRequest).success).toBe(true);
    expect(parseCoachRequest(choicePayload).success).toBe(true);
    expect(parseCoachRequest(textPayload).success).toBe(true);
    expect(parseCoachRequest(endLessonPayload).success).toBe(true);
  });

  it("rejects invalid learnerId and messageType", () => {
    expect(
      parseCoachRequest({ ...validCoachRequest, learnerId: "bad" }).success,
    ).toBe(false);
    expect(
      parseCoachRequest({ ...validCoachRequest, messageType: "bad" }).success,
    ).toBe(false);
  });

  it("sanitizes dangerous text input", () => {
    const parsed = parseCoachRequest({
      ...textPayload,
      text: '<script>alert("x")</script>hello',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.text).toBe("hello");
      expect(parsed.data.text).not.toContain("<script");
    }
  });

  it("strips html tags from free text", () => {
    expect(sanitizeUserText("<b>hello</b>")).toBe("hello");
    expect(sanitizeUserText("   ")).toBeNull();
  });

  it("validates coach responses", () => {
    const ok = parseCoachResponse({
      replyText: "שאלה",
      choices: [{ id: "other", label: "אחר / הערות", opensTextInput: true }],
      phase: "lesson",
      progressSaved: true,
      meta: { cefr: "A2", lessonNumber: 1 },
    });
    expect(ok.success).toBe(true);

    expect(parseCoachResponse({ replyText: "" }).success).toBe(false);
    expect(parseCoachResponse({ broken: true }).success).toBe(false);
  });

  it("defaults locale to he", () => {
    const parsed = parseCoachRequest({
      learnerId: FIXTURE_LEARNER_ID,
      sessionId: "22222222-2222-4222-8222-222222222222",
      messageType: "start",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.locale).toBe("he");
  });
});
