import { NextRequest, NextResponse } from 'next/server'
import { sendToN8n } from '@/lib/n8n'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = String(body.message || '').trim()
    const phoneMatch = message.match(/0?5\d{8}/)

    void sendToN8n('/chatbot-lead', {
      event: 'chatbot_lead',
      message,
      timestamp: new Date().toISOString(),
      source: 'chat_widget',
    })

    if (phoneMatch) {
      void sendToN8n('/chat-to-wa', {
        event: 'chat_to_wa',
        phone: phoneMatch[0],
        message,
        booking_link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://booking.mavash.net'}/book`,
        timestamp: new Date().toISOString(),
      })
    }

    const lower = message.toLowerCase()
    let reply =
      'שמחים שפניתם! אפשר לבדוק זמינות בדף ההזמנה, או לכתוב מספר טלפון ונחזור בוואטסאפ.'
    if (lower.includes('מחיר') || lower.includes('כמה') || message.includes('₪')) {
      reply =
        'מחיר בסיס: 600₪ ללילה (ראשון–רביעי)\nסופ״ש: 750₪ ללילה\nניקיון: 200₪\nהנחת שבוע: 10%\n\nלהזמנה לחצו על הכפתור למעלה 👆'
    }

    return NextResponse.json({ reply })
  } catch (e: unknown) {
    return NextResponse.json({
      reply: 'שגיאה זמנית. אפשר לנסות שוב או לדבר בוואטסאפ 👇',
    })
  }
}
