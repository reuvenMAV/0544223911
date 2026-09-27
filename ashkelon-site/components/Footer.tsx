import Link from 'next/link'

export default function Footer() {
  const wa = process.env.NEXT_PUBLIC_WA_NUMBER || '972544223911'
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-4">🌊 אשקלון סיסייד</h3>
          <p className="text-sm leading-6">דירת נופש על הים באשקלון</p>
          <p className="text-sm">חוף בר כוכבא, אשקלון</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">ניווט</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/gallery" className="hover:text-white">גלריה</Link></li>
            <li><Link href="/amenities" className="hover:text-white">מה יש בדירה</Link></li>
            <li><Link href="/pricing" className="hover:text-white">מחירים</Link></li>
            <li><Link href="/faq" className="hover:text-white">שאלות נפוצות</Link></li>
            <li><Link href="/terms" className="hover:text-white">תקנון</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">צור קשר</h4>
          <p className="text-sm mb-2">📞 WhatsApp {wa.replace(/^972/, '0')}</p>
          <p className="text-sm mb-2">📧 info@ashkelon-seaside.co.il</p>
          <Link
            href="/book"
            className="inline-block bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary-dark mt-2"
          >
            הזמן עכשיו
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-500">
        © {new Date().getFullYear()} אשקלון סיסייד. כל הזכויות שמורות. · Phase1 + n8n
      </div>
    </footer>
  )
}
