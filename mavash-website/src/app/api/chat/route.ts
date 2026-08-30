import { NextResponse } from "next/server";

const WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL?.trim();

export async function POST(request: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "הצ'אט לא מוגדר בשרת (חסר N8N_CHAT_WEBHOOK_URL)" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const chatInput = typeof body.chatInput === "string" ? body.chatInput : "";

    if (!sessionId || !chatInput.trim()) {
      return NextResponse.json(
        { error: "חסרים sessionId או chatInput" },
        { status: 400 },
      );
    }

    const upstream = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendMessage",
        sessionId,
        chatInput: chatInput.trim(),
        metadata: body.metadata ?? {},
      }),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      return NextResponse.json(data, { status: upstream.status });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType || "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "שגיאת חיבור לבוט" }, { status: 502 });
  }
}
