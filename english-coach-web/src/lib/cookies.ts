import { cookies } from "next/headers";

export const LEARNER_COOKIE = "english_coach_learner_id";
export const SESSION_COOKIE = "english_coach_session_id";

export async function getLearnerIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(LEARNER_COOKIE)?.value ?? null;
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
