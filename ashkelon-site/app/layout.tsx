import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'דירת נופש באשקלון על הים | 2 דק׳ מהמרינה - עם ממ״ד',
  description:
    'דירת נופש מושלמת לחופשה באשקלון - 2 דק׳ מהים, ממ״ד, חניה, מרפסת לים. הזמנה ישירה ללא עמלות.',
  keywords: [
    'דירת נופש באשקלון',
    'צימר באשקלון',
    'דירה להשכרה יומית אשקלון',
    'דירה על הים אשקלון',
  ],
  openGraph: {
    title: 'דירת נופש באשקלון על הים',
    description: '2 דק׳ מחוף בר כוכבא, ממ״ד, חניה פרטית, מרפסת עם נוף לים',
    type: 'website',
    locale: 'he_IL',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c4a6e" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
        <ChatWidget />
      </body>
    </html>
  )
}
