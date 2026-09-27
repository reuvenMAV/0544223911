import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { calcPrice } from '@/lib/pricing'
import { sendToN8n } from '@/lib/n8n'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { checkin, checkout, guest, captureLead } = body
    if (!checkin || !checkout) {
      return NextResponse.json({ error: 'Missing dates' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    let blocked: { date: string; source?: string }[] = []
    let rules: unknown[] = []

    if (supabase) {
      const { data } = await supabase
        .from('blocked_dates')
        .select('date, source')
        .gte('date', checkin)
        .lt('date', checkout)
      blocked = data || []

      const { data: pricingRules } = await supabase
        .from('pricing_rules')
        .select('*')
        .lte('start_date', checkout)
        .gte('end_date', checkin)
      rules = pricingRules || []
    }

    const available = blocked.length === 0
    const pricing = calcPrice(checkin, checkout)
    let holidayModifier = 0

    if (rules.length > 0) {
      const rule = rules[0] as { price?: number }
      if (rule.price) {
        pricing.total = rule.price * pricing.nights + 200
        pricing.breakdown.base = rule.price * pricing.nights
        holidayModifier = rule.price - 600
      }
    }

    // Lead capture when guest checked dates (optional)
    if (captureLead || guest?.phone) {
      void sendToN8n('/lead', {
        event: 'check_availability',
        guest: guest || null,
        dates: { checkin, checkout },
        available,
        pricing,
        timestamp: new Date().toISOString(),
        source: 'direct_website',
      })
    }

    return NextResponse.json({ available, blocked, pricing, holidayModifier, rules })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return NextResponse.json({ blockedDates: [], mode: 'n8n-only' })
  }

  const { data } = await supabase
    .from('blocked_dates')
    .select('date')
    .gte('date', `${month}-01`)
    .lt('date', `${month}-32`)

  return NextResponse.json({ blockedDates: data?.map((d) => d.date) || [] })
}
