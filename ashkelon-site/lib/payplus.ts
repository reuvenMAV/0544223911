
export async function createPayPlusLink(amount: number, bookingId: string, guest: {name: string, email?: string, phone: string}) {
  // PayPlus API - Payment Page
  const payload = {
    payment_page_uid: process.env.PAYPLUS_PAYMENT_PAGE_UID,
    charge_method: 1, // 1=charge, 2=token hold for deposit
    amount: amount,
    currency_code: 'ILS',
    ref: bookingId,
    more_info: `Ashkelon ${bookingId}`,
    customer: {
      customer_name: guest.name,
      email: guest.email || 'no-email@mavash.net',
      phone_number: guest.phone
    },
    // For deposit hold 500₪ - second call with charge_method=2 and amount 500
  }
  // Real call - replace with your PayPlus implementation
  // const res = await fetch('https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink', {...})
  // Mock for now returning direct checkout
  return { payment_url: `/book?pay=${bookingId}`, transaction_uid: `pp_${bookingId}` }
}

export async function createDepositHold(bookingId: string, guestPhone: string) {
  // Token hold 500₪ - not charged, only blocked
  return { hold_uid: `hold_${bookingId}`, amount: 500 }
}
