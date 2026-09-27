'use client'
import { useState } from 'react'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      setReply(data.reply || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white border shadow-xl rounded-2xl p-4">
          <p className="font-semibold mb-2">שאלו אותנו</p>
          <textarea
            className="w-full border rounded-xl p-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="שאלה על זמינות / מחיר..."
          />
          <button
            onClick={send}
            disabled={loading}
            className="mt-2 w-full bg-sea text-white rounded-full py-2 text-sm font-semibold"
          >
            {loading ? 'שולח...' : 'שלח'}
          </button>
          {reply && <p className="mt-3 text-sm whitespace-pre-wrap bg-sky-50 p-2 rounded-xl">{reply}</p>}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-sea text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold"
      >
        {open ? 'סגור' : 'שאלו אותנו'}
      </button>
    </div>
  )
}
