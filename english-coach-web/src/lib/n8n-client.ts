import type { CoachRequest, CoachResponse } from "@/lib/types";
import { parseCoachResponse } from "@/lib/validation";
import { runLocalCoach } from "@/lib/coach/mock-engine";
import { v4 as uuidv4 } from "uuid";
import {
  ACCEPTED_SCHEMA_VERSIONS,
  WEB_CLIENT_VERSION,
} from "@/lib/versions";

const DEFAULT_TIMEOUT_MS = 25_000;

export function getCoachBackend(): "local" | "n8n" {
  const mode = process.env.COACH_BACKEND?.toLowerCase();
  if (mode === "n8n") return "n8n";
  if (mode === "local") return "local";
  if (process.env.N8N_WEBHOOK_URL) return "n8n";
  return "local";
}

async function callN8n(req: CoachRequest): Promise<CoachResponse> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    throw new Error("N8N_WEBHOOK_URL is not configured");
  }

  const secret = process.env.N8N_WEBHOOK_SECRET;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.N8N_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify({
        ...req,
        channel: "web",
        requestId: uuidv4(),
        clientVersion: WEB_CLIENT_VERSION,
        acceptedSchemaVersions: [...ACCEPTED_SCHEMA_VERSIONS],
        telegram: {
          telegramUserId: null,
          chatId: null,
          updateId: null,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}`);
    }

    const json: unknown = await response.json();
    const parsed = parseCoachResponse(json);
    if (!parsed.success) {
      throw new Error("Invalid coach response schema from n8n");
    }
    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runCoach(req: CoachRequest): Promise<CoachResponse> {
  if (getCoachBackend() === "n8n") {
    return callN8n(req);
  }
  return runLocalCoach(req);
}
