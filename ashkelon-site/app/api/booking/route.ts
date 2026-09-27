import { NextRequest, NextResponse } from 'next/server'

/** Legacy alias used by the previous ashkelon-site UI — proxies to /api/new-booking */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/new-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
