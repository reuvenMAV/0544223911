import { randomBytes } from "node:crypto";

const CALLBACK_PREFIX = "c:";
const TOKEN_LENGTH = 8;
const MAX_CALLBACK_DATA = 64;

export function createCallbackTokenValue(): string {
  return randomBytes(TOKEN_LENGTH / 2).toString("hex");
}

export function encodeCallbackData(token: string): string {
  const payload = `${CALLBACK_PREFIX}${token}`;
  if (payload.length > MAX_CALLBACK_DATA) {
    throw new Error("callback_data exceeds Telegram limit");
  }
  return payload;
}

export function decodeCallbackData(data: string | undefined | null):
  | { ok: true; token: string }
  | { ok: false; reason: string } {
  if (!data) return { ok: false, reason: "missing" };
  if (!data.startsWith(CALLBACK_PREFIX)) {
    return { ok: false, reason: "invalid_prefix" };
  }
  const token = data.slice(CALLBACK_PREFIX.length);
  if (!/^[a-f0-9]{8}$/.test(token)) {
    return { ok: false, reason: "invalid_token" };
  }
  return { ok: true, token };
}

export function isOtherChoice(choiceId: string): boolean {
  return (
    choiceId === "other" ||
    choiceId.endsWith("-other") ||
    choiceId.includes("other")
  );
}
