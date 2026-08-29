export const FIXTURE_LEARNER_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_SESSION_ID = "22222222-2222-4222-8222-222222222222";
export const FIXTURE_OTHER_LEARNER_ID = "33333333-3333-4333-8333-333333333333";

export const validCoachRequest = {
  learnerId: FIXTURE_LEARNER_ID,
  sessionId: FIXTURE_SESSION_ID,
  messageType: "start" as const,
  locale: "he" as const,
};

export const validCoachResponse = {
  replyText: "שאלה לדוגמה",
  choices: [
    { id: "1", label: "אפשרות א" },
    { id: "other", label: "אחר / הערות", opensTextInput: true },
  ],
  phase: "onboarding" as const,
  progressSaved: true,
  meta: {},
};

export const choicePayload = {
  ...validCoachRequest,
  messageType: "choice" as const,
  choiceId: "1",
  choiceText: "סדרות וסרטים",
};

export const textPayload = {
  ...validCoachRequest,
  messageType: "text" as const,
  choiceId: "other",
  text: "תשובה חופשית",
};

export const endLessonPayload = {
  ...validCoachRequest,
  messageType: "end_lesson" as const,
  text: "סיימתי את השיעור",
};
