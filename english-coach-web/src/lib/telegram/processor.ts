import { v4 as uuidv4 } from "uuid";
import { runCoach } from "@/lib/n8n-client";
import { loadProgress } from "@/lib/progress";
import { ensureLearner } from "@/lib/progress";
import { parseCoachResponse } from "@/lib/validation";
import {
  getStaticCommandReply,
} from "@/lib/telegram/commands";
import {
  buildCoachRequestFromTelegram,
  buildUnifiedPayload,
  classifyTelegramUpdate,
  extractChatId,
  extractTelegramUserId,
} from "@/lib/telegram/normalize";
import {
  formatCoachResponseForTelegram,
  shouldAwaitFreeText,
} from "@/lib/telegram/format-reply";
import { logTelegramEvent } from "@/lib/telegram/monitoring";
import {
  consumeLinkCode,
  getTelegramLearner,
  isUpdateProcessed,
  markUpdateProcessed,
  resolveCallbackToken,
  updateTelegramLearnerState,
  upsertTelegramLearner,
} from "@/lib/telegram/store";
import type {
  TelegramProcessResult,
  TelegramSendPayload,
  TelegramUpdate,
} from "@/lib/telegram/types";

export type TelegramProcessorOptions = {
  botId: string;
  webUrl?: string;
  createLearnerId?: () => string;
  createSessionId?: () => string;
  runCoachFn?: typeof runCoach;
};

export type TelegramProcessorOutput =
  | {
      kind: "duplicate";
      requestId: string;
    }
  | {
      kind: "reply";
      requestId: string;
      payload: TelegramSendPayload;
      result: TelegramProcessResult;
    }
  | {
      kind: "error";
      requestId: string;
      payload: TelegramSendPayload;
      errorCode: string;
    };

export async function processTelegramUpdate(
  update: TelegramUpdate,
  options: TelegramProcessorOptions,
): Promise<TelegramProcessorOutput> {
  const requestId = uuidv4();
  const started = Date.now();
  const runCoachFn = options.runCoachFn ?? runCoach;

  const telegramUserId = extractTelegramUserId(update);
  const chatId = extractChatId(update);
  if (!telegramUserId || !chatId) {
    return {
      kind: "error",
      requestId,
      payload: { chat_id: chatId ?? 0, text: "לא הצלחנו לזהות את ההודעה." },
      errorCode: "missing_identity",
    };
  }

  if (await isUpdateProcessed(options.botId, update.update_id)) {
    await logTelegramEvent({
      requestId,
      telegramUpdateId: update.update_id,
      telegramUserId,
      chatId,
      errorCode: "duplicate_update",
      sendOk: false,
      responseMs: Date.now() - started,
    });
    return { kind: "duplicate", requestId };
  }

  const classified = classifyTelegramUpdate(update);
  if (classified.kind === "ignored") {
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "error",
      requestId,
      payload: {
        chat_id: chatId,
        text: "לא הבנתי את ההודעה. נסו שוב או שלחו /help.",
      },
      errorCode: classified.reason,
    };
  }

  let learner = await getTelegramLearner(telegramUserId);
  const createLearnerId = options.createLearnerId ?? (() => uuidv4());
  const createSessionId = options.createSessionId ?? (() => uuidv4());

  if (classified.kind === "command" && classified.command === "link") {
    const code = classified.linkCode ?? "";
    const linked = await consumeLinkCode(code);
    if (!linked.ok) {
      const messages: Record<string, string> = {
        invalid_format: "קוד הקישור אינו תקין.",
        not_found: "קוד הקישור לא נמצא.",
        already_used: "קוד הקישור כבר נוצל.",
        expired: "קוד הקישור פג תוקף. צרו קוד חדש באתר.",
      };
      await markUpdateProcessed({
        telegramBotId: options.botId,
        updateId: update.update_id,
        telegramUserId,
      });
      return {
        kind: "error",
        requestId,
        payload: {
          chat_id: chatId,
          text: messages[linked.reason] ?? "קישור נכשל.",
        },
        errorCode: linked.reason,
      };
    }

    learner = await upsertTelegramLearner({
      telegramUserId,
      learnerId: linked.learnerId,
      chatId,
      status: "active",
      sessionId: learner?.sessionId ?? createSessionId(),
    });
    await ensureLearner(linked.learnerId, "he");
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    const linkText = "החשבון קושר בהצלחה! שולחים את שיעור ההיכרות…";
    const coachRequest = {
      learnerId: linked.learnerId,
      sessionId: learner.sessionId ?? createSessionId(),
      messageType: "start" as const,
      choiceId: null,
      choiceText: null,
      text: null,
      locale: "he" as const,
    };
    let reply;
    try {
      reply = await runCoachFn(coachRequest);
    } catch {
      return {
        kind: "reply",
        requestId,
        payload: { chat_id: chatId, text: linkText },
        result: {
          coachRequest,
          reply: {
            replyText: linkText,
            choices: [],
            phase: "onboarding",
            progressSaved: false,
            meta: {},
          },
          chatId,
          requestId,
          monitoring: {
            phase: "onboarding",
            responseMs: Date.now() - started,
            sendOk: true,
          },
        },
      };
    }
    const validated = parseCoachResponse(reply);
    if (!validated.success) {
      return {
        kind: "reply",
        requestId,
        payload: { chat_id: chatId, text: linkText },
        result: {
          coachRequest,
          reply: {
            replyText: linkText,
            choices: [],
            phase: "onboarding",
            progressSaved: false,
            meta: {},
          },
          chatId,
          requestId,
          monitoring: {
            phase: "onboarding",
            responseMs: Date.now() - started,
            sendOk: true,
          },
        },
      };
    }
    const payload = await formatCoachResponseForTelegram(validated.data, {
      learnerId: linked.learnerId,
      sessionId: coachRequest.sessionId,
      chatId,
    });
    return {
      kind: "reply",
      requestId,
      payload: {
        ...payload,
        text: `${linkText}\n\n${payload.text}`,
      },
      result: {
        coachRequest,
        reply: validated.data,
        chatId,
        requestId,
        monitoring: {
          phase: validated.data.phase,
          responseMs: Date.now() - started,
          sendOk: true,
        },
      },
    };
  }

  if (classified.kind === "command" && classified.command === "stop") {
    if (learner) {
      await updateTelegramLearnerState(telegramUserId, {
        status: "stopped",
        awaitingText: false,
      });
    }
    const text =
      getStaticCommandReply("stop") ??
      "עצרתי הודעות לימודיות. שלחו /start כדי לחזור.";
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "reply",
      requestId,
      payload: { chat_id: chatId, text },
      result: {
        coachRequest: {
          learnerId: learner?.learnerId ?? createLearnerId(),
          sessionId: learner?.sessionId ?? createSessionId(),
          messageType: "start",
          locale: "he",
        },
        reply: {
          replyText: text,
          choices: [],
          phase: "onboarding",
          progressSaved: false,
          meta: {},
        },
        chatId,
        requestId,
        skipSend: false,
        monitoring: {
          phase: "onboarding",
          responseMs: Date.now() - started,
          sendOk: true,
        },
      },
    };
  }

  if (
    classified.kind === "command" &&
    (classified.command === "help" || classified.command === "web")
  ) {
    const text = getStaticCommandReply(classified.command, {
      webUrl: options.webUrl,
    });
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "reply",
      requestId,
      payload: { chat_id: chatId, text: text ?? "" },
      result: {
        coachRequest: {
          learnerId: learner?.learnerId ?? createLearnerId(),
          sessionId: learner?.sessionId ?? createSessionId(),
          messageType: "start",
          locale: "he",
        },
        reply: {
          replyText: text ?? "",
          choices: [],
          phase: "onboarding",
          progressSaved: false,
          meta: {},
        },
        chatId,
        requestId,
        monitoring: {
          phase: "onboarding",
          responseMs: Date.now() - started,
          sendOk: true,
        },
      },
    };
  }

  if (classified.kind === "command" && classified.command === "progress") {
    const progress = learner
      ? await loadProgress(learner.learnerId)
      : null;
    const summary = progress
      ? `שלב: ${progress.currentPhase}\nשיעור: ${progress.currentLessonNumber}\nרמה משוערת: ${progress.profile.estimatedCefr ?? "בתהליך"}`
      : undefined;
    const text = getStaticCommandReply("progress", { progressSummary: summary });
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "reply",
      requestId,
      payload: { chat_id: chatId, text: text ?? "" },
      result: {
        coachRequest: {
          learnerId: learner?.learnerId ?? createLearnerId(),
          sessionId: learner?.sessionId ?? createSessionId(),
          messageType: "start",
          locale: "he",
        },
        reply: {
          replyText: text ?? "",
          choices: [],
          phase: progress?.currentPhase ?? "onboarding",
          progressSaved: false,
          meta: {},
        },
        chatId,
        requestId,
        monitoring: {
          phase: progress?.currentPhase ?? "onboarding",
          responseMs: Date.now() - started,
          sendOk: true,
        },
      },
    };
  }

  if (!learner || learner.status === "stopped") {
    if (classified.kind === "command" && classified.command === "start") {
      const learnerId = createLearnerId();
      const sessionId = createSessionId();
      await ensureLearner(learnerId, "he");
      learner = await upsertTelegramLearner({
        telegramUserId,
        learnerId,
        chatId,
        status: "active",
        sessionId,
        awaitingText: false,
      });
    } else if (!learner) {
      const learnerId = createLearnerId();
      const sessionId = createSessionId();
      await ensureLearner(learnerId, "he");
      learner = await upsertTelegramLearner({
        telegramUserId,
        learnerId,
        chatId,
        status: "active",
        sessionId,
      });
    } else {
      await updateTelegramLearnerState(telegramUserId, { status: "active" });
      learner = (await getTelegramLearner(telegramUserId))!;
    }
  }

  if (learner.status === "blocked") {
    return {
      kind: "error",
      requestId,
      payload: { chat_id: chatId, text: "החשבון חסום. פנו לתמיכה." },
      errorCode: "blocked",
    };
  }

  let choiceId: string | undefined;
  if (classified.kind === "callback") {
    const resolved = await resolveCallbackToken(classified.callbackToken);
    if (!resolved || resolved.learnerId !== learner.learnerId) {
      await markUpdateProcessed({
        telegramBotId: options.botId,
        updateId: update.update_id,
        telegramUserId,
      });
      return {
        kind: "error",
        requestId,
        payload: {
          chat_id: chatId,
          text: "הבחירה פגה או אינה תקפה. שלחו /start.",
        },
        errorCode: "invalid_callback",
      };
    }
    choiceId = resolved.choiceId;
    if (shouldAwaitFreeText(choiceId)) {
      await updateTelegramLearnerState(telegramUserId, { awaitingText: true });
      await markUpdateProcessed({
        telegramBotId: options.botId,
        updateId: update.update_id,
        telegramUserId,
      });
      return {
        kind: "reply",
        requestId,
        payload: {
          chat_id: chatId,
          text: "כתבו חופשי את התשובה או ההערה שלכם.",
        },
        result: {
          coachRequest: {
            learnerId: learner.learnerId,
            sessionId: learner.sessionId ?? createSessionId(),
            messageType: "choice",
            choiceId,
            locale: "he",
          },
          reply: {
            replyText: "כתבו חופשי את התשובה או ההערה שלכם.",
            choices: [],
            phase: "onboarding",
            progressSaved: false,
            meta: {},
          },
          chatId,
          requestId,
          monitoring: {
            phase: "onboarding",
            responseMs: Date.now() - started,
            sendOk: true,
          },
        },
      };
    }
  }

  const coachRequest = buildCoachRequestFromTelegram({
    learner,
    classified,
    choiceId,
    forceStart:
      classified.kind === "command" && classified.command === "start",
  });

  if (!coachRequest) {
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "error",
      requestId,
      payload: {
        chat_id: chatId,
        text: "לא הבנתי. שלחו /help או בחרו כפתור.",
      },
      errorCode: "unhandled_input",
    };
  }

  const sessionId = coachRequest.sessionId;
  if (!learner.sessionId) {
    await updateTelegramLearnerState(telegramUserId, { sessionId });
    learner = { ...learner, sessionId };
  }

  let reply;
  try {
    reply = await runCoachFn(coachRequest);
  } catch {
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    await logTelegramEvent({
      requestId,
      telegramUpdateId: update.update_id,
      telegramUserId,
      chatId,
      learnerId: learner.learnerId,
      errorCode: "coach_timeout",
      sendOk: false,
      responseMs: Date.now() - started,
    });
    return {
      kind: "error",
      requestId,
      payload: {
        chat_id: chatId,
        text: "משהו השתבש בדרך למורה. נסו שוב בעוד רגע.",
      },
      errorCode: "coach_timeout",
    };
  }

  const validated = parseCoachResponse(reply);
  if (!validated.success) {
    await markUpdateProcessed({
      telegramBotId: options.botId,
      updateId: update.update_id,
      telegramUserId,
    });
    return {
      kind: "error",
      requestId,
      payload: {
        chat_id: chatId,
        text: "קיבלנו תשובה לא תקינה. נסו שוב.",
      },
      errorCode: "invalid_schema",
    };
  }

  if (coachRequest.messageType === "text") {
    await updateTelegramLearnerState(telegramUserId, { awaitingText: false });
  }

  const payload = await formatCoachResponseForTelegram(validated.data, {
    learnerId: learner.learnerId,
    sessionId,
    chatId,
  });

  await markUpdateProcessed({
    telegramBotId: options.botId,
    updateId: update.update_id,
    telegramUserId,
  });

  const responseMs = Date.now() - started;
  await logTelegramEvent({
    requestId,
    telegramUpdateId: update.update_id,
    telegramUserId,
    chatId,
    learnerId: learner.learnerId,
    phase: validated.data.phase,
    responseMs,
    sendOk: true,
  });

  buildUnifiedPayload(coachRequest, {
    telegramUserId,
    chatId,
    updateId: update.update_id,
    requestId,
  });

  return {
    kind: "reply",
    requestId,
    payload,
    result: {
      coachRequest,
      reply: validated.data,
      chatId,
      requestId,
      monitoring: {
        phase: validated.data.phase,
        responseMs,
        sendOk: true,
      },
    },
  };
}
