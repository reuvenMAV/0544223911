import { NextRequest, NextResponse } from "next/server";
import { runCoach } from "@/lib/n8n-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseCoachRequest, parseCoachResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anonymous";
    const limited = checkRateLimit(`chat:${ip}`);
    if (!limited.ok) {
      return NextResponse.json(
        {
          replyText: "רגע קצר — שלחת יותר מדי בקשות. נסה/י שוב בעוד רגע.",
          choices: [],
          phase: "onboarding",
          progressSaved: false,
          meta: {},
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body: unknown = await request.json();
    const parsed = parseCoachRequest(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          replyText: "הבקשה לא הייתה תקינה. רענן/י את הדף ונסה/י שוב.",
          choices: [],
          phase: "onboarding",
          progressSaved: false,
          meta: {},
        },
        { status: 400 },
      );
    }

    const result = await runCoach(parsed.data);
    const validated = parseCoachResponse(result);
    if (!validated.success) {
      return NextResponse.json(
        {
          replyText: "קיבלנו תשובה לא תקינה מהמורה. אפשר לנסות שוב.",
          choices: [],
          phase: parsed.data.messageType === "start" ? "onboarding" : "lesson",
          progressSaved: false,
          meta: {},
        },
        { status: 502 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("[api/chat]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        replyText:
          "משהו השתבש בדרך למורה. זה לא באשמתך — אפשר לנסות שוב בעוד רגע.",
        choices: [],
        phase: "onboarding",
        progressSaved: false,
        meta: {},
      },
      { status: 500 },
    );
  }
}
