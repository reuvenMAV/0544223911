
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendToN8n } from '@/lib/n8n'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // PayPlus IPN format: { transaction_uid, status_code: 0=success, more_info, ref }
  const { status_code, ref, transaction_uid, amount } = body

  if (status_code === 0) {
    // Mark booking as paid
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'paid', payment_intent_id: transaction_uid })
      .eq('id', ref) // or booking_id mapping
      .select()
      .single()

    // Trigger n8n payment success -> Core workflow continues to Calendar, Invoice, WA
    await sendToN8n('/payment-success', { booking, transaction_uid, amount, ref })

    return NextResponse.json({ success: true })
  } else {
    await sendToN8n('/payment-failed', { ref, status_code, body })
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
