'use client'
import { useState } from 'react'

export default function VerifyPage() {
  const [status, setStatus] = useState('')
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'verify_contract',
        guest: { name: fd.get('name'), phone: fd.get('phone'), id: fd.get('id') },
        source: 'verify_page',
      }),
    })
    const data = await res.json()
    setStatus(data.success ? 'נשלח לאימות חוזה (n8n)' : 'שגיאה בשליחה')
  }
  return (
    <div className="max-w-md mx-auto px-4 py-12" dir="rtl">
      <h1 className="text-2xl font-bold text-sea mb-4">אימות וחוזה</h1>
      <form onSubmit={submit} className="space-y-3">
        <input name="name" required placeholder="שם מלא" className="w-full border rounded-xl p-3" />
        <input name="phone" required placeholder="טלפון" className="w-full border rounded-xl p-3" />
        <input name="id" placeholder="ת.ז" className="w-full border rounded-xl p-3" />
        <button className="w-full bg-sea text-white py-3 rounded-xl font-semibold">שלח לאימות</button>
      </form>
      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
  )
}
