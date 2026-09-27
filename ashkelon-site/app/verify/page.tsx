
'use client'
import { useState } from 'react'
export default function Verify() {
  const [idFile, setIdFile] = useState<File|null>(null)
  return (
    <div dir="rtl" style={{padding:24, maxWidth:480, margin:'0 auto'}}>
      <h1>אימות אורח + חוזה</h1>
      <p>לפי חוק - חובה להעלות ת.ז + חתימה</p>
      <input type="file" onChange={e=>setIdFile(e.target.files?.[0]||null)} />
      <button style={{background:'#0ea5e9', color:'white', padding:12, borderRadius:12, width:'100%', marginTop:16}}
        onClick={()=>alert('נשלח ל-SignNow + Supabase')}>
        חתום ושלח
      </button>
    </div>
  )
}
