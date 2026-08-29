import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/telegram/link-code/route";
import { LEARNER_COOKIE } from "@/lib/learner-session";
import { FIXTURE_LEARNER_ID } from "../fixtures/coach-payloads";
import { __resetTelegramStoresForTests } from "@/lib/telegram/store";

describe("POST /api/telegram/link-code", () => {
  beforeEach(() => {
    __resetTelegramStoresForTests();
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "EnglishCoachBot");
  });

  it("returns a one-time link code for authenticated learner", async () => {
    const request = new NextRequest("http://localhost/api/telegram/link-code", {
      method: "POST",
      headers: {
        cookie: `${LEARNER_COOKIE}=${FIXTURE_LEARNER_ID}`,
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(json.telegramCommand).toContain(json.code);
    expect(json.deepLink).toContain("t.me/EnglishCoachBot");
    expect(JSON.stringify(json)).not.toContain("TELEGRAM_BOT_TOKEN");
  });

  it("returns 401 without learner cookie", async () => {
    const request = new NextRequest("http://localhost/api/telegram/link-code", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
