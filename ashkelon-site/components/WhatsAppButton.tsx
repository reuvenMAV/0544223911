export default function WhatsAppButton() {
  const wa = process.env.NEXT_PUBLIC_WA_NUMBER || '972544223911'
  const href = `https://wa.me/${wa}?text=${encodeURIComponent('היי ראיתי את הדירה באתר')}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-50 bg-whatsapp text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition"
      aria-label="WhatsApp"
    >
      💬
    </a>
  )
}
