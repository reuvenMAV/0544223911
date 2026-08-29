"use client";

import { useCallback, useState } from "react";

type LinkCodeResponse = {
  code: string;
  expiresAt: string;
  expiresInMinutes: number;
  instructions: string;
  telegramCommand: string;
  deepLink: string | null;
};

export function TelegramLinkPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<LinkCodeResponse | null>(null);

  const requestCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/telegram/link-code", {
        method: "POST",
      });
      const json: unknown = await response.json();
      if (!response.ok) {
        setError("לא הצלחנו ליצור קוד קישור. נסו שוב.");
        return;
      }
      setLinkData(json as LinkCodeResponse);
    } catch {
      setError("שגיאת רשת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
      <h2 className="text-base font-semibold text-emerald-900">
        חיבור Telegram
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        קשרו את חשבון הלמידה מהאתר לבוט בטלגרם באמצעות קוד חד-פעמי.
      </p>
      <button
        type="button"
        onClick={() => void requestCode()}
        disabled={loading}
        className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "יוצר קוד..." : "צור קוד קישור"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {linkData ? (
        <div className="mt-3 space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>
            קוד: <strong dir="ltr">{linkData.code}</strong>
          </p>
          <p>תוקף: {linkData.expiresInMinutes} דקות</p>
          <p>{linkData.instructions}</p>
          <p dir="ltr" className="font-mono text-xs">
            {linkData.telegramCommand}
          </p>
          {linkData.deepLink ? (
            <a
              href={linkData.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-emerald-800 underline"
            >
              פתיחת הבוט בטלגרם
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
