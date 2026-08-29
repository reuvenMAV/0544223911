import { v4 as uuidv4 } from "uuid";
import { maskId, maskLearnerId } from "@/lib/telegram/mask";
import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "@/lib/versions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type TelegramLogEvent = {
  requestId: string;
  telegramUpdateId?: number;
  telegramUserId?: number;
  chatId?: number;
  learnerId?: string;
  phase?: string;
  channel?: string;
  responseMs?: number;
  sendOk?: boolean;
  errorCode?: string;
};

const memoryLogs: TelegramLogEvent[] = [];

export function __resetTelegramLogsForTests() {
  memoryLogs.length = 0;
}

export function getTelegramLogsForTests(): TelegramLogEvent[] {
  return [...memoryLogs];
}

export async function logTelegramEvent(event: TelegramLogEvent): Promise<void> {
  const safe = {
    requestId: event.requestId,
    telegramUpdateId: event.telegramUpdateId,
    telegramUserIdMasked: maskId(event.telegramUserId),
    chatIdMasked: maskId(event.chatId),
    learnerIdMasked: maskLearnerId(event.learnerId),
    phase: event.phase,
    channel: event.channel ?? "telegram",
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    workflowVersion: WORKFLOW_VERSION,
    responseMs: event.responseMs,
    sendOk: event.sendOk,
    errorCode: event.errorCode,
  };

  if (!isSupabaseConfigured()) {
    memoryLogs.push(event);
    console.info("[telegram]", JSON.stringify(safe));
    return;
  }

  const supabase = getSupabaseAdmin()!;
  await supabase.from("telegram_message_log").insert({
    request_id: event.requestId || uuidv4(),
    telegram_update_id: event.telegramUpdateId ?? null,
    telegram_user_id_masked: safe.telegramUserIdMasked,
    chat_id_masked: safe.chatIdMasked,
    learner_id: event.learnerId ?? null,
    channel: safe.channel,
    phase: event.phase ?? null,
    prompt_version: safe.promptVersion,
    schema_version: safe.schemaVersion,
    workflow_version: safe.workflowVersion,
    response_ms: event.responseMs ?? null,
    send_ok: event.sendOk ?? null,
    error_code: event.errorCode ?? null,
  });
}
