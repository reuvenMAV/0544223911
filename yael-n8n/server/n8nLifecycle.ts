import { timingSafeEqual } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { appointments, n8nCustomers, n8nLifecycle, n8nSurveys, services } from "../drizzle/schema";
import { getDb } from "./db";

export const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  confirmed: "מאושר",
  cancelled: "בוטל",
  completed: "בוצע",
};

export function mapStatusHe(status: string): string {
  return STATUS_HE[status] ?? status;
}

export function n8nTokenConfigured(): boolean {
  return Boolean(process.env.YAEL_N8N_TOKEN && process.env.YAEL_N8N_TOKEN.length >= 16);
}

export function n8nTokenMatches(headerValue: string | string[] | undefined): boolean {
  const expected = process.env.YAEL_N8N_TOKEN || "";
  const received = Array.isArray(headerValue) ? headerValue[0] : headerValue || "";
  if (!expected || expected.length < 16 || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function formatJerusalemDate(startsAtUtc: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(startsAtUtc);
}

export function formatJerusalemTime(startsAtUtc: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(startsAtUtc);
}

export function toAppointmentRow(input: {
  id: number;
  customerName: string;
  customerPhone: string;
  startsAtUtc: Date;
  status: string;
  createdAt?: Date;
  serviceName?: string | null;
  auditLog?: string | null;
  reviewSent?: string | null;
}) {
  return {
    id: String(input.id),
    שם: input.customerName,
    "שם הלקוחה": input.customerName,
    טלפון: input.customerPhone,
    תאריך: formatJerusalemDate(input.startsAtUtc),
    שעה: formatJerusalemTime(input.startsAtUtc),
    שירות: input.serviceName || "",
    סטאטוס: mapStatusHe(input.status),
    סטטוס: mapStatusHe(input.status),
    מקור: "yael.mavash.net",
    Created_By: "website",
    Created_At: input.createdAt ? input.createdAt.toISOString() : "",
    Audit_Log: input.auditLog || "created",
    Review_Sent: input.reviewSent || "",
    Customer_Folder_URL: "",
  };
}

export async function listN8nAppointments() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({
      id: appointments.id,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      startsAtUtc: appointments.startsAtUtc,
      status: appointments.status,
      createdAt: appointments.createdAt,
      serviceName: services.nameHe,
      auditLog: n8nLifecycle.auditLog,
      reviewSent: n8nLifecycle.reviewSent,
    })
    .from(appointments)
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .leftJoin(n8nLifecycle, eq(n8nLifecycle.appointmentId, appointments.id))
    .orderBy(asc(appointments.startsAtUtc));
  return rows.map(toAppointmentRow);
}

export async function markAppointmentCreated(appointmentId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(n8nLifecycle)
    .values({ appointmentId, auditLog: "created", reviewSent: "", updatedAt: new Date() })
    .onConflictDoNothing();
}

export async function updateN8nLifecycle(input: { id: number; auditLog?: string; reviewSent?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  await db
    .insert(n8nLifecycle)
    .values({
      appointmentId: input.id,
      auditLog: input.auditLog || "created",
      reviewSent: input.reviewSent || "",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: n8nLifecycle.appointmentId,
      set: {
        ...(input.auditLog !== undefined ? { auditLog: input.auditLog } : {}),
        ...(input.reviewSent !== undefined ? { reviewSent: input.reviewSent } : {}),
        updatedAt: now,
      },
    });
  return { id: input.id, auditLog: input.auditLog, reviewSent: input.reviewSent, updatedAt: now.toISOString() };
}

export async function upsertN8nCustomer(input: {
  phone: string;
  name: string;
  first_visit?: string;
  last_visit?: string;
  total_visits?: string;
  completed_visits?: string;
  services_history?: string;
  is_returning?: string;
  folder_url?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = {
    phone: input.phone,
    name: input.name,
    firstVisit: input.first_visit || "",
    lastVisit: input.last_visit || "",
    totalVisits: input.total_visits || "0",
    completedVisits: input.completed_visits || "0",
    servicesHistory: input.services_history || "",
    isReturning: input.is_returning || "לא",
    folderUrl: input.folder_url || "",
    updatedAt: new Date(),
  };
  await db
    .insert(n8nCustomers)
    .values(row)
    .onConflictDoUpdate({
      target: n8nCustomers.phone,
      set: {
        name: row.name,
        firstVisit: row.firstVisit,
        lastVisit: row.lastVisit,
        totalVisits: row.totalVisits,
        completedVisits: row.completedVisits,
        servicesHistory: row.servicesHistory,
        isReturning: row.isReturning,
        folderUrl: sql`CASE WHEN ${n8nCustomers.folderUrl} = '' THEN ${row.folderUrl} ELSE ${n8nCustomers.folderUrl} END`,
        updatedAt: row.updatedAt,
      },
    });
  return { phone: row.phone, name: row.name };
}

export async function listN8nCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(n8nCustomers).orderBy(asc(n8nCustomers.name));
}

export async function createSurvey(input: {
  appointmentId?: number;
  name: string;
  phone: string;
  rating: number;
  feedback: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .insert(n8nSurveys)
    .values({
      appointmentId: input.appointmentId,
      name: input.name,
      phone: input.phone,
      rating: input.rating,
      feedback: input.feedback,
    })
    .returning();
  return row;
}

export async function listSurveys() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(n8nSurveys).orderBy(asc(n8nSurveys.createdAt));
}
