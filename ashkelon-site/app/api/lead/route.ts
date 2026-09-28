import { NextRequest, NextResponse } from 'next/server'
import { sendToN8n } from '@/lib/n8n'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ok = await sendToN8n('/lead', {
      event: 'lead',
      ...body,
      timestamp: new Date().toISOString(),
      source: body.source || 'direct_website',
    })
    return NextResponse.json({ success: ok })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
