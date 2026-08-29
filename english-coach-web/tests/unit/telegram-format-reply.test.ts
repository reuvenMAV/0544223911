import { describe, expect, it } from "vitest";
import { formatCoachResponseForTelegram } from "@/lib/telegram/format-reply";
import { FIXTURE_LEARNER_ID, FIXTURE_SESSION_ID } from "../fixtures/coach-payloads";

describe("telegram format reply", () => {
  it("formats choices as inline keyboard with short callback tokens", async () => {
    const payload = await formatCoachResponseForTelegram(
      {
        replyText: "מה מעניין אותך?",
        choices: [
          { id: "movies", label: "סרטים" },
          { id: "music", label: "מוזיקה" },
          { id: "interest-other", label: "אחר / הערות", opensTextInput: true },
        ],
        phase: "onboarding",
        progressSaved: false,
        meta: {},
      },
      {
        learnerId: FIXTURE_LEARNER_ID,
        sessionId: FIXTURE_SESSION_ID,
        chatId: 123,
      },
    );

    expect(payload.chat_id).toBe(123);
    expect(payload.reply_markup?.inline_keyboard.length).toBeGreaterThan(0);
    for (const row of payload.reply_markup?.inline_keyboard ?? []) {
      for (const button of row) {
        expect(button.callback_data.startsWith("c:")).toBe(true);
        expect(button.callback_data.length).toBeLessThanOrEqual(64);
      }
    }
  });
});
