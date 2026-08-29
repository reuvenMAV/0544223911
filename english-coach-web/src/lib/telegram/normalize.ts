import { v4 as uuidv4 } from "uuid";
import type { CoachRequest } from "@/lib/types";
import {
  decodeCallbackData,
  isOtherChoice,
} from "@/lib/telegram/callback-data";
import { parseTelegramCommand } from "@/lib/telegram/commands";
import type {
  NormalizedTelegramInput,
  TelegramLearnerRecord,
  TelegramUpdate,
} from "@/lib/telegram/types";

export function extractTelegramUserId(
  update: TelegramUpdate,
): number | null {
  return (
    update.message?.from?.id ??
    update.callback_query?.from.id ??
    null
  );
}

export function extractChatId(update: TelegramUpdate): number | null {
  return (
    update.message?.chat.id ??
    update.callback_query?.message?.chat.id ??
    null
  );
}

export function classifyTelegramUpdate(
  update: TelegramUpdate,
): NormalizedTelegramInput {
  if (update.callback_query?.data) {
    const decoded = decodeCallbackData(update.callback_query.data);
    if (!decoded.ok) {
      return { kind: "ignored", reason: decoded.reason };
    }
    return { kind: "callback", callbackToken: decoded.token };
  }

  const text = update.message?.text?.trim();
  if (!text) {
    return { kind: "ignored", reason: "empty_message" };
  }

  const command = parseTelegramCommand(text);
  if (command) {
    if (command.command === "link") {
      return {
        kind: "command",
        command: "link",
        linkCode: command.args,
      };
    }
    return { kind: "command", command: command.command };
  }

  return { kind: "text", text };
}

export function buildCoachRequestFromTelegram(input: {
  learner: TelegramLearnerRecord;
  classified: NormalizedTelegramInput;
  choiceId?: string;
  choiceText?: string | null;
  text?: string | null;
  forceStart?: boolean;
}): CoachRequest | null {
  const sessionId = input.learner.sessionId ?? uuidv4();

  if (input.forceStart || input.classified.kind === "command") {
    if (
      input.classified.kind === "command" &&
      (input.classified.command === "start" ||
        input.classified.command === "link")
    ) {
      return {
        learnerId: input.learner.learnerId,
        sessionId,
        messageType: "start",
        choiceId: null,
        choiceText: null,
        text: null,
        locale: "he",
      };
    }
    return null;
  }

  if (input.classified.kind === "callback" && input.choiceId) {
    if (isOtherChoice(input.choiceId)) {
      return null;
    }
    return {
      learnerId: input.learner.learnerId,
      sessionId,
      messageType: "choice",
      choiceId: input.choiceId,
      choiceText: input.choiceText ?? null,
      text: null,
      locale: "he",
    };
  }

  if (
    input.learner.awaitingText ||
    input.classified.kind === "text"
  ) {
    const text =
      input.text ??
      (input.classified.kind === "text" ? input.classified.text : null);
    if (!text) return null;
    return {
      learnerId: input.learner.learnerId,
      sessionId,
      messageType: "text",
      choiceId: "other",
      choiceText: text,
      text,
      locale: "he",
    };
  }

  return null;
}

export function buildUnifiedPayload(
  coachRequest: CoachRequest,
  context: {
    telegramUserId: number;
    chatId: number;
    updateId: number;
    requestId?: string;
  },
) {
  return {
    ...coachRequest,
    channel: "telegram" as const,
    requestId: context.requestId ?? uuidv4(),
    clientVersion: "telegram-1.0.0",
    acceptedSchemaVersions: ["chat-response.v1"],
    telegram: {
      telegramUserId: context.telegramUserId,
      chatId: context.chatId,
      updateId: context.updateId,
    },
  };
}
