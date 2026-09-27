export default function AmenitiesPage() {
  const items = ['WiFi סיבים', 'חניה פרטית', 'מרחב מוגן דירתי', 'מיזוג בכל החדרים', 'מטבח מאובזר', 'מכונת כביסה', 'טלוויזיה', 'מרפסת לנוף ים']
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-sea mb-6">מה יש בדירה</h1>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((i) => <li key={i} className="bg-sky-50 rounded-xl p-4 font-medium">{i}</li>)}
      </ul>
    </div>
  )
}
