import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import { validCoachRequest, validCoachResponse } from "../fixtures/coach-payloads";

vi.mock("@/lib/n8n-client", () => ({
  runCoach: vi.fn(),
}));

import { runCoach } from "@/lib/n8n-client";

const runCoachMock = vi.mocked(runCoach);

function makeChatRequest(body: unknown, ip = "127.0.0.1") {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/chat contract", () => {
  beforeEach(() => {
    runCoachMock.mockReset();
    runCoachMock.mockResolvedValue(validCoachResponse);
  });

  it("handles start payload", async () => {
    const res = await POST(makeChatRequest(validCoachRequest));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.replyText).toBeTruthy();
    expect(json.progressSaved).toBe(true);
  });

  it("handles choice and text payloads", async () => {
    const choiceRes = await POST(
      makeChatRequest({
        ...validCoachRequest,
        messageType: "choice",
        choiceId: "1",
        choiceText: "סדרות",
      }),
    );
    expect(choiceRes.status).toBe(200);
    const textRes = await POST(
      makeChatRequest({
        ...validCoachRequest,
        messageType: "text",
        text: "תשובה",
        choiceId: "other",
      }),
    );
    expect(textRes.status).toBe(200);
  });

  it("handles end_lesson payload", async () => {
    runCoachMock.mockResolvedValue({
      ...validCoachResponse,
      phase: "recap",
      meta: { recapAvailable: true },
    });
    const res = await POST(
      makeChatRequest({
        ...validCoachRequest,
        messageType: "end_lesson",
        text: "סיימתי את השיעור",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.phase).toBe("recap");
  });

  it("returns 400 for invalid payload", async () => {
    const res = await POST(makeChatRequest({ learnerId: "bad" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.progressSaved).toBe(false);
  });

  it("returns 502 for invalid coach response", async () => {
    runCoachMock.mockResolvedValue({ replyText: "" } as never);
    const res = await POST(makeChatRequest(validCoachRequest));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.phase).toBe("onboarding");
  });

  it("returns 502 with lesson phase for non-start invalid responses", async () => {
    runCoachMock.mockResolvedValue({ replyText: "" } as never);
    const res = await POST(
      makeChatRequest({
        ...validCoachRequest,
        messageType: "choice",
        choiceText: "א",
      }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.phase).toBe("lesson");
  });

  it("returns 500 on thrown errors and broken JSON", async () => {
    runCoachMock.mockRejectedValue(new Error("timeout"));
    const res = await POST(makeChatRequest(validCoachRequest));
    expect(res.status).toBe(500);

    const broken = await POST(makeChatRequest("{not-json"));
    expect(broken.status).toBe(500);
  });

  it("returns 429 when rate limited", async () => {
    const ip = `rate-limit-${crypto.randomUUID()}`;
    let lastStatus = 200;
    for (let i = 0; i < 35; i += 1) {
      const res = await POST(makeChatRequest(validCoachRequest, ip));
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});
