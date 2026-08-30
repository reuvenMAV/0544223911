const SESSION_KEY = "mavash_chat_session_id";
const DEFAULT_THANK_YOU = "קיבלתי! נחזור אליכם בהקדם 🙂";

function extractChatReply(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null;
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["output", "text", "reply", "_clean_output"] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function getChatSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function sendChatMessage(
  chatInput: string,
  sessionId: string,
  metadata?: { source?: string; pageUrl?: string },
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      chatInput,
      metadata: {
        source: metadata?.source ?? "אתר — Mavash",
        pageUrl: metadata?.pageUrl ?? window.location.href,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return extractChatReply(data) ?? DEFAULT_THANK_YOU;
  }

  const text = (await response.text()).trim();
  return text || DEFAULT_THANK_YOU;
}
