import { describe, expect, it } from "vitest";
import {
  ensureLearnerSessionIds,
  learnerOwnsRecap,
  LEARNER_COOKIE,
  parseLearnerId,
  parseSessionId,
  readCookieValue,
  SESSION_COOKIE,
} from "@/lib/learner-session";
import {
  FIXTURE_LEARNER_ID,
  FIXTURE_OTHER_LEARNER_ID,
  FIXTURE_SESSION_ID,
} from "../fixtures/coach-payloads";

describe("learner-session", () => {
  it("creates stable ids from storage and cookies", () => {
    const storage = new Map<string, string>();
    const cookies = new Map<string, string>();

    const ids = ensureLearnerSessionIds({
      search: "",
      readCookie: (name) => cookies.get(name) ?? null,
      writeCookie: (name, value) => {
        cookies.set(name, value);
      },
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      createId: () => FIXTURE_LEARNER_ID,
    });

    expect(ids.learnerId).toBe(FIXTURE_LEARNER_ID);
    expect(parseLearnerId(ids.learnerId)).toBe(FIXTURE_LEARNER_ID);
    expect(cookies.get(LEARNER_COOKIE)).toBe(FIXTURE_LEARNER_ID);
  });

  it("prefers learner query param when valid uuid", () => {
    const ids = ensureLearnerSessionIds({
      search: `?learner=${FIXTURE_OTHER_LEARNER_ID}`,
      createId: () => FIXTURE_LEARNER_ID,
    });
    expect(ids.learnerId).toBe(FIXTURE_OTHER_LEARNER_ID);
  });

  it("rejects invalid learner ids", () => {
    expect(parseLearnerId("not-a-uuid")).toBeNull();
    expect(parseSessionId("123")).toBeNull();
  });

  it("reads cookie header values", () => {
    const value = readCookieValue(
      `${LEARNER_COOKIE}=${FIXTURE_LEARNER_ID}; ${SESSION_COOKIE}=${FIXTURE_SESSION_ID}`,
      LEARNER_COOKIE,
    );
    expect(value).toBe(FIXTURE_LEARNER_ID);
  });

  it("checks recap ownership", () => {
    expect(
      learnerOwnsRecap(FIXTURE_LEARNER_ID, FIXTURE_LEARNER_ID),
    ).toBe(true);
    expect(
      learnerOwnsRecap(FIXTURE_LEARNER_ID, FIXTURE_OTHER_LEARNER_ID),
    ).toBe(false);
    expect(learnerOwnsRecap(FIXTURE_LEARNER_ID, null)).toBe(false);
  });
});
