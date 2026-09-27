type Props = { params: { token: string } }

export default function WalletPage({ params }: Props) {
  const wa = process.env.NEXT_PUBLIC_WA_NUMBER || '972544223911'
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center" dir="rtl">
      <h1 className="text-3xl font-extrabold text-sea mb-3">הארנק הדיגיטלי שלך</h1>
      <p className="text-gray-600 mb-2">טוקן: <strong>{params.token}</strong></p>
      <p className="text-gray-600 mb-6">כאן יופיעו הוראות הגעה, קוד Nuki, וקישור תשלום אחרי חיבור מלא.</p>
      <a
        href={`https://wa.me/${wa}?text=${encodeURIComponent('היי, ההזמנה שלי אושרה — טוקן ' + params.token)}`}
        className="inline-block bg-whatsapp text-white px-8 py-3 rounded-full font-semibold"
      >
        דברו איתנו בוואטסאפ
      </a>
    </div>
  )
}
