import type { Express, Request, Response } from "express";
import { createSurvey, listN8nAppointments, listN8nCustomers, listSurveys, n8nTokenConfigured, n8nTokenMatches, parseAppointmentId, updateN8nLifecycle, upsertN8nCustomer } from "./n8nLifecycle";

function unauthorized(res: Response) {
  res.status(401).json({ error: "unauthorized" });
}

function guard(req: Request, res: Response): boolean {
  if (!n8nTokenConfigured()) {
    res.status(503).json({ error: "n8n_token_not_configured" });
    return false;
  }
  if (!n8nTokenMatches(req.header("x-yael-n8n-token"))) {
    unauthorized(res);
    return false;
  }
  return true;
}

export function registerYaelN8nRoutes(app: Express) {
  app.get("/api/n8n/appointments", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const appointments = await listN8nAppointments();
      res.json({ appointments });
    } catch {
      res.status(503).json({ error: "appointments_unavailable" });
    }
  });

  app.post("/api/n8n/lifecycle", async (req, res) => {
    if (!guard(req, res)) return;
    const id = parseAppointmentId(req.body?.id);
    if (id == null) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const auditLog = typeof req.body?.auditLog === "string" ? req.body.auditLog.trim() : undefined;
    const reviewSent = typeof req.body?.reviewSent === "string" ? req.body.reviewSent.trim() : undefined;
    if (!auditLog && reviewSent === undefined) {
      res.status(400).json({ error: "nothing_to_update" });
      return;
    }
    try {
      const result = await updateN8nLifecycle({ id, auditLog, reviewSent });
      res.json(result);
    } catch {
      res.status(503).json({ error: "lifecycle_unavailable" });
    }
  });

  app.post("/api/n8n/customers", async (req, res) => {
    if (!guard(req, res)) return;
    const phone = String(req.body?.phone || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!phone || !name) {
      res.status(400).json({ error: "phone_and_name_required" });
      return;
    }
    try {
      const result = await upsertN8nCustomer({
        phone,
        name,
        first_visit: String(req.body?.first_visit || ""),
        last_visit: String(req.body?.last_visit || ""),
        total_visits: String(req.body?.total_visits || "0"),
        completed_visits: String(req.body?.completed_visits || "0"),
        services_history: String(req.body?.services_history || ""),
        is_returning: String(req.body?.is_returning || "לא"),
        folder_url: String(req.body?.folder_url || ""),
      });
      res.json(result);
    } catch {
      res.status(503).json({ error: "customers_unavailable" });
    }
  });

  app.get("/api/n8n/customers", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      res.json({ customers: await listN8nCustomers() });
    } catch {
      res.status(503).json({ error: "customers_unavailable" });
    }
  });

  app.get("/api/n8n/surveys", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      res.json({ surveys: await listSurveys() });
    } catch {
      res.status(503).json({ error: "surveys_unavailable" });
    }
  });

  app.post("/api/survey", async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const feedback = String(req.body?.feedback || "").trim();
    const rating = Number(req.body?.rating);
    const appointmentId = Number(req.body?.id || req.body?.appointmentId);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "invalid_rating" });
      return;
    }
    try {
      const row = await createSurvey({
        appointmentId: Number.isInteger(appointmentId) && appointmentId > 0 ? appointmentId : undefined,
        name,
        phone,
        rating,
        feedback,
      });
      res.json({ ok: true, id: row?.id, rating });
    } catch {
      res.status(503).json({ error: "survey_unavailable" });
    }
  });
}
