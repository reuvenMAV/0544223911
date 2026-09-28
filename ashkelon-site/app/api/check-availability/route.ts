
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function calcPrice(checkin: string, checkout: string) {
  const start = new Date(checkin)
  const end = new Date(checkout)
  let weekdays = 0, weekends = 0
  let d = new Date(start)
  while (d < end) {
    const day = d.getDay() // 0=Sun, 5=Fri, 6=Sat
    if (day === 5 || day === 6) weekends++ // Fri/Sat in Israel
    else weekdays++
    d.setDate(d.getDate()+1)
  }
  const total = weekdays*600 + weekends*750 + 200 // cleaning
  return { weekdays, weekends, nights: weekdays+weekends, total, breakdown: { base: weekdays*600 + weekends*750, cleaning: 200 } }
}

export async function POST(req: NextRequest) {
  const { checkin, checkout } = await req.json()
  if (!checkin || !checkout) return NextResponse.json({ error: 'Missing dates' }, { status: 400 })

  const { data: blocked } = await supabaseAdmin
    .from('blocked_dates')
    .select('date, source')
    .gte('date', checkin)
    .lt('date', checkout)

  const available = !blocked || blocked.length === 0
  const pricing = calcPrice(checkin, checkout)

  // Also check pricing_rules for holidays
  const { data: rules } = await supabaseAdmin
    .from('pricing_rules')
    .select('*')
    .lte('start_date', checkout)
    .gte('end_date', checkin)

  let holidayModifier = 0
  if (rules && rules.length > 0) {
    // Example: Rosh Hashana 900₪ min 3 nights
    pricing.total = rules[0].price * pricing.nights + 200
    holidayModifier = rules[0].price - 600
  }

  return NextResponse.json({ available, blocked, pricing, holidayModifier, rules })
}

export async function GET(req: NextRequest) {
  // For calendar UI - return month blocked dates with prices
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0,7)
  const { data } = await supabaseAdmin
    .from('blocked_dates')
    .select('date')
    .gte('date', `${month}-01`)
    .lt('date', `${month}-32`)

  return NextResponse.json({ blockedDates: data?.map(d=>d.date) || [] })
}
