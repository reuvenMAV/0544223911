import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/recap/[sessionId]/route";
import { saveSessionRecap } from "@/lib/progress";
import {
  FIXTURE_LEARNER_ID,
  FIXTURE_OTHER_LEARNER_ID,
  FIXTURE_SESSION_ID,
} from "../fixtures/coach-payloads";
import { fixtureRecap } from "../fixtures/progress";
import { LEARNER_COOKIE } from "@/lib/learner-session";

describe("GET /api/recap/[sessionId]", () => {
  it("returns recap for owning learner via cookie", async () => {
    await saveSessionRecap(fixtureRecap());
    const req = new NextRequest(
      `http://localhost/api/recap/${FIXTURE_SESSION_ID}`,
      {
        headers: {
          cookie: `${LEARNER_COOKIE}=${FIXTURE_LEARNER_ID}`,
        },
      },
    );
    const res = await GET(req, {
      params: Promise.resolve({ sessionId: FIXTURE_SESSION_ID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.words.length).toBeGreaterThan(0);
  });

  it("forbids access for another learner", async () => {
    await saveSessionRecap(fixtureRecap());
    const req = new NextRequest(
      `http://localhost/api/recap/${FIXTURE_SESSION_ID}?learnerId=${FIXTURE_OTHER_LEARNER_ID}`,
    );
    const res = await GET(req, {
      params: Promise.resolve({ sessionId: FIXTURE_SESSION_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing recap", async () => {
    const req = new NextRequest(
      `http://localhost/api/recap/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?learnerId=${FIXTURE_LEARNER_ID}`,
    );
    const res = await GET(req, {
      params: Promise.resolve({
        sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    });
    expect(res.status).toBe(404);
  });
});
