import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-end overflow-hidden px-5 pb-10 pt-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[url('/hero-wash.svg')] bg-cover bg-center opacity-80"
      />

      <section className="max-w-xl space-y-5">
        <h1 className="font-display text-5xl leading-none text-teal-950 sm:text-6xl">
          מורה אישי לאנגלית
        </h1>
        <p className="text-xl font-semibold text-teal-950/90 sm:text-2xl">
          לומדים אנגלית אמריקאית דרך מה שמעניין אתכם — בקצב שלכם.
        </p>
        <p className="max-w-md text-base leading-7 text-teal-900/80">
          היכרות קצרה, בדיקת רמה ידידותית, ושיעור ראשון מותאם אישית. בלי טפסים
          ארוכים ובלי לחץ.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/chat"
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-teal-950 px-6 text-base font-semibold text-teal-50 shadow-sm"
          >
            התחל ללמוד
          </Link>
          <p className="self-center text-sm text-teal-900/70">
            מתאים לילדים, נוער ומבוגרים
          </p>
        </div>
      </section>
    </main>
  );
}
