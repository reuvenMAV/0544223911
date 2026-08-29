import { NextRequest, NextResponse } from "next/server";
import {
  LEARNER_COOKIE,
  parseLearnerId,
  readCookieValue,
} from "@/lib/learner-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLinkCode } from "@/lib/telegram/store";

export const runtime = "nodejs";

const LINK_CODE_TTL_MINUTES = 10;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  const limited = checkRateLimit(`telegram-link:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: limited.retryAfterSec },
      { status: 429 },
    );
  }

  const learnerId = parseLearnerId(
    readCookieValue(request.headers.get("cookie") ?? "", LEARNER_COOKIE),
  );
  if (!learnerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const record = await createLinkCode(learnerId, LINK_CODE_TTL_MINUTES);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=link`
      : null;

    return NextResponse.json({
      code: record.code,
      expiresAt: record.expiresAt,
      expiresInMinutes: LINK_CODE_TTL_MINUTES,
      instructions:
        "שלחו לבוט את הפקודה /link ואחריה את הקוד. הקוד חד-פעמי ותקף לזמן קצר.",
      telegramCommand: `/link ${record.code}`,
      deepLink,
    });
  } catch (error) {
    console.error(
      "[api/telegram/link-code]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
