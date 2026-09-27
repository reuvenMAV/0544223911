
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Types from your schema
export type BookingPayload = {
  event: string
  booking_id: string
  guest: { name: string; phone: string; email?: string }
  dates: { checkin: string; checkout: string; nights: number }
  pricing: { base: number; cleaning: number; upsells: number; total: number }
  payment: { method: string; status: string; transaction_id?: string }
  source: string
}
