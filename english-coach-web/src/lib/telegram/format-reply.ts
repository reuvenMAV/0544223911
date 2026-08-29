import type { CoachResponse } from "@/lib/types";
import {
  createCallbackTokenValue,
  encodeCallbackData,
  isOtherChoice,
} from "@/lib/telegram/callback-data";
import { saveCallbackToken } from "@/lib/telegram/store";
import type { TelegramSendPayload } from "@/lib/telegram/types";

export async function formatCoachResponseForTelegram(
  response: CoachResponse,
  context: { learnerId: string; sessionId: string; chatId: number },
): Promise<TelegramSendPayload> {
  const payload: TelegramSendPayload = {
    chat_id: context.chatId,
    text: response.replyText,
  };

  if (!response.choices.length) {
    return payload;
  }

  const rows: TelegramSendPayload["reply_markup"] = { inline_keyboard: [] };
  const currentRow: Array<{ text: string; callback_data: string }> = [];

  for (const choice of response.choices) {
    const token = createCallbackTokenValue();
    await saveCallbackToken({
      token,
      learnerId: context.learnerId,
      sessionId: context.sessionId,
      choiceId: choice.id,
    });

    currentRow.push({
      text: choice.label.slice(0, 64),
      callback_data: encodeCallbackData(token),
    });

    if (currentRow.length === 2) {
      rows.inline_keyboard.push([...currentRow]);
      currentRow.length = 0;
    }
  }

  if (currentRow.length) {
    rows.inline_keyboard.push([...currentRow]);
  }

  payload.reply_markup = rows;
  return payload;
}

export function shouldAwaitFreeText(choiceId: string): boolean {
  return isOtherChoice(choiceId);
}

export function formatTelegramError(message: string): TelegramSendPayload {
  return {
    chat_id: 0,
    text: message,
  };
}
