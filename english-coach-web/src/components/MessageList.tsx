"use client";

import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
  loading?: boolean;
};

export function MessageList({ messages, loading }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div
            key={message.id}
            className={`flex ${isUser ? "justify-start" : "justify-end"}`}
          >
            <div
              dir="auto"
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-7 shadow-sm ${
                isUser
                  ? "bg-amber-100 text-teal-950"
                  : "bg-white/90 text-teal-950"
              }`}
            >
              {message.text}
            </div>
          </div>
        );
      })}
      {loading ? (
        <div className="flex justify-end">
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-teal-900/70">
            חושב על השאלה הבאה...
          </div>
        </div>
      ) : null}
    </div>
  );
}
