import { NextRequest, NextResponse } from "next/server";
import { getSessionRecap } from "@/lib/progress";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const recap = await getSessionRecap(sessionId);
  if (!recap) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(recap);
}
