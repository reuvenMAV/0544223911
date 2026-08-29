import { NextRequest, NextResponse } from "next/server";
import {
  learnerOwnsRecap,
  LEARNER_COOKIE,
  parseLearnerId,
  readCookieValue,
} from "@/lib/learner-session";
import { getSessionRecap } from "@/lib/progress";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const recap = await getSessionRecap(sessionId);
  if (!recap) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const queryLearnerId = parseLearnerId(
    request.nextUrl.searchParams.get("learnerId"),
  );
  const cookieLearnerId = parseLearnerId(
    readCookieValue(request.headers.get("cookie") ?? "", LEARNER_COOKIE),
  );
  const requestLearnerId = queryLearnerId ?? cookieLearnerId;

  if (!learnerOwnsRecap(recap.learnerId, requestLearnerId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(recap);
}
