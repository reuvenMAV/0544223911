import { vi } from "vitest";
import type { CoachResponse } from "@/lib/types";
import { validCoachResponse } from "../fixtures/coach-payloads";

export function createN8nMockResponse(
  override: Partial<CoachResponse> = {},
): CoachResponse {
  return { ...validCoachResponse, ...override };
}

export function mockN8nFetchSuccess(
  response: CoachResponse = validCoachResponse,
) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => response,
  });
}

export function mockN8nFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });
}

export function mockN8nFetchTimeout() {
  return vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
}
