import { v4 as uuidv4 } from "uuid";
import { LearnerIdSchema, SessionIdSchema } from "@/lib/types";

export const LEARNER_COOKIE = "english_coach_learner_id";
export const SESSION_COOKIE = "english_coach_session_id";
export const LEARNER_STORAGE_KEY = LEARNER_COOKIE;
export const SESSION_STORAGE_KEY = SESSION_COOKIE;

export type LearnerSessionIds = {
  learnerId: string;
  sessionId: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type CookieReader = (name: string) => string | null;
export type CookieWriter = (name: string, value: string) => void;

export function readCookieValue(
  cookieHeader: string,
  name: string,
): string | null {
  const match = cookieHeader
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

export function parseLearnerId(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = LearnerIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseSessionId(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = SessionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function ensureLearnerSessionIds(options: {
  search?: string;
  readCookie?: CookieReader;
  writeCookie?: CookieWriter;
  storage?: StorageLike;
  createId?: () => string;
}): LearnerSessionIds {
  const search = options.search ?? "";
  const readCookie = options.readCookie ?? (() => null);
  const writeCookie = options.writeCookie ?? (() => undefined);
  const storage = options.storage;
  const createId = options.createId ?? (() => uuidv4());

  const params = new URLSearchParams(search);
  const fromQuery = parseLearnerId(params.get("learner"));

  let learnerId =
    fromQuery ||
    parseLearnerId(readCookie(LEARNER_COOKIE)) ||
    parseLearnerId(storage?.getItem(LEARNER_STORAGE_KEY) ?? null);

  if (!learnerId) learnerId = createId();
  writeCookie(LEARNER_COOKIE, learnerId);
  storage?.setItem(LEARNER_STORAGE_KEY, learnerId);

  let sessionId =
    parseSessionId(readCookie(SESSION_COOKIE)) ||
    parseSessionId(storage?.getItem(SESSION_STORAGE_KEY) ?? null);

  if (!sessionId) sessionId = createId();
  writeCookie(SESSION_COOKIE, sessionId);
  storage?.setItem(SESSION_STORAGE_KEY, sessionId);

  return { learnerId, sessionId };
}

export function learnerOwnsRecap(
  recapLearnerId: string,
  requestLearnerId: string | null,
): boolean {
  if (!requestLearnerId) return false;
  return recapLearnerId === requestLearnerId;
}
