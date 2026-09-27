
'use client'
import { useState, useEffect } from 'react'

export default function BookPage() {
  const [checkin, setCheckin] = useState('2026-09-20')
  const [checkout, setCheckout] = useState('2026-09-22')
  const [pricing, setPricing] = useState<any>(null)
  const [available, setAvailable] = useState<boolean|null>(null)
  const [guest, setGuest] = useState({name:'', phone:'', email:''})

  useEffect(()=>{
    fetch('/api/check-availability', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({checkin, checkout})})
      .then(r=>r.json()).then(d=>{setAvailable(d.available); setPricing(d.pricing)})
  }, [checkin, checkout])

  const submit = async () => {
    const res = await fetch('/api/new-booking', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        guest,
        dates: {checkin, checkout},
        pricing,
        source: 'direct_website'
      })
    })
    const data = await res.json()
    if (data.success) {
      window.location.href = data.wallet_url
    } else {
      alert(data.error)
    }
  }

  return (
    <div dir="rtl" style={{padding:24, maxWidth:480, margin:'0 auto'}}>
      <h1>הזמנה מאובטחת - בר כוכבא</h1>
      <input type="date" value={checkin} onChange={e=>setCheckin(e.target.value)} />
      <input type="date" value={checkout} onChange={e=>setCheckout(e.target.value)} />
      {pricing && <div style={{background:'#f0f9ff', padding:12, margin:'12px 0', borderRadius:12}}>
        {available ? '✅ פנוי' : '❌ תפוס'} - {pricing.nights} לילות = {pricing.total}₪
        <br/>כולל ניקיון {pricing.breakdown.cleaning}₪
      </div>}
      <input placeholder="שם מלא" value={guest.name} onChange={e=>setGuest({...guest, name:e.target.value})} style={{width:'100%', padding:12, margin:'8px 0'}} />
      <input placeholder="טלפון 05..." value={guest.phone} onChange={e=>setGuest({...guest, phone:e.target.value})} style={{width:'100%', padding:12}} />
      <input placeholder="אימייל" value={guest.email} onChange={e=>setGuest({...guest, email:e.target.value})} style={{width:'100%', padding:12, marginTop:8}} />
      <button onClick={submit} style={{width:'100%', background:'black', color:'white', padding:16, borderRadius:12, marginTop:16}}>
         Pay עם Apple Pay - {pricing?.total || ''}₪
      </button>
      <p style={{fontSize:11, marginTop:8}}>פקדון נזק 500₪ ייחסם (לא יחויב) - תקנון ביטול: 14 יום החזר מלא -100₪, 7-14 יום 50%, צו פיקוד העורף החזר מלא</p>
    </div>
  )
}
