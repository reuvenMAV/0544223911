import { selectCocaSample } from "@/lib/coca";
import {
  createEmptyProgress,
  loadProgress,
  saveProgress,
  saveSessionRecap,
} from "@/lib/progress";
import type {
  Choice,
  CoachRequest,
  CoachResponse,
  LessonRecap,
  ProgressSnapshot,
} from "@/lib/types";

function otherChoice(label = "אחר / הערות — אפשר לכתוב חופשי"): Choice {
  return { id: "other", label, opensTextInput: true };
}

function choices(
  items: Array<{ id: string; label: string }>,
  withOther = true,
): Choice[] {
  const mapped = items.map((item) => ({ id: item.id, label: item.label }));
  return withOther ? [...mapped, otherChoice()] : mapped;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function userText(req: CoachRequest): string {
  if (req.messageType === "choice") {
    return (req.choiceText || req.choiceId || "").trim();
  }
  if (req.messageType === "text" || req.messageType === "end_lesson") {
    return (req.text || "").trim();
  }
  return "";
}

type PlacementItem = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string; correct?: boolean }>;
};

const PLACEMENT_BANK: PlacementItem[] = [
  {
    id: "p1",
    prompt: "What does “home” mean?",
    options: [
      { id: "a", label: "בית", correct: true },
      { id: "b", label: "אוכל" },
      { id: "c", label: "משחק" },
    ],
  },
  {
    id: "p2",
    prompt: "Choose the best sentence:",
    options: [
      { id: "a", label: "I watching a show." },
      { id: "b", label: "I watch a show.", correct: true },
      { id: "c", label: "I watches a show." },
    ],
  },
  {
    id: "p3",
    prompt: "“Friend” means:",
    options: [
      { id: "a", label: "חבר/ה", correct: true },
      { id: "b", label: "מורה" },
      { id: "c", label: "עיר" },
    ],
  },
  {
    id: "p4",
    prompt: "Complete: Yesterday I ____ a movie.",
    options: [
      { id: "a", label: "watch" },
      { id: "b", label: "watched", correct: true },
      { id: "c", label: "watching" },
    ],
  },
  {
    id: "p5",
    prompt: "Which question is correct?",
    options: [
      { id: "a", label: "Where you live?" },
      { id: "b", label: "Where do you live?", correct: true },
      { id: "c", label: "Where does you live?" },
    ],
  },
  {
    id: "p6",
    prompt: "“Recommend” is closest to:",
    options: [
      { id: "a", label: "להמליץ", correct: true },
      { id: "b", label: "לשכוח" },
      { id: "c", label: "לסגור" },
    ],
  },
  {
    id: "p7",
    prompt: "Pick a natural reply: “How was the episode?”",
    options: [
      { id: "a", label: "It was exciting.", correct: true },
      { id: "b", label: "I am episode." },
      { id: "c", label: "Yes, food." },
    ],
  },
  {
    id: "p8",
    prompt: "Write/choose a short opinion:",
    options: [
      { id: "a", label: "I like this show because it is funny.", correct: true },
      { id: "b", label: "I like because funny show." },
      { id: "c", label: "Show funny me like." },
    ],
  },
];

function estimateCefr(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio < 0.25) return "Pre-A1";
  if (ratio < 0.4) return "A1";
  if (ratio < 0.6) return "A2";
  if (ratio < 0.8) return "B1";
  return "B2";
}

function buildRecap(
  learnerId: string,
  sessionId: string,
  progress: ProgressSnapshot,
): LessonRecap {
  const words = progress.vocabulary.slice(-5).map((v) => `${v.item} — ${v.meaning}`);
  const sample = selectCocaSample({
    cefr: progress.profile.estimatedCefr,
    interests: progress.profile.interests,
    limit: 3,
  });
  for (const entry of sample) {
    if (!progress.vocabulary.some((v) => v.item === entry.word)) {
      words.push(`${entry.word} — word from your level path`);
    }
  }

  return {
    sessionId,
    learnerId,
    words: words.length
      ? words
      : ["home — בית", "friend — חבר/ה", "watch — לצפות"],
    rules: [
      "Present simple: I watch / she watches",
      "Past simple regular: watch → watched",
    ],
    nextSteps: [
      "לחזור על 3 המילים מהשיעור בקול",
      "לכתוב משפט אחד על תחום העניין שלך",
    ],
    cefr: progress.profile.estimatedCefr,
    lessonNumber: progress.currentLessonNumber,
    createdAt: new Date().toISOString(),
  };
}

function onboardingReply(
  progress: ProgressSnapshot,
  answer: string,
): { progress: ProgressSnapshot; response: Omit<CoachResponse, "progressSaved"> } {
  const step = progress.onboardingStep;

  if (step === 0) {
    progress.onboardingStep = 1;
    return {
      progress,
      response: {
        replyText:
          "היי, אני הסוכן האישי שלך ללימוד אנגלית. אני כאן כדי לעזור לך ללמוד אנגלית בקלות, דרך הדברים שמעניינים אותך ובהתאמה מלאה לרמה שלך.\n\nמה הכי מעניין אותך עכשיו?",
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "סדרות וסרטים" },
          { id: "2", label: "מוזיקה" },
          { id: "3", label: "ספורט" },
          { id: "4", label: "משחקים" },
          { id: "5", label: "אוכל וטיולים" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 1) {
    progress.profile.interests = [answer || "סדרות וסרטים"];
    progress.onboardingStep = 2;
    return {
      progress,
      response: {
        replyText: `מעולה — נשתמש ב«${progress.profile.interests[0]}» בשיעורים. מה דוגמה ספציפית בתוך זה?`,
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "משהו מצחיק / קומדיה" },
          { id: "2", label: "משהו מרגש / אקשן" },
          { id: "3", label: "משהו רגוע / יומיומי" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 2) {
    progress.profile.interests = [
      progress.profile.interests[0] ?? "interests",
      answer || "קומדיה",
    ];
    progress.onboardingStep = 3;
    return {
      progress,
      response: {
        replyText: "יש תחום עניין נוסף שכדאי לשלב?",
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "מוזיקה" },
          { id: "2", label: "עבודה / לימודים" },
          { id: "3", label: "טיולים" },
          { id: "4", label: "אין צורך — נמשיך עם מה שבחרתי" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 3) {
    if (answer && !answer.includes("אין צורך")) {
      progress.profile.interests.push(answer);
    }
    progress.onboardingStep = 4;
    return {
      progress,
      response: {
        replyText: "לאיזו קבוצת גיל הכי מתאים להתאים את השיעורים?",
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "ילד/ה" },
          { id: "2", label: "נער/ה" },
          { id: "3", label: "מבוגר/ת" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 4) {
    progress.profile.ageGroup = answer.includes("ילד")
      ? "child"
      : answer.includes("נער")
        ? "teen"
        : "adult";
    progress.onboardingStep = 5;
    return {
      progress,
      response: {
        replyText: "למה חשוב לך ללמוד אנגלית עכשיו?",
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "לדבר בביטחון ביום־יום" },
          { id: "2", label: "לעבודה / לימודים" },
          { id: "3", label: "לטיולים וחו״ל" },
          { id: "4", label: "להבין סדרות ותוכן באנגלית" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 5) {
    progress.profile.learningGoal = answer || "לדבר בביטחון";
    progress.onboardingStep = 6;
    return {
      progress,
      response: {
        replyText: "על מה תרצה להתמקד קודם?",
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "דיבור" },
          { id: "2", label: "אוצר מילים" },
          { id: "3", label: "דקדוק" },
          { id: "4", label: "הכול — אני רוצה לחזק את כל תחומי האנגלית" },
        ]),
        meta: {},
      },
    };
  }

  if (step === 6) {
    progress.profile.learningFocus = answer || "הכול";
    progress.onboardingStep = 7;
    const interests = progress.profile.interests.join(", ");
    return {
      progress,
      response: {
        replyText: `בדקתי שהבנתי נכון:\n• תחומי עניין: ${interests}\n• מטרה: ${progress.profile.learningGoal}\n• מיקוד: ${progress.profile.learningFocus}\n• קבוצת גיל: ${progress.profile.ageGroup}\n\nהאם זה מדויק?`,
        phase: "onboarding",
        choices: choices([
          { id: "1", label: "הכול מדויק — אפשר לעבור לבדיקת הרמה" },
          { id: "2", label: "אני רוצה לשנות את המטרה" },
          { id: "3", label: "אני רוצה לשנות את תחומי העניין" },
        ]),
        meta: {},
      },
    };
  }

  // step 7 confirm
  if (answer.includes("לשנות את המטרה")) {
    progress.onboardingStep = 5;
    return onboardingReply(progress, "");
  }
  if (answer.includes("לשנות את תחומי")) {
    progress.onboardingStep = 1;
    progress.profile.interests = [];
    return onboardingReply(progress, "");
  }

  progress.currentPhase = "placement";
  progress.placementStep = 0;
  progress.placementScore = 0;
  progress.placementAnswers = [];
  return {
    progress,
    response: {
      replyText:
        "מעולה. עכשיו נבדוק יחד את הרמה הנוכחית שלך בכמה שאלות קצרות — זה לא מבחן רשמי, רק כדי להתאים את השיעורים.",
      phase: "placement",
      choices: choices([{ id: "1", label: "קדימה, בואו נתחיל" }]),
      meta: {},
    },
  };
}

function askPlacementQuestion(
  progress: ProgressSnapshot,
  index: number,
): { progress: ProgressSnapshot; response: Omit<CoachResponse, "progressSaved"> } {
  const item = PLACEMENT_BANK[index];
  const shuffled = shuffle(item.options).map((o, idx) => ({
    id: String(idx + 1),
    label: o.label,
  }));

  return {
    progress,
    response: {
      replyText: `שאלה ${index + 1}/${PLACEMENT_BANK.length}:\n${item.prompt}`,
      phase: "placement",
      choices: [
        ...shuffled,
        otherChoice("My own answer / comments — write freely"),
      ],
      meta: {},
    },
  };
}

function finishPlacement(progress: ProgressSnapshot): {
  progress: ProgressSnapshot;
  response: Omit<CoachResponse, "progressSaved">;
} {
  const cefr = estimateCefr(
    progress.placementScore,
    progress.placementAnswers.length || PLACEMENT_BANK.length,
  );
  progress.profile.estimatedCefr = cefr;
  progress.currentPhase = "planning";
  progress.planningStep = 1;

  return {
    progress,
    response: {
      replyText: `סיימנו את הבדיקה הקצרה.\n\nההערכה שלי: רמה ${cefr} (הערכה לימודית, לא תעודה רשמית).\nמה שכבר עובד: הבנת מילים בסיסיות ובחירת משפטים.\nמה נחזק קודם: בניית משפטים מדויקים סביב «${progress.profile.interests[0] ?? "התחומים שלך"}».\n\nכמה שיעורים בשבוע מתאים לך?`,
      phase: "planning",
      choices: choices([
        { id: "1", label: "2 שיעורים בשבוע" },
        { id: "2", label: "3 שיעורים בשבוע" },
        { id: "3", label: "4+ שיעורים בשבוע" },
      ]),
      meta: { cefr },
    },
  };
}

function placementReply(
  progress: ProgressSnapshot,
  req: CoachRequest,
): { progress: ProgressSnapshot; response: Omit<CoachResponse, "progressSaved"> } {
  const answer = userText(req);

  // Intro acknowledgment → first question
  if (progress.placementStep === 0) {
    progress.placementStep = 1;
    return askPlacementQuestion(progress, 0);
  }

  const currentIndex = progress.placementAnswers.length;
  if (currentIndex < PLACEMENT_BANK.length && answer && !answer.includes("קדימה")) {
    const item = PLACEMENT_BANK[currentIndex];
    const selected = item.options.find((o) => o.label === answer);
    const correct =
      Boolean(selected?.correct) ||
      (req.messageType === "text" && answer.length > 8);
    progress.placementAnswers.push({ questionId: item.id, correct });
    if (correct) progress.placementScore += 1;
  }

  const nextIndex = progress.placementAnswers.length;
  if (nextIndex < PLACEMENT_BANK.length) {
    progress.placementStep = nextIndex + 1;
    return askPlacementQuestion(progress, nextIndex);
  }

  return finishPlacement(progress);
}

function planningReply(
  progress: ProgressSnapshot,
  answer: string,
): {
  progress: ProgressSnapshot;
  response: Omit<CoachResponse, "progressSaved">;
  checkpoint?: string;
} {
  if (progress.planningStep === 1) {
    progress.profile.lessonsPerWeek = answer || "3 שיעורים בשבוע";
    progress.planningStep = 2;
    return {
      progress,
      response: {
        replyText: "כמה דקות לשיעור?",
        phase: "planning",
        choices: choices([
          { id: "1", label: "10–15 דקות" },
          { id: "2", label: "20–25 דקות" },
          { id: "3", label: "30–40 דקות" },
        ]),
        meta: { cefr: progress.profile.estimatedCefr },
      },
    };
  }

  if (progress.planningStep === 2) {
    progress.profile.minutesPerLesson = answer || "20–25 דקות";
    progress.planningStep = 3;
    return {
      progress,
      response: {
        replyText: `התוכנית הראשונית:\n• ${progress.profile.lessonsPerWeek}\n• ${progress.profile.minutesPerLesson} לשיעור\n• מטרה: ${progress.profile.learningGoal}\n• עניין מרכזי: ${progress.profile.interests.join(", ")}\n• רמה משוערת: ${progress.profile.estimatedCefr}\n\nרוצה להתחיל את השיעור הראשון עכשיו?`,
        phase: "planning",
        choices: choices([
          { id: "1", label: "כן, בואו נתחיל שיעור 1" },
          { id: "2", label: "לא עכשיו — שמור את התוכנית" },
        ]),
        meta: { cefr: progress.profile.estimatedCefr },
      },
      checkpoint: "plan_approved",
    };
  }

  // step 3
  if (answer.includes("לא עכשיו")) {
    progress.currentPhase = "planning";
    return {
      progress,
      response: {
        replyText:
          "שמרתי את התוכנית. כשתרצה, לחץ/י «התחל ללמוד» שוב ונמשיך משיעור 1.",
        phase: "planning",
        choices: choices([{ id: "1", label: "כן, בואו נתחיל שיעור 1" }]),
        meta: {
          cefr: progress.profile.estimatedCefr,
          lessonNumber: 0,
        },
      },
      checkpoint: "plan_approved",
    };
  }

  progress.currentPhase = "lesson";
  progress.currentLessonNumber = 1;
  progress.lessonStep = 1;
  const topic = progress.profile.interests[0] ?? "your interests";
  const vocab = selectCocaSample({
    cefr: progress.profile.estimatedCefr,
    interests: progress.profile.interests,
    limit: 3,
  });
  progress.vocabulary = vocab.map((v) => ({
    item: v.word,
    meaning: v.word === "home" ? "בית" : `${v.word} (${v.pos})`,
    status: "learning" as const,
  }));

  return {
    progress,
    response: {
      replyText: `שיעור 1 — מטרה: להשתמש ב־3 מילים שימושיות סביב «${topic}».\n\nמילות היום: ${vocab.map((v) => v.word).join(", ")}.\n\nWarm-up: איך אומרים באנגלית «אני צופה ב...»?`,
      phase: "lesson",
      choices: [
        ...shuffle([
          { id: "1", label: "I watch..." },
          { id: "2", label: "I watching..." },
          { id: "3", label: "I am watch..." },
        ]),
        otherChoice("My own answer / comments — write freely"),
      ],
      meta: {
        cefr: progress.profile.estimatedCefr,
        lessonNumber: 1,
      },
    },
    checkpoint: "plan_approved",
  };
}

function lessonReply(
  progress: ProgressSnapshot,
  req: CoachRequest,
): {
  progress: ProgressSnapshot;
  response: Omit<CoachResponse, "progressSaved">;
  checkpoint?: string;
  recap?: LessonRecap;
} {
  if (req.messageType === "end_lesson") {
    progress.currentPhase = "recap";
    const recap = buildRecap(req.learnerId, req.sessionId, progress);
    progress.recentSessions = [recap, ...progress.recentSessions].slice(0, 12);
    return {
      progress,
      response: {
        replyText:
          "שמרתי את מה שהספקנו. הנה סיכום קצר — אפשר גם לפתוח את מסך הסיכום.",
        phase: "recap",
        choices: choices([
          { id: "1", label: "לפתוח סיכום שיעור" },
          { id: "2", label: "להמשיך שיעור חדש אחר כך" },
        ]),
        meta: {
          cefr: progress.profile.estimatedCefr,
          lessonNumber: progress.currentLessonNumber,
          sessionId: req.sessionId,
          recapAvailable: true,
        },
      },
      checkpoint: "end_lesson",
      recap,
    };
  }

  const answer = userText(req).toLowerCase();

  if (progress.lessonStep === 1) {
    progress.lessonStep = 2;
    const ok =
      answer.includes("i watch") ||
      answer.includes("watch");
    return {
      progress,
      response: {
        replyText: ok
          ? "Exact — “I watch...” is a clear present-simple start.\n\nעכשיו בחרו משפט שמתאים לתחום העניין שלכם:"
          : "קרוב! הצורה הנוחה כאן היא “I watch...”.\n\nבחרו משפט שמתאים לתחום העניין שלכם:",
        phase: "lesson",
        choices: [
          ...shuffle([
            {
              id: "1",
              label: `I watch ${progress.profile.interests[1] ?? "shows"} every week.`,
            },
            {
              id: "2",
              label: `I watching ${progress.profile.interests[1] ?? "shows"} every week.`,
            },
            {
              id: "3",
              label: `Watch I ${progress.profile.interests[1] ?? "shows"}.`,
            },
          ]),
          otherChoice("My own sentence / comments — write freely"),
        ],
        meta: {
          cefr: progress.profile.estimatedCefr,
          lessonNumber: progress.currentLessonNumber,
        },
      },
    };
  }

  if (progress.lessonStep === 2) {
    progress.lessonStep = 3;
    return {
      progress,
      response: {
        replyText:
          "יפה. עכשיו תור שלכם ליצור — השלימו או כתבו משפט קצר:\n“Last night I ___ …”",
        phase: "lesson",
        choices: [
          ...shuffle([
            { id: "1", label: "Last night I watched an episode." },
            { id: "2", label: "Last night I watch an episode." },
            { id: "3", label: "Last night I watching an episode." },
          ]),
          otherChoice("My own sentence / comments — write freely"),
        ],
        meta: {
          cefr: progress.profile.estimatedCefr,
          lessonNumber: progress.currentLessonNumber,
        },
      },
    };
  }

  // Finish lesson
  progress.lessonStep = 4;
  progress.currentPhase = "recap";
  const recap = buildRecap(req.learnerId, req.sessionId, progress);
  progress.recentSessions = [recap, ...progress.recentSessions].slice(0, 12);

  return {
    progress,
    response: {
      replyText:
        "סיימנו את השיעור הראשון! שמרתי את ההתקדמות.\n\nמילים וביטויים שלמדנו, כללים שתרגלנו, ומה כדאי בפעם הבאה — מחכים לך במסך הסיכום.",
      phase: "recap",
      choices: choices([
        { id: "1", label: "לפתוח סיכום שיעור" },
        { id: "2", label: "לחזור לדף הבית" },
      ]),
      meta: {
        cefr: progress.profile.estimatedCefr,
        lessonNumber: progress.currentLessonNumber,
        sessionId: req.sessionId,
        recapAvailable: true,
      },
    },
    checkpoint: "lesson_complete",
    recap,
  };
}

function resumeResponse(
  progress: ProgressSnapshot,
  sessionId: string,
): Omit<CoachResponse, "progressSaved"> {
  if (progress.currentPhase === "placement") {
    return {
      replyText: "ממשיכים מבדיקת הרמה. מוכנים לשאלה הבאה?",
      phase: "placement",
      choices: choices([{ id: "1", label: "קדימה, בואו נתחיל" }]),
      meta: { cefr: progress.profile.estimatedCefr },
    };
  }
  if (progress.currentPhase === "planning") {
    return {
      replyText: "התוכנית ממתינה. רוצים להמשיך מהמקום שעצרנו?",
      phase: "planning",
      choices: choices([
        { id: "1", label: "כן, בואו נתחיל שיעור 1" },
        { id: "2", label: "לא עכשיו — שמור את התוכנית" },
      ]),
      meta: { cefr: progress.profile.estimatedCefr },
    };
  }
  if (progress.currentPhase === "lesson") {
    return {
      replyText: "חזרתם לשיעור. ממשיכים מהתרגיל הבא?",
      phase: "lesson",
      choices: choices([{ id: "1", label: "כן, ממשיכים" }]),
      meta: {
        cefr: progress.profile.estimatedCefr,
        lessonNumber: progress.currentLessonNumber,
      },
    };
  }
  if (progress.currentPhase === "recap") {
    return {
      replyText:
        "השיעור הקודם שמור. אפשר לפתוח סיכום או להתחיל שיעור חדש.",
      phase: "recap",
      choices: choices([
        { id: "1", label: "לפתוח סיכום שיעור" },
        { id: "2", label: "להתחיל שיעור חדש" },
      ]),
      meta: {
        cefr: progress.profile.estimatedCefr,
        lessonNumber: progress.currentLessonNumber,
        sessionId,
        recapAvailable: Boolean(progress.recentSessions[0]),
      },
    };
  }
  return {
    replyText: "ממשיכים מההיכרות. מה מעניין אתכם עכשיו?",
    phase: "onboarding",
    choices: choices([
      { id: "1", label: "סדרות וסרטים" },
      { id: "2", label: "מוזיקה" },
      { id: "3", label: "ספורט" },
      { id: "4", label: "משחקים" },
      { id: "5", label: "אוכל וטיולים" },
    ]),
    meta: {},
  };
}

export async function runLocalCoach(
  req: CoachRequest,
): Promise<CoachResponse> {
  let progress = await loadProgress(req.learnerId);

  let result: {
    progress: ProgressSnapshot;
    response: Omit<CoachResponse, "progressSaved">;
    checkpoint?: string;
    recap?: LessonRecap;
  };

  if (req.messageType === "start") {
    if (progress.onboardingStep === 0 && !progress.profile.estimatedCefr) {
      progress = createEmptyProgress();
      result = onboardingReply(progress, "");
    } else if (
      progress.currentPhase === "recap" &&
      progress.profile.estimatedCefr
    ) {
      result = {
        progress,
        response: resumeResponse(progress, req.sessionId),
      };
    } else {
      result = {
        progress,
        response: resumeResponse(progress, req.sessionId),
      };
    }
  } else if (req.messageType === "end_lesson") {
    result = lessonReply(progress, req);
  } else if (progress.currentPhase === "onboarding") {
    result = onboardingReply(progress, userText(req));
  } else if (progress.currentPhase === "placement") {
    result = { ...placementReply(progress, req) };
  } else if (progress.currentPhase === "planning") {
    result = planningReply(progress, userText(req));
  } else if (progress.currentPhase === "lesson") {
    result = lessonReply(progress, req);
  } else if (progress.currentPhase === "recap") {
    if (userText(req).includes("שיעור חדש")) {
      progress.currentPhase = "lesson";
      progress.currentLessonNumber += 1;
      progress.lessonStep = 1;
      result = lessonReply(progress, {
        ...req,
        messageType: "choice",
        choiceText: "כן, ממשיכים",
      });
    } else {
      result = {
        progress,
        response: resumeResponse(progress, req.sessionId),
      };
    }
  } else {
    result = onboardingReply(createEmptyProgress(), "");
  }

  if (result.recap) {
    await saveSessionRecap(result.recap);
  }

  const saved = await saveProgress(req.learnerId, result.progress);

  return {
    ...result.response,
    progressSaved: saved,
  };
}
