
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendToN8n } from '@/lib/n8n'
import { createPayPlusLink, createDepositHold } from '@/lib/payplus'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { guest, dates, pricing, source } = body

    // 1. Validate - check double booking in blocked_dates
    const { data: blocked } = await supabaseAdmin
      .from('blocked_dates')
      .select('date')
      .gte('date', dates.checkin)
      .lt('date', dates.checkout)

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: 'Dates not available', blocked }, { status: 409 })
    }

    // 2. Insert booking - status pending until PayPlus IPN
    const wallet_token = Math.random().toString(36).substring(2, 10).toUpperCase()
    const booking_id = `ASK-${Date.now().toString().slice(-4)}`

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        guest_name: guest.name,
        phone: guest.phone,
        email: guest.email,
        checkin: dates.checkin,
        checkout: dates.checkout,
        guests_count: body.guests_count || 2,
        total: pricing.total,
        status: 'pending', // becomes paid after IPN
        source: source || 'direct_website',
        wallet_token,
      })
      .select()
      .single()

    if (error) throw error

    // 3. Block dates
    const blockedRows = []
    let d = new Date(dates.checkin)
    const end = new Date(dates.checkout)
    while (d < end) {
      blockedRows.push({ date: d.toISOString().split('T')[0], source: 'direct_booking', booking_id: booking.id })
      d.setDate(d.getDate() + 1)
    }
    await supabaseAdmin.from('blocked_dates').insert(blockedRows)

    // 4. Upsert guest CRM
    await supabaseAdmin.from('guests').upsert({
      phone: guest.phone,
      name: guest.name,
      last_stay: dates.checkin
    }, { onConflict: 'phone' })

    // 5. Create PayPlus link + deposit hold
    const payLink = await createPayPlusLink(pricing.total, booking_id, guest)
    const hold = await createDepositHold(booking_id, guest.phone)

    // 6. Send to n8n CORE - Respond immediately pattern
    const n8nPayload = {
      event: 'new_booking',
      booking_id,
      supabase_id: booking.id,
      guest,
      dates: { ...dates, nights: blockedRows.length },
      pricing,
      payment: { method: 'payplus', status: 'pending', payment_url: payLink.payment_url, hold },
      source: 'direct_website',
      wallet_url: `${process.env.NEXT_PUBLIC_SITE_URL}/w/${wallet_token}`,
      timestamp: new Date().toISOString()
    }

    // Fire and forget - don't await to keep API <2s
    sendToN8n('/new-booking', n8nPayload)

    return NextResponse.json({
      success: true,
      booking_id,
      supabase_id: booking.id,
      wallet_token,
      wallet_url: `/w/${wallet_token}`,
      payment_url: payLink.payment_url,
      message: 'Booking created pending payment'
    })

  } catch (e: any) {
    console.error('new-booking error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
