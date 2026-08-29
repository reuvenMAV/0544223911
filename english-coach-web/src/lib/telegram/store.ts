import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type {
  TelegramCallbackToken,
  TelegramLearnerRecord,
  TelegramLearnerStatus,
  TelegramLinkCodeRecord,
  TelegramUpdateRecord,
} from "@/lib/telegram/types";

const memoryLearners = new Map<number, TelegramLearnerRecord>();
const memoryUpdates = new Set<string>();
const memoryLinkCodes = new Map<string, TelegramLinkCodeRecord>();
const memoryCallbackTokens = new Map<string, TelegramCallbackToken>();

export function __resetTelegramStoresForTests() {
  memoryLearners.clear();
  memoryUpdates.clear();
  memoryLinkCodes.clear();
  memoryCallbackTokens.clear();
}

function updateKey(botId: string, updateId: number) {
  return `${botId}:${updateId}`;
}

export async function isUpdateProcessed(
  botId: string,
  updateId: number,
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return memoryUpdates.has(updateKey(botId, updateId));
  }

  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase
    .from("telegram_updates")
    .select("id")
    .eq("telegram_bot_id", botId)
    .eq("update_id", updateId)
    .maybeSingle();

  return Boolean(data);
}

export async function markUpdateProcessed(
  record: TelegramUpdateRecord,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    memoryUpdates.add(updateKey(record.telegramBotId, record.updateId));
    return;
  }

  const supabase = getSupabaseAdmin()!;
  await supabase.from("telegram_updates").insert({
    telegram_bot_id: record.telegramBotId,
    update_id: record.updateId,
    telegram_user_id: record.telegramUserId,
  });
}

export async function getTelegramLearner(
  telegramUserId: number,
): Promise<TelegramLearnerRecord | null> {
  if (!isSupabaseConfigured()) {
    return memoryLearners.get(telegramUserId) ?? null;
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_learners")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (error || !data) return null;

  return mapLearnerRow(data);
}

export async function upsertTelegramLearner(input: {
  telegramUserId: number;
  learnerId: string;
  chatId: number;
  status?: TelegramLearnerStatus;
  locale?: string;
  awaitingText?: boolean;
  sessionId?: string | null;
}): Promise<TelegramLearnerRecord> {
  const now = new Date().toISOString();
  const record: TelegramLearnerRecord = {
    id: uuidv4(),
    telegramUserId: input.telegramUserId,
    learnerId: input.learnerId,
    chatId: input.chatId,
    status: input.status ?? "active",
    locale: input.locale ?? "he",
    awaitingText: input.awaitingText ?? false,
    sessionId: input.sessionId ?? uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  if (!isSupabaseConfigured()) {
    const existing = memoryLearners.get(input.telegramUserId);
    const merged: TelegramLearnerRecord = existing
      ? {
          ...existing,
          ...record,
          id: existing.id,
          createdAt: existing.createdAt,
          sessionId: input.sessionId ?? existing.sessionId ?? uuidv4(),
          updatedAt: now,
        }
      : record;
    memoryLearners.set(input.telegramUserId, merged);
    return merged;
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_learners")
    .upsert(
      {
        telegram_user_id: input.telegramUserId,
        learner_id: input.learnerId,
        chat_id: input.chatId,
        status: input.status ?? "active",
        locale: input.locale ?? "he",
        awaiting_text: input.awaitingText ?? false,
        session_id: input.sessionId ?? uuidv4(),
        updated_at: now,
      },
      { onConflict: "telegram_user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to upsert telegram learner");
  }

  return mapLearnerRow(data);
}

export async function updateTelegramLearnerState(
  telegramUserId: number,
  patch: Partial<
    Pick<
      TelegramLearnerRecord,
      "status" | "awaitingText" | "sessionId" | "chatId"
    >
  >,
): Promise<TelegramLearnerRecord | null> {
  const existing = await getTelegramLearner(telegramUserId);
  if (!existing) return null;

  const updated: TelegramLearnerRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    memoryLearners.set(telegramUserId, updated);
    return updated;
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_learners")
    .update({
      status: updated.status,
      awaiting_text: updated.awaitingText,
      session_id: updated.sessionId,
      chat_id: updated.chatId,
      updated_at: updated.updatedAt,
    })
    .eq("telegram_user_id", telegramUserId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapLearnerRow(data);
}

export async function createLinkCode(
  learnerId: string,
  ttlMinutes = 10,
): Promise<TelegramLinkCodeRecord> {
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const record: TelegramLinkCodeRecord = {
    code,
    learnerId,
    expiresAt,
    usedAt: null,
  };

  if (!isSupabaseConfigured()) {
    memoryLinkCodes.set(code, record);
    return record;
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_link_codes")
    .insert({
      code,
      learner_id: learnerId,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to create link code");

  return {
    code: data.code,
    learnerId: data.learner_id,
    expiresAt: data.expires_at,
    usedAt: data.used_at,
  };
}

export async function consumeLinkCode(
  code: string,
): Promise<{ ok: true; learnerId: string } | { ok: false; reason: string }> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    return { ok: false, reason: "invalid_format" };
  }

  if (!isSupabaseConfigured()) {
    const record = memoryLinkCodes.get(normalized);
    if (!record) return { ok: false, reason: "not_found" };
    if (record.usedAt) return { ok: false, reason: "already_used" };
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }
    record.usedAt = new Date().toISOString();
    memoryLinkCodes.set(normalized, record);
    return { ok: true, learnerId: record.learnerId };
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_link_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "not_found" };
  if (data.used_at) return { ok: false, reason: "already_used" };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  await supabase
    .from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", normalized);

  return { ok: true, learnerId: data.learner_id };
}

export async function saveCallbackToken(
  input: Omit<TelegramCallbackToken, "expiresAt"> & { ttlMinutes?: number },
): Promise<TelegramCallbackToken> {
  const expiresAt = new Date(
    Date.now() + (input.ttlMinutes ?? 30) * 60_000,
  ).toISOString();
  const record: TelegramCallbackToken = {
    ...input,
    expiresAt,
  };

  if (!isSupabaseConfigured()) {
    memoryCallbackTokens.set(record.token, record);
    return record;
  }

  const supabase = getSupabaseAdmin()!;
  await supabase.from("telegram_callback_tokens").insert({
    token: record.token,
    learner_id: record.learnerId,
    session_id: record.sessionId,
    choice_id: record.choiceId,
    expires_at: record.expiresAt,
  });

  return record;
}

export async function resolveCallbackToken(
  token: string,
): Promise<TelegramCallbackToken | null> {
  if (!isSupabaseConfigured()) {
    const record = memoryCallbackTokens.get(token);
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) return null;
    memoryCallbackTokens.delete(token);
    return record;
  }

  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("telegram_callback_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await supabase.from("telegram_callback_tokens").delete().eq("token", token);

  return {
    token: data.token,
    learnerId: data.learner_id,
    sessionId: data.session_id,
    choiceId: data.choice_id,
    expiresAt: data.expires_at,
  };
}

function generateLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function mapLearnerRow(row: Record<string, unknown>): TelegramLearnerRecord {
  return {
    id: String(row.id),
    telegramUserId: Number(row.telegram_user_id),
    learnerId: String(row.learner_id),
    chatId: Number(row.chat_id),
    status: row.status as TelegramLearnerRecord["status"],
    locale: String(row.locale ?? "he"),
    awaitingText: Boolean(row.awaiting_text),
    sessionId: row.session_id ? String(row.session_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
