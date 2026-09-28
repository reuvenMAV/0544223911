const faqs = [
  ['יש ממ״ד?', 'כן — מרחב מוגן דירתי.'],
  ['יש חניה?', 'כן, חניה פרטית.'],
  ['מה מדיניות הביטול?', '14 יום החזר מלא פחות 100₪; 7–14 יום 50%; צו פיקוד העורף — החזר מלא.'],
  ['איך מקבלים קוד כניסה?', 'נשלח בוואטסאפ 24 שעות לפני הצ׳ק־אין (Workflow Pre-Arrival + Nuki).'],
]
export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-sea mb-6">שאלות נפוצות</h1>
      <div className="space-y-4">
        {faqs.map(([q,a]) => (
          <div key={q} className="border rounded-2xl p-5">
            <p className="font-bold mb-1">{q}</p>
            <p className="text-gray-600">{a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
