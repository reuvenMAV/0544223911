import { describe, expect, it, vi } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { processTelegramUpdate } from "@/lib/telegram/processor";
import {
  __resetTelegramStoresForTests,
  createLinkCode,
  getTelegramLearner,
  saveCallbackToken,
} from "@/lib/telegram/store";
import { encodeCallbackData } from "@/lib/telegram/callback-data";
import type { CoachRequest, CoachResponse } from "@/lib/types";

const BOT_ID = "test-bot";
const TELEGRAM_USER = 424242;
const CHAT_ID = 515151;

function mockCoachResponse(overrides?: Partial<CoachResponse>): CoachResponse {
  return {
    replyText: "שלום! מה מעניין אותך?",
    choices: [
      { id: "movies", label: "סרטים" },
      { id: "interest-other", label: "אחר / הערות", opensTextInput: true },
    ],
    phase: "onboarding",
    progressSaved: true,
    meta: {},
    ...overrides,
  };
}

describe("telegram processor", () => {
  const runCoachFn = vi.fn(async (_req: CoachRequest) => mockCoachResponse());

  it("handles /start for a new Telegram user", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();

    const result = await processTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    if (result.kind === "reply") {
      expect(result.payload.chat_id).toBe(CHAT_ID);
      expect(runCoachFn).toHaveBeenCalledOnce();
    }
    const learner = await getTelegramLearner(TELEGRAM_USER);
    expect(learner?.status).toBe("active");
  });

  it("handles /start for an existing Telegram user", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();

    await processTelegramUpdate(
      {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    const firstLearner = await getTelegramLearner(TELEGRAM_USER);
    runCoachFn.mockClear();

    const second = await processTelegramUpdate(
      {
        update_id: 3,
        message: {
          message_id: 3,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(second.kind).toBe("reply");
    const secondLearner = await getTelegramLearner(TELEGRAM_USER);
    expect(secondLearner?.learnerId).toBe(firstLearner?.learnerId);
  });

  it("handles inline keyboard choice", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();
    await processTelegramUpdate(
      {
        update_id: 10,
        message: {
          message_id: 10,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );
    const learner = await getTelegramLearner(TELEGRAM_USER);
    const token = "deadbeef";
    await saveCallbackToken({
      token,
      learnerId: learner!.learnerId,
      sessionId: learner!.sessionId!,
      choiceId: "movies",
    });
    runCoachFn.mockClear();

    const result = await processTelegramUpdate(
      {
        update_id: 11,
        callback_query: {
          id: "cb1",
          from: { id: TELEGRAM_USER },
          message: { chat: { id: CHAT_ID }, message_id: 11 },
          data: encodeCallbackData(token),
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    expect(runCoachFn).toHaveBeenCalledOnce();
    const payload = runCoachFn.mock.calls[0]?.[0] as CoachRequest;
    expect(payload?.messageType).toBe("choice");
    expect(payload?.choiceId).toBe("movies");
  });

  it("asks for free text after other choice", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();
    await processTelegramUpdate(
      {
        update_id: 20,
        message: {
          message_id: 20,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );
    const learner = await getTelegramLearner(TELEGRAM_USER);
    const token = "cafebabe";
    await saveCallbackToken({
      token,
      learnerId: learner!.learnerId,
      sessionId: learner!.sessionId!,
      choiceId: "interest-other",
    });

    const result = await processTelegramUpdate(
      {
        update_id: 21,
        callback_query: {
          id: "cb2",
          from: { id: TELEGRAM_USER },
          message: { chat: { id: CHAT_ID }, message_id: 21 },
          data: encodeCallbackData(token),
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    if (result.kind === "reply") {
      expect(result.payload.text).toContain("חופשי");
    }
    const updated = await getTelegramLearner(TELEGRAM_USER);
    expect(updated?.awaitingText).toBe(true);
  });

  it("handles text after other selection", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();
    await processTelegramUpdate(
      {
        update_id: 30,
        message: {
          message_id: 30,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );
    const learner = await getTelegramLearner(TELEGRAM_USER);
    const token = "feedface";
    await saveCallbackToken({
      token,
      learnerId: learner!.learnerId,
      sessionId: learner!.sessionId!,
      choiceId: "interest-other",
    });
    await processTelegramUpdate(
      {
        update_id: 31,
        callback_query: {
          id: "cb3",
          from: { id: TELEGRAM_USER },
          message: { chat: { id: CHAT_ID }, message_id: 31 },
          data: encodeCallbackData(token),
        },
      },
      { botId: BOT_ID, runCoachFn },
    );
    runCoachFn.mockClear();

    const result = await processTelegramUpdate(
      {
        update_id: 32,
        message: {
          message_id: 32,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "אני אוהב מוזיקה",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    const payload = runCoachFn.mock.calls[0]?.[0] as CoachRequest;
    expect(payload?.messageType).toBe("text");
    expect(payload?.text).toBe("אני אוהב מוזיקה");
  });

  it("returns /progress summary", async () => {
    __resetTelegramStoresForTests();
    await processTelegramUpdate(
      {
        update_id: 40,
        message: {
          message_id: 40,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    const result = await processTelegramUpdate(
      {
        update_id: 41,
        message: {
          message_id: 41,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/progress",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
  });

  it("handles /stop", async () => {
    __resetTelegramStoresForTests();
    await processTelegramUpdate(
      {
        update_id: 50,
        message: {
          message_id: 50,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    const result = await processTelegramUpdate(
      {
        update_id: 51,
        message: {
          message_id: 51,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/stop",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    const learner = await getTelegramLearner(TELEGRAM_USER);
    expect(learner?.status).toBe("stopped");
  });

  it("deduplicates the same update_id", async () => {
    __resetTelegramStoresForTests();
    runCoachFn.mockClear();
    const update = {
      update_id: 60,
      message: {
        message_id: 60,
        chat: { id: CHAT_ID, type: "private" },
        from: { id: TELEGRAM_USER },
        text: "/start",
      },
    };

    await processTelegramUpdate(update, { botId: BOT_ID, runCoachFn });
    runCoachFn.mockClear();
    const duplicate = await processTelegramUpdate(update, {
      botId: BOT_ID,
      runCoachFn,
    });

    expect(duplicate.kind).toBe("duplicate");
    expect(runCoachFn).not.toHaveBeenCalled();
  });

  it("rejects invalid callback tokens", async () => {
    __resetTelegramStoresForTests();
    await processTelegramUpdate(
      {
        update_id: 70,
        message: {
          message_id: 70,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    const result = await processTelegramUpdate(
      {
        update_id: 71,
        callback_query: {
          id: "cb-bad",
          from: { id: TELEGRAM_USER },
          message: { chat: { id: CHAT_ID }, message_id: 71 },
          data: "c:badbad00",
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.errorCode).toBe("invalid_callback");
    }
  });

  it("handles coach timeout gracefully", async () => {
    __resetTelegramStoresForTests();
    const failingCoach = vi.fn(async () => {
      throw new Error("timeout");
    });

    const result = await processTelegramUpdate(
      {
        update_id: 80,
        message: {
          message_id: 80,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn: failingCoach },
    );

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.errorCode).toBe("coach_timeout");
    }
  });

  it("handles invalid coach schema", async () => {
    __resetTelegramStoresForTests();
    const badCoach = vi.fn(async () => ({ bad: true }) as unknown as CoachResponse);

    const result = await processTelegramUpdate(
      {
        update_id: 81,
        message: {
          message_id: 81,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: "/start",
        },
      },
      { botId: BOT_ID, runCoachFn: badCoach },
    );

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.errorCode).toBe("invalid_schema");
    }
  });

  it("links web learner via one-time code", async () => {
    __resetTelegramStoresForTests();
    const webLearnerId = uuidv4();
    const code = await createLinkCode(webLearnerId, 10);

    const result = await processTelegramUpdate(
      {
        update_id: 90,
        message: {
          message_id: 90,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: `/link ${code.code}`,
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("reply");
    const learner = await getTelegramLearner(TELEGRAM_USER);
    expect(learner?.learnerId).toBe(webLearnerId);
  });

  it("rejects expired link code", async () => {
    __resetTelegramStoresForTests();
    const webLearnerId = uuidv4();
    const code = await createLinkCode(webLearnerId, -1);

    const result = await processTelegramUpdate(
      {
        update_id: 91,
        message: {
          message_id: 91,
          chat: { id: CHAT_ID, type: "private" },
          from: { id: TELEGRAM_USER },
          text: `/link ${code.code}`,
        },
      },
      { botId: BOT_ID, runCoachFn },
    );

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.errorCode).toBe("expired");
    }
  });
});
