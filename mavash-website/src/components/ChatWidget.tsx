"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WHATSAPP_URL } from "@/lib/site";
import { getChatSessionId, sendChatMessage } from "@/lib/n8n-chat";

type ChatMessage = { from: "bot" | "user"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "היי! 👋 אני העוזר של Mavash. איך אפשר לעזור לעסק שלכם?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionId.current = getChatSessionId();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { from: "user", text }]);
    setLoading(true);

    try {
      const reply = await sendChatMessage(text, sessionId.current, {
        source: "אתר — Mavash",
        pageUrl: window.location.href,
      });
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "אופס, משהו השתבש. אפשר לכתוב לנו ישירות בוואטסאפ 🙂",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Link
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="שיחה בוואטסאפ"
        className="fixed bottom-5 left-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-110"
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </Link>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "סגירת צ'אט" : "פתיחת צ'אט"}
        className="fixed bottom-5 left-20 z-50 grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white shadow-xl"
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-50 flex h-[min(480px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={`${msg.from}-${i}`}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  msg.from === "user"
                    ? "ms-auto bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="כתבו הודעה..."
              disabled={loading}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="שליחה"
              className="grid h-10 w-10 place-items-center rounded-full bg-sky-600 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
