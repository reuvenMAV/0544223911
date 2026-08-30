import { afterEach, describe, expect, it } from "vitest";
import { formatJerusalemDate, formatJerusalemTime, mapStatusHe, n8nTokenConfigured, n8nTokenMatches, parseAppointmentId, resolveServiceName, toAppointmentRow } from "./n8nLifecycle";

const previousToken = process.env.YAEL_N8N_TOKEN;

afterEach(() => {
  if (previousToken === undefined) delete process.env.YAEL_N8N_TOKEN;
  else process.env.YAEL_N8N_TOKEN = previousToken;
});

describe("Yael n8n lifecycle helpers", () => {
  it("accepts numeric appointment ids from n8n JSON bodies", () => {
    expect(parseAppointmentId(1)).toBe(1);
    expect(parseAppointmentId("1")).toBe(1);
    expect(parseAppointmentId(" 12 ")).toBe(12);
    expect(parseAppointmentId("")).toBeNull();
    expect(parseAppointmentId("={{ $json.id }}")).toBeNull();
    expect(parseAppointmentId(0)).toBeNull();
  });

  it("maps booking statuses to the Hebrew labels used by the workflow", () => {
    expect(mapStatusHe("pending")).toBe("ממתין");
    expect(mapStatusHe("confirmed")).toBe("מאושר");
    expect(mapStatusHe("cancelled")).toBe("בוטל");
    expect(mapStatusHe("completed")).toBe("בוצע");
  });

  it("formats Asia/Jerusalem date and time from a UTC instant", () => {
    const startsAt = new Date("2026-09-01T07:00:00.000Z");
    expect(formatJerusalemDate(startsAt)).toBe("01.09.2026");
    expect(formatJerusalemTime(startsAt)).toBe("10:00");
  });

  it("falls back to the catalog name when the services table is empty", () => {
    expect(resolveServiceName(1, null)).toBe("פדיקור");
    expect(resolveServiceName(1, "")).toBe("פדיקור");
    expect(resolveServiceName(99, "")).toBe("טיפול");
    expect(toAppointmentRow({
      id: 1,
      customerName: "זויה",
      customerPhone: "0544223911",
      startsAtUtc: new Date("2026-08-31T07:00:00.000Z"),
      status: "pending",
      serviceId: 1,
      serviceName: null,
      auditLog: "created",
    }).שירות).toBe("פדיקור");
  });

  it("emits sheet-compatible appointment fields for n8n Code nodes", () => {
    const row = toAppointmentRow({
      id: 12,
      customerName: "נועה",
      customerPhone: "0548080140",
      startsAtUtc: new Date("2026-09-01T07:00:00.000Z"),
      status: "pending",
      createdAt: new Date("2026-08-30T10:00:00.000Z"),
      serviceName: "פדיקור",
      auditLog: "created",
      reviewSent: "",
    });
    expect(row.id).toBe("12");
    expect(row["שם הלקוחה"]).toBe("נועה");
    expect(row.טלפון).toBe("0548080140");
    expect(row.תאריך).toBe("01.09.2026");
    expect(row.שעה).toBe("10:00");
    expect(row.שירות).toBe("פדיקור");
    expect(row.סטאטוס).toBe("ממתין");
    expect(row.Audit_Log).toBe("created");
    expect(row.מקור).toBe("yael.mavash.net");
    expect(row.Created_By).toBe("website");
  });

  it("rejects missing or short n8n tokens", () => {
    delete process.env.YAEL_N8N_TOKEN;
    expect(n8nTokenConfigured()).toBe(false);
    expect(n8nTokenMatches("anything")).toBe(false);
    process.env.YAEL_N8N_TOKEN = "short";
    expect(n8nTokenConfigured()).toBe(false);
  });

  it("accepts only the exact configured token", () => {
    process.env.YAEL_N8N_TOKEN = "a".repeat(32);
    expect(n8nTokenConfigured()).toBe(true);
    expect(n8nTokenMatches("a".repeat(32))).toBe(true);
    expect(n8nTokenMatches("b".repeat(32))).toBe(false);
    expect(n8nTokenMatches(undefined)).toBe(false);
  });
});
