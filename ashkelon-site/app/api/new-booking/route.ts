import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendToN8n } from '@/lib/n8n'
import { createPayPlusLink, createDepositHold } from '@/lib/payplus'
import { calcPrice } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { guest, dates, pricing: clientPricing, source } = body

    if (!guest?.name || !guest?.phone || !dates?.checkin || !dates?.checkout) {
      return NextResponse.json({ error: 'Missing guest or dates' }, { status: 400 })
    }

    const pricing = clientPricing?.total ? clientPricing : calcPrice(dates.checkin, dates.checkout)
    const supabase = getSupabaseAdmin()
    const wallet_token = Math.random().toString(36).substring(2, 10).toUpperCase()
    const booking_id = `ASK-${Date.now().toString().slice(-4)}`
    let supabase_id: string | null = null

    if (supabase) {
      const { data: blocked } = await supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', dates.checkin)
        .lt('date', dates.checkout)

      if (blocked && blocked.length > 0) {
        return NextResponse.json({ error: 'Dates not available', blocked }, { status: 409 })
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          guest_name: guest.name,
          phone: guest.phone,
          email: guest.email,
          checkin: dates.checkin,
          checkout: dates.checkout,
          guests_count: body.guests_count || 2,
          total: pricing.total,
          status: 'pending',
          source: source || 'direct_website',
          wallet_token,
          booking_id,
        })
        .select()
        .single()

      if (error) throw error
      supabase_id = booking.id

      const blockedRows = []
      const d = new Date(dates.checkin)
      const end = new Date(dates.checkout)
      while (d < end) {
        blockedRows.push({
          date: d.toISOString().split('T')[0],
          source: 'direct_booking',
          booking_id: booking.id,
        })
        d.setDate(d.getDate() + 1)
      }
      await supabase.from('blocked_dates').insert(blockedRows)

      await supabase.from('guests').upsert(
        { phone: guest.phone, name: guest.name, last_stay: dates.checkin },
        { onConflict: 'phone' }
      )
    }

    const nights =
      pricing.nights ||
      Math.max(
        1,
        Math.round(
          (new Date(dates.checkout).getTime() - new Date(dates.checkin).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )

    const payLink = await createPayPlusLink(pricing.total, booking_id, guest)
    const hold = await createDepositHold(booking_id, guest.phone)
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://ashkelon-site.vercel.app'

    const n8nPayload = {
      event: 'new_booking',
      booking_id,
      supabase_id,
      guest,
      dates: { ...dates, nights },
      pricing,
      payment: {
        method: 'payplus',
        status: 'pending',
        payment_url: payLink.payment_url,
        hold,
      },
      source: source || 'direct_website',
      wallet_url: `${site}/w/${wallet_token}`,
      timestamp: new Date().toISOString(),
    }

    // Core booking webhook — fire-and-forget pattern (<2s response)
    void sendToN8n('/new-booking', n8nPayload)

    return NextResponse.json({
      success: true,
      booking_id,
      supabase_id,
      wallet_token,
      wallet_url: `/w/${wallet_token}`,
      payment_url: payLink.payment_url,
      message: 'Booking created pending payment',
      n8n: true,
    })
  } catch (e: unknown) {
    console.error('new-booking error', e)
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
