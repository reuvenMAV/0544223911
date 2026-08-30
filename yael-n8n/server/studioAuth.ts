import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";

export const STUDIO_COOKIE = "yael_studio";
const DAY_MS = 7 * 24 * 60 * 60 * 1000;

export function studioPasswordConfigured(): boolean {
  return Boolean(process.env.YAEL_ADMIN_PASSWORD && process.env.YAEL_ADMIN_PASSWORD.length >= 10);
}

export function studioPasswordMatches(password: string): boolean {
  const expected = process.env.YAEL_ADMIN_PASSWORD || "";
  if (!expected || expected.length < 10 || !password) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function studioAdminUser(): User {
  const now = new Date();
  return {
    id: 1,
    openId: "yael-studio",
    name: "Yael Mavashev",
    email: null,
    loginMethod: "studio-password",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function secret(): string {
  return process.env.JWT_SECRET || process.env.YAEL_ADMIN_PASSWORD || "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createStudioToken(): string {
  const payload = Buffer.from(JSON.stringify({ sub: "yael-studio", exp: Date.now() + DAY_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readStudioToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return false;
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.sub === "yael-studio" && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

export function studioCookieOptions(req: Request) {
  const forwarded = String(req.headers["x-forwarded-proto"] || req.protocol || "");
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: forwarded.includes("https") || req.protocol === "https",
    maxAge: DAY_MS / 1000,
  };
}

export function setStudioCookie(req: Request, res: Response) {
  res.cookie(STUDIO_COOKIE, createStudioToken(), studioCookieOptions(req));
}

export function clearStudioCookie(req: Request, res: Response) {
  res.clearCookie(STUDIO_COOKIE, { ...studioCookieOptions(req), maxAge: 0 });
}

function cookieFromHeader(req: Request, name: string): string {
  const raw = String(req.headers.cookie || "");
  const parts = raw.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const hit = parts.find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : "";
}

export function studioUserFromRequest(req: Request): User | null {
  const token = cookieFromHeader(req, STUDIO_COOKIE);
  return readStudioToken(token) ? studioAdminUser() : null;
}
