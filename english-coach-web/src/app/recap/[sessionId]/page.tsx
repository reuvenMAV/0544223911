"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LessonRecap } from "@/lib/types";

export default function RecapPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [sessionId, setSessionId] = useState<string>("");
  const [recap, setRecap] = useState<LessonRecap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setSessionId(value.sessionId));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    void fetch(`/api/recap/${sessionId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        return response.json();
      })
      .then((data: LessonRecap) => setRecap(data))
      .catch(() => setError("לא מצאנו סיכום לשיעור הזה עדיין."));
  }, [sessionId]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-8">
      <p className="font-display text-3xl text-teal-950">סיכום שיעור</p>
      <p className="mt-2 text-sm text-teal-900/70">
        מילים, כללים, וצעד קטן להמשך
      </p>

      {error ? (
        <p className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {error}
        </p>
      ) : null}

      {!error && !recap ? (
        <p className="mt-6 text-sm text-teal-900/70">טוען סיכום...</p>
      ) : null}

      {recap ? (
        <div className="mt-6 space-y-5">
          {recap.cefr ? (
            <p className="text-sm text-teal-900/80">
              רמה משוערת: <strong>{recap.cefr}</strong>
              {recap.lessonNumber ? ` · שיעור ${recap.lessonNumber}` : ""}
            </p>
          ) : null}

          <section className="rounded-2xl bg-white/80 p-4">
            <h2 className="font-semibold text-teal-950">מילים וביטויים שלמדנו</h2>
            <ul className="mt-2 list-disc pr-5 text-sm leading-7 text-teal-950">
              {recap.words.map((word) => (
                <li key={word} dir="auto">
                  {word}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white/80 p-4">
            <h2 className="font-semibold text-teal-950">כללים או תבניות שלמדנו</h2>
            <ul className="mt-2 list-disc pr-5 text-sm leading-7 text-teal-950">
              {recap.rules.map((rule) => (
                <li key={rule} dir="auto">
                  {rule}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white/80 p-4">
            <h2 className="font-semibold text-teal-950">מה נחזור עליו בפעם הבאה</h2>
            <ul className="mt-2 list-disc pr-5 text-sm leading-7 text-teal-950">
              {recap.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Link
          href="/chat"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-teal-950 px-4 text-sm font-semibold text-white"
        >
          חזרה לצ׳אט
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-teal-900/20 bg-white/70 px-4 text-sm font-medium"
        >
          דף הבית
        </Link>
      </div>
    </main>
  );
}
