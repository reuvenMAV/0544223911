import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCoachBackend, runCoach } from "@/lib/n8n-client";
import { validCoachRequest } from "../fixtures/coach-payloads";
import {
  createN8nMockResponse,
  mockN8nFetchError,
  mockN8nFetchSuccess,
} from "../mocks/n8n";

describe("n8n client", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local backend", () => {
    delete process.env.COACH_BACKEND;
    delete process.env.N8N_WEBHOOK_URL;
    expect(getCoachBackend()).toBe("local");
  });

  it("uses n8n when configured", () => {
    vi.stubEnv("COACH_BACKEND", "n8n");
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
    expect(getCoachBackend()).toBe("n8n");
  });

  it("calls n8n webhook with secret header when configured", async () => {
    vi.stubEnv("COACH_BACKEND", "n8n");
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("N8N_TIMEOUT_MS", "5000");

    const fetchMock = mockN8nFetchSuccess(createN8nMockResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await runCoach(validCoachRequest);
    expect(result.replyText).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://n8n.example/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-webhook-secret": "test-secret",
        }),
      }),
    );
  });

  it("omits secret header when not configured", async () => {
    vi.stubEnv("COACH_BACKEND", "n8n");
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
    delete process.env.N8N_WEBHOOK_SECRET;

    const fetchMock = mockN8nFetchSuccess();
    vi.stubGlobal("fetch", fetchMock);

    await runCoach(validCoachRequest);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).not.toHaveProperty("x-webhook-secret");
  });

  it("throws on n8n HTTP errors", async () => {
    vi.stubEnv("COACH_BACKEND", "n8n");
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
    vi.stubGlobal("fetch", mockN8nFetchError(500));
    await expect(runCoach(validCoachRequest)).rejects.toThrow();
  });
});
