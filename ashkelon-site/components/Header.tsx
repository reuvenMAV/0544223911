import Link from 'next/link'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-sea text-xl">
          <span className="text-2xl">🌊</span>
          <span>אשקלון סיסייד</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-primary">דף הבית</Link>
          <Link href="/gallery" className="hover:text-primary">גלריה</Link>
          <Link href="/amenities" className="hover:text-primary">מה יש בדירה</Link>
          <Link href="/location" className="hover:text-primary">מיקום</Link>
          <Link href="/pricing" className="hover:text-primary">מחירים</Link>
          <Link href="/reviews" className="hover:text-primary">ביקורות</Link>
          <Link href="/faq" className="hover:text-primary">שאלות נפוצות</Link>
        </nav>
        <Link
          href="/book"
          className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-dark"
        >
          הזמן עכשיו
        </Link>
      </div>
    </header>
  )
}
