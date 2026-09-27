import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div>
      <section className="relative min-h-[70vh] flex items-end">
        <Image src="/photos/hero.jpg" alt="נוף לים מאשקלון" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 pb-16 text-white">
          <p className="text-sm mb-2 opacity-90">מרחב מוגן דירתי</p>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">דירת נופש 2 דק׳ מהים באשקלון</h1>
          <p className="text-lg max-w-xl mb-6 opacity-95">
            מרחב מוגן, חניה פרטית, מרפסת עם נוף לים. מושלם למשפחות, זוגות וסופ״ש מול הגלים.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className="bg-primary hover:bg-primary-dark px-6 py-3 rounded-full font-semibold">
              בדוק זמינות והזמן
            </Link>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER || '972544223911'}`}
              className="bg-white/15 backdrop-blur border border-white/40 px-6 py-3 rounded-full font-semibold"
            >
              דברו איתנו
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-sm opacity-90">
            <span>WiFi סיבים</span>
            <span>חניה פרטית</span>
            <span>מרחב מוגן</span>
            <span>מיזוג</span>
            <span>Apple Pay</span>
            <span>ביטול חינם*</span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        {[
          { t: '2 דק׳ מהים', d: 'חוף בר כוכבא — הליכה קצרה עם מגבת' },
          { t: 'מרחב מוגן דירתי', d: 'שקט נפשי לכל המשפחה' },
          { t: 'אשקלון', d: 'מרינה, מסעדות, פארק לאומי — הכל קרוב' },
        ].map((x) => (
          <div key={x.t}>
            <h2 className="text-xl font-bold text-sea mb-2">{x.t}</h2>
            <p className="text-gray-600">{x.d}</p>
          </div>
        ))}
      </section>

      <section className="bg-sky-50 py-14 text-center px-4">
        <h2 className="text-3xl font-extrabold text-sea mb-3">חופשה מתחילה כאן</h2>
        <p className="text-gray-600 mb-6">הזמנה ישירה — בלי עמלות, בלי תיווך · מחובר ל־n8n</p>
        <Link href="/book" className="inline-block bg-primary text-white px-8 py-3 rounded-full font-semibold">
          בדוק זמינות
        </Link>
      </section>
    </div>
  )
}
