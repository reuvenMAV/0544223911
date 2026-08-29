import { describe, expect, it } from "vitest";
import {
  consumeLinkCode,
  createLinkCode,
  __resetTelegramStoresForTests,
} from "@/lib/telegram/store";
import { FIXTURE_LEARNER_ID } from "../fixtures/coach-payloads";

describe("telegram link codes", () => {
  it("creates and consumes a one-time link code", async () => {
    __resetTelegramStoresForTests();
    const created = await createLinkCode(FIXTURE_LEARNER_ID, 10);
    expect(created.code).toMatch(/^[A-Z0-9]{6}$/);

    const ok = await consumeLinkCode(created.code);
    expect(ok).toEqual({ ok: true, learnerId: FIXTURE_LEARNER_ID });

    const again = await consumeLinkCode(created.code);
    expect(again).toEqual({ ok: false, reason: "already_used" });
  });

  it("rejects expired codes", async () => {
    __resetTelegramStoresForTests();
    const created = await createLinkCode(FIXTURE_LEARNER_ID, -1);
    const result = await consumeLinkCode(created.code);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });
});
