"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ChoiceButtons } from "@/components/ChoiceButtons";
import { ErrorBanner } from "@/components/ErrorBanner";
import { MessageList } from "@/components/MessageList";
import { OtherInput } from "@/components/OtherInput";
import type {
  ChatMessage,
  Choice,
  CoachPhase,
  CoachRequest,
  CoachResponse,
} from "@/lib/types";

const LEARNER_KEY = "english_coach_learner_id";
const SESSION_KEY = "english_coach_session_id";

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function ensureIds(search: string): { learnerId: string; sessionId: string } {
  const params = new URLSearchParams(search);
  const fromQuery = params.get("learner");
  let learnerId =
    fromQuery || readCookie(LEARNER_KEY) || localStorage.getItem(LEARNER_KEY);
  if (!learnerId) learnerId = uuidv4();
  writeCookie(LEARNER_KEY, learnerId);
  localStorage.setItem(LEARNER_KEY, learnerId);

  let sessionId =
    readCookie(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!sessionId) sessionId = uuidv4();
  writeCookie(SESSION_KEY, sessionId);
  localStorage.setItem(SESSION_KEY, sessionId);

  return { learnerId, sessionId };
}

export function ChatShell() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [learnerId, setLearnerId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [phase, setPhase] = useState<CoachPhase>("onboarding");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [lastPayload, setLastPayload] = useState<CoachRequest | null>(null);
  const [recapSessionId, setRecapSessionId] = useState<string | null>(null);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "onboarding":
        return "היכרות";
      case "placement":
        return "בדיקת רמה";
      case "planning":
        return "תוכנית";
      case "lesson":
        return "שיעור";
      case "recap":
        return "סיכום";
      default:
        return "";
    }
  }, [phase]);

  useEffect(() => {
    const ids = ensureIds(window.location.search);
    setLearnerId(ids.learnerId);
    setSessionId(ids.sessionId);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, choices, loading, showOther, error]);

  useEffect(() => {
    if (!bootstrapped || !learnerId || !sessionId || startedRef.current) return;
    startedRef.current = true;
    void sendMessage({
      learnerId,
      sessionId,
      messageType: "start",
      choiceId: null,
      choiceText: null,
      text: null,
      locale: "he",
    });
  }, [bootstrapped, learnerId, sessionId]);

  async function sendMessage(payload: CoachRequest, userVisibleText?: string) {
    setLoading(true);
    setError(null);
    setShowOther(false);
    setLastPayload(payload);

    if (userVisibleText) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "user",
          text: userVisibleText,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: unknown = await response.json();
      const data = json as CoachResponse;

      if (!data?.replyText) {
        throw new Error("invalid_response");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          text: data.replyText,
          createdAt: new Date().toISOString(),
        },
      ]);
      setChoices(data.choices ?? []);
      setPhase(data.phase);
      if (data.meta?.sessionId && data.meta.recapAvailable) {
        setRecapSessionId(data.meta.sessionId);
      }
    } catch {
      setError("לא הצלחנו לקבל תשובה מהמורה. אפשר לנסות שוב.");
      setChoices([]);
    } finally {
      setLoading(false);
    }
  }

  function onSelectChoice(choice: Choice) {
    if (loading) return;
    if (choice.id === "other" || choice.opensTextInput) {
      setShowOther(true);
      return;
    }
    if (choice.label.includes("סיכום") && recapSessionId) {
      router.push(`/recap/${recapSessionId}`);
      return;
    }
    if (choice.label.includes("דף הבית")) {
      router.push("/");
      return;
    }
    void sendMessage(
      {
        learnerId,
        sessionId,
        messageType: "choice",
        choiceId: choice.id,
        choiceText: choice.label,
        text: null,
        locale: "he",
      },
      choice.label,
    );
  }

  if (!bootstrapped) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-4">
        <p className="text-sm text-teal-900/70">טוען את השיעור...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl text-teal-950">מורה אישי לאנגלית</p>
          <p className="text-sm text-teal-900/70">{phaseLabel}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-teal-900/15 bg-white/70 px-3 py-2 text-xs font-medium text-teal-950"
          onClick={() => {
            void sendMessage(
              {
                learnerId,
                sessionId,
                messageType: "end_lesson",
                choiceId: null,
                choiceText: null,
                text: "סיימתי את השיעור",
                locale: "he",
              },
              "סיימתי את השיעור",
            );
          }}
        >
          סיימתי את השיעור
        </button>
      </header>

      <div className="flex-1 space-y-4">
        <MessageList messages={messages} loading={loading} />
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              if (lastPayload) void sendMessage(lastPayload);
            }}
          />
        ) : null}
        {!loading && !showOther && choices.length > 0 ? (
          <ChoiceButtons choices={choices} onSelect={onSelectChoice} />
        ) : null}
        {showOther ? (
          <OtherInput
            disabled={loading}
            onCancel={() => setShowOther(false)}
            onSubmit={(text) => {
              void sendMessage(
                {
                  learnerId,
                  sessionId,
                  messageType: "text",
                  choiceId: "other",
                  choiceText: null,
                  text,
                  locale: "he",
                },
                text,
              );
            }}
          />
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
