import type { CoachRequest, CoachResponse } from "@/lib/types";

export type TelegramLearnerStatus = "pending" | "active" | "blocked" | "stopped";

export type TelegramLearnerRecord = {
  id: string;
  telegramUserId: number;
  learnerId: string;
  chatId: number;
  status: TelegramLearnerStatus;
  locale: string;
  awaitingText: boolean;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TelegramUpdateRecord = {
  telegramBotId: string;
  updateId: number;
  telegramUserId: number | null;
};

export type TelegramLinkCodeRecord = {
  code: string;
  learnerId: string;
  expiresAt: string;
  usedAt: string | null;
};

export type TelegramCallbackToken = {
  token: string;
  learnerId: string;
  sessionId: string;
  choiceId: string;
  expiresAt: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: { id: number };
  message?: { chat: { id: number }; message_id: number };
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramCommand =
  | "start"
  | "help"
  | "progress"
  | "stop"
  | "web"
  | "link";

export type NormalizedTelegramInput =
  | {
      kind: "command";
      command: TelegramCommand;
      linkCode?: string;
    }
  | {
      kind: "callback";
      callbackToken: string;
    }
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "ignored";
      reason: string;
    };

export type TelegramProcessResult = {
  coachRequest: CoachRequest;
  reply: CoachResponse;
  chatId: number;
  requestId: string;
  skipSend?: boolean;
  directReplyText?: string;
  monitoring: {
    phase: string;
    responseMs: number;
    sendOk: boolean;
    errorCode?: string;
  };
};

export type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export type TelegramSendPayload = {
  chat_id: number;
  text: string;
  reply_markup?: TelegramInlineKeyboard;
};
