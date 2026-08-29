import { NextRequest, NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram/processor";
import {
  sendTelegramMessage,
  verifyTelegramWebhookSecret,
  readTelegramWebhookSecretHeader,
} from "@/lib/telegram/send";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secretHeader = readTelegramWebhookSecretHeader(request.headers);

  if (!verifyTelegramWebhookSecret(secretHeader)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const botId =
    process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? "english-coach";
  const webUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  const result = await processTelegramUpdate(update, {
    botId,
    webUrl,
  });

  if (result.kind === "duplicate") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const sendResult = await sendTelegramMessage(result.payload);
  if (!sendResult.ok) {
    return NextResponse.json(
      { ok: false, errorCode: sendResult.errorCode },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: result.requestId,
    kind: result.kind,
  });
}
