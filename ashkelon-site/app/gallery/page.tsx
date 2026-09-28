import Image from 'next/image'

const photos = [
  ['hero.jpg', 'נוף לים מהמרפסת'],
  ['living.jpg', 'סלון'],
  ['bedroom1.jpg', 'חדר שינה ראשי'],
  ['bedroom2.jpg', 'חדר שינה שני'],
  ['kitchen.jpg', 'מטבח'],
  ['bathroom.jpg', 'חדר רחצה'],
  ['balcony.jpg', 'מרפסת'],
  ['mamad.jpg', 'מרחב מוגן דירתי'],
  ['parking.jpg', 'חניה'],
  ['beach.jpg', 'חוף בר כוכבא'],
  ['marina.jpg', 'מרינה אשקלון'],
  ['view.jpg', 'נוף מהדירה'],
]

export default function GalleryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-sea mb-2">גלריה</h1>
      <p className="text-gray-600 mb-8">הציצו לתוך הדירה וסביבתה</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map(([src, alt]) => (
          <div key={src} className="relative aspect-[4/3] rounded-2xl overflow-hidden">
            <Image src={`/photos/${src}`} alt={alt} fill className="object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-sm p-2">{alt}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
