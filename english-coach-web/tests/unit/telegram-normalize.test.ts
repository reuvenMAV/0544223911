import { describe, expect, it } from "vitest";
import {
  classifyTelegramUpdate,
  buildCoachRequestFromTelegram,
} from "@/lib/telegram/normalize";
import { FIXTURE_LEARNER_ID, FIXTURE_SESSION_ID } from "../fixtures/coach-payloads";

const learner = {
  id: "row-1",
  telegramUserId: 12345,
  learnerId: FIXTURE_LEARNER_ID,
  chatId: 99,
  status: "active" as const,
  locale: "he",
  awaitingText: false,
  sessionId: FIXTURE_SESSION_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("telegram normalize", () => {
  it("classifies commands, callbacks, and text", () => {
    expect(
      classifyTelegramUpdate({
        update_id: 1,
        message: { message_id: 1, chat: { id: 1, type: "private" }, text: "/start" },
      }),
    ).toEqual({ kind: "command", command: "start" });

    expect(
      classifyTelegramUpdate({
        update_id: 2,
        callback_query: {
          id: "cb1",
          from: { id: 1 },
          data: "c:a1b2c3d4",
        },
      }),
    ).toEqual({ kind: "callback", callbackToken: "a1b2c3d4" });
  });

  it("builds start coach request", () => {
    const req = buildCoachRequestFromTelegram({
      learner,
      classified: { kind: "command", command: "start" },
      forceStart: true,
    });
    expect(req?.messageType).toBe("start");
    expect(req?.learnerId).toBe(FIXTURE_LEARNER_ID);
  });
});
