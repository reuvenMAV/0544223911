'use client'

import { useEffect, useMemo, useState } from 'react'

type Pricing = {
  nights: number
  total: number
  breakdown: { base: number; cleaning: number }
}

export default function BookPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [checkin, setCheckin] = useState(today)
  const [checkout, setCheckout] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().slice(0, 10)
  })
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ booking_id?: string; wallet_url?: string; error?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin, checkout, captureLead: true }),
      })
      const data = await res.json()
      if (!cancelled) {
        setAvailable(data.available)
        setPricing(data.pricing)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [checkin, checkout])

  const submit = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest,
          dates: { checkin, checkout },
          pricing,
          source: 'direct_website',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        if (data.wallet_url) window.location.href = data.wallet_url
      } else {
        setResult({ error: data.error || 'שגיאה בהזמנה' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-sea mb-2">הזמנה מאובטחת</h1>
      <p className="text-gray-600 mb-6">בר כוכבא, אשקלון · Phase1 Core Money + n8n</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm">
          צ׳ק־אין
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="mt-1 w-full border rounded-xl p-3" />
        </label>
        <label className="text-sm">
          צ׳ק־אאוט
          <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className="mt-1 w-full border rounded-xl p-3" />
        </label>
      </div>

      {pricing && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mb-4">
          <p className="font-semibold">
            {available ? '✅ פנוי' : '❌ תפוס'} · {pricing.nights} לילות = {pricing.total}₪
          </p>
          <p className="text-sm text-gray-600">כולל ניקיון {pricing.breakdown.cleaning}₪</p>
        </div>
      )}

      <input
        placeholder="שם מלא"
        value={guest.name}
        onChange={(e) => setGuest({ ...guest, name: e.target.value })}
        className="w-full border rounded-xl p-3 mb-3"
      />
      <input
        placeholder="טלפון 05..."
        value={guest.phone}
        onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
        className="w-full border rounded-xl p-3 mb-3"
      />
      <input
        placeholder="אימייל"
        value={guest.email}
        onChange={(e) => setGuest({ ...guest, email: e.target.value })}
        className="w-full border rounded-xl p-3 mb-3"
      />

      <button
        onClick={submit}
        disabled={loading || !guest.name || !guest.phone || available === false}
        className="w-full bg-black text-white py-4 rounded-2xl font-semibold disabled:opacity-50"
      >
        {loading ? 'יוצר הזמנה...' : `המשך לתשלום · ${pricing?.total || ''}₪`}
      </button>

      <p className="text-xs text-gray-500 mt-3 leading-5">
        פקדון נזק 500₪ ייחסם (לא יחויב). תקנון ביטול: 14 יום החזר מלא −100₪, 7–14 יום 50%, צו פיקוד העורף החזר מלא.
        ההזמנה נשלחת אוטומטית ל־n8n (`/webhook/new-booking`).
      </p>

      {result?.error && <p className="mt-4 text-red-600 text-sm">{result.error}</p>}
      {result?.booking_id && (
        <p className="mt-4 text-green-700 text-sm">נוצרה הזמנה {result.booking_id}</p>
      )}
    </div>
  )
}
