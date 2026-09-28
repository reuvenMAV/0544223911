import Link from 'next/link'
export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-sea mb-6">מחירים</h1>
      <div className="space-y-4">
        <div className="border rounded-2xl p-5"><p className="font-bold">אמצע שבוע</p><p>600₪ ללילה</p></div>
        <div className="border rounded-2xl p-5"><p className="font-bold">סופ״ש (שישי–שבת)</p><p>750₪ ללילה</p></div>
        <div className="border rounded-2xl p-5"><p className="font-bold">ניקיון</p><p>200₪ להזמנה</p></div>
        <div className="border rounded-2xl p-5"><p className="font-bold">הנחת שבוע</p><p>10% מ־7 לילות</p></div>
      </div>
      <Link href="/book" className="inline-block mt-8 bg-primary text-white px-6 py-3 rounded-full font-semibold">בדוק זמינות</Link>
    </div>
  )
}
