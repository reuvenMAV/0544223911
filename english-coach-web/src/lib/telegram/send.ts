import type { TelegramSendPayload } from "@/lib/telegram/types";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  payload: TelegramSendPayload,
): Promise<{ ok: boolean; status: number; errorCode?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, status: 500, errorCode: "missing_bot_token" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `${TELEGRAM_API}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        errorCode: `telegram_${response.status}`,
      };
    }

    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 504, errorCode: "telegram_timeout" };
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyTelegramWebhookSecret(
  headerValue: string | null,
): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
  return headerValue === expected;
}

export function readTelegramWebhookSecretHeader(
  headers: Headers,
): string | null {
  return (
    headers.get("x-telegram-bot-api-secret-token") ??
    headers.get("x-telegram-webhook-secret") ??
    headers.get("x-webhook-secret")
  );
}
