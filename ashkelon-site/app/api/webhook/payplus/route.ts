import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendToN8n } from '@/lib/n8n'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { status_code, ref, transaction_uid, amount } = body
    const supabase = getSupabaseAdmin()

    if (status_code === 0) {
      let booking = null
      if (supabase && ref) {
        const { data } = await supabase
          .from('bookings')
          .update({ status: 'paid', payment_intent_id: transaction_uid })
          .or(`id.eq.${ref},booking_id.eq.${ref}`)
          .select()
          .maybeSingle()
        booking = data
      }

      await sendToN8n('/payment-status', {
        event: 'payment_success',
        booking,
        transaction_uid,
        amount,
        ref,
        body,
      })
      // Spec alias
      await sendToN8n('/payment-success', {
        event: 'payment_success',
        booking,
        transaction_uid,
        amount,
        ref,
      })

      return NextResponse.json({ success: true })
    }

    await sendToN8n('/payment-status', {
      event: 'payment_failed',
      ref,
      status_code,
      body,
    })
    await sendToN8n('/payment-failed', { ref, status_code, body })

    return NextResponse.json({ success: false }, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
