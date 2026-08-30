import { FormEvent, useMemo, useState } from "react";
import { yaelContact } from "@/lib/yaelContact";

function param(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function Survey() {
  const initial = useMemo(() => ({
    id: param("id"),
    name: param("name"),
    phone: param("phone"),
  }), []);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (rating < 1 || rating > 5) {
      setError("בחרי דירוג בין 1 ל-5");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: initial.id, name, phone, rating, feedback }),
      });
      if (!response.ok) throw new Error("submit_failed");
      setDone(true);
    } catch {
      setError("לא הצלחנו לשמור את הסקר. נסי שוב בעוד רגע.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#fbf9ff] px-5 py-12 text-[#343145]">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-[#eadfeb] bg-white/80 p-8 shadow-xl shadow-[#8d779c]/10">
        <p className="text-xs tracking-[0.28em] text-[#9b7798]">YAEL MAVASHEV</p>
        <h1 className="mt-3 font-serif text-4xl text-[#554b72]">סקר קצר</h1>
        <p className="mt-4 leading-7 text-[#77718b]">תודה שביקרת. הדירוג נשמר אצל יעל בלבד. חוות דעת לא תפורסם באתר בלי אישור.</p>
        {done ? (
          <div className="mt-8 rounded-2xl bg-[#e1f1e7] p-6 text-[#5e9278]" role="status">
            תודה{name ? ` ${name}` : ""}! קיבלנו את הדירוג.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm">
              <span>שם</span>
              <input className="h-12 w-full rounded-xl border border-[#e8deeb] bg-white px-3" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block space-y-2 text-sm">
              <span>טלפון</span>
              <input className="h-12 w-full rounded-xl border border-[#e8deeb] bg-white px-3" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </label>
            <div className="space-y-2">
              <p className="text-sm">דירוג</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`h-12 flex-1 rounded-full border text-sm ${rating === value ? "bg-[#5c5278] text-white" : "border-[#d9ccdf] bg-white text-[#554b72]"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <label className="block space-y-2 text-sm">
              <span>משוב (אופציונלי)</span>
              <textarea className="min-h-28 w-full rounded-xl border border-[#e8deeb] bg-white p-3" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </label>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-[#5c5278] text-white">
              {pending ? "שולחת…" : "שליחת הסקר"}
            </button>
          </form>
        )}
        <a href={yaelContact.phoneHref} className="mt-8 block text-center text-sm text-[#9b7798]">{yaelContact.phoneDisplay}</a>
      </div>
    </div>
  );
}
