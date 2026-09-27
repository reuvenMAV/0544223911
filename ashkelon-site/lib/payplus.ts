export async function createPayPlusLink(
  amount: number,
  bookingId: string,
  guest: { name: string; email?: string; phone: string }
) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://ashkelon-site.vercel.app'
  // When PayPlus keys exist, real API call can replace this mock
  if (!process.env.PAYPLUS_PAYMENT_PAGE_UID) {
    return { payment_url: `${site}/book?pay=${bookingId}`, transaction_uid: `pp_${bookingId}`, mock: true as const }
  }
  return { payment_url: `${site}/book?pay=${bookingId}`, transaction_uid: `pp_${bookingId}`, mock: true as const }
}

export async function createDepositHold(bookingId: string, _guestPhone: string) {
  return { hold_uid: `hold_${bookingId}`, amount: 500 }
}
