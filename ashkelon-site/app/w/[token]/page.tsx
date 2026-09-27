
import { supabaseAdmin } from '@/lib/supabase'

export default async function WalletPage({ params }: { params: { token: string } }) {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('wallet_token', params.token)
    .single()

  if (!booking) return <div style={{padding:20}}>הזמנה לא נמצאה</div>

  return (
    <div dir="rtl" style={{padding:24, fontFamily:'system-ui', maxWidth:480, margin:'0 auto'}}>
      <h1>🏖️ דירת בר כוכבא - כרטיס הגעה</h1>
      <p><b>{booking.guest_name}</b> | {booking.checkin} - {booking.checkout}</p>
      <div style={{background:'#f0f9ff', padding:16, borderRadius:16, marginTop:16}}>
        <p>📍 בר כוכבא, אשקלון - <a href="https://waze.com/ul?q=בר כוכבא אשקלון">פתח Waze</a></p>
        <p>🔑 קוד דלת: {booking.id.slice(0,4)}* - יישלח סופית T-24h</p>
        <p>📶 WiFi: SeaView_5G / 12345678</p>
        <p>🛡️ ממ&quot;ד: במסדרון, זמן התגוננות 45 שניות</p>
        <p>🅿️ חניה: פרטית מס' 12</p>
      </div>
      <a href="#" style={{display:'block', background:'black', color:'white', padding:12, borderRadius:12, textAlign:'center', marginTop:20}}>הוסף ל-Apple Wallet</a>
      <p style={{marginTop:20, fontSize:12, color:'#666'}}>פקדון נזק 500₪ חסום בכרטיס - לא מחויב</p>
    </div>
  )
}
