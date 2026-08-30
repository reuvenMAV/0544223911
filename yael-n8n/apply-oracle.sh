#!/usr/bin/env bash
# Apply Yael n8n lifecycle sources onto the Oracle app. Run ON the Oracle host.
set -euo pipefail
APP=/home/ubuntu/yael/app
SRC_DIR=${1:-}

if [[ -z "${SRC_DIR}" || ! -d "${SRC_DIR}" ]]; then
  echo "usage: apply-oracle.sh /path/to/yael-n8n" >&2
  exit 2
fi

cp -a "${SRC_DIR}/server/n8nLifecycle.ts" "${APP}/server/n8nLifecycle.ts"
cp -a "${SRC_DIR}/server/n8nRoutes.ts" "${APP}/server/n8nRoutes.ts"
cp -a "${SRC_DIR}/server/n8nLifecycle.test.ts" "${APP}/server/n8nLifecycle.test.ts"
cp -a "${SRC_DIR}/drizzle/pg/0002_yael_n8n_lifecycle.sql" "${APP}/drizzle/pg/0002_yael_n8n_lifecycle.sql"

python3 - <<'PY'
from pathlib import Path
schema = Path("/home/ubuntu/yael/app/drizzle/schema.ts")
text = schema.read_text()
if "yael_n8n_lifecycle" not in text:
    text = text.rstrip() + """

export const n8nLifecycle = pgTable("yael_n8n_lifecycle", {
  appointmentId: integer("appointment_id").primaryKey(),
  auditLog: varchar("audit_log", { length: 64 }).default("created").notNull(),
  reviewSent: varchar("review_sent", { length: 64 }).default("").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const n8nCustomers = pgTable("yael_n8n_customers", {
  phone: varchar("phone", { length: 30 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  firstVisit: varchar("first_visit", { length: 32 }).default("").notNull(),
  lastVisit: varchar("last_visit", { length: 32 }).default("").notNull(),
  totalVisits: varchar("total_visits", { length: 16 }).default("0").notNull(),
  completedVisits: varchar("completed_visits", { length: 16 }).default("0").notNull(),
  servicesHistory: text("services_history").default("").notNull(),
  isReturning: varchar("is_returning", { length: 8 }).default("לא").notNull(),
  folderUrl: varchar("folder_url", { length: 500 }).default("").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});
"""
    schema.write_text(text + "\n")

db = Path("/home/ubuntu/yael/app/server/db.ts")
db_text = db.read_text()
if "n8nLifecycle" not in db_text:
    db_text = db_text.replace(
        "import { appointments, appointmentSlotLocks, availabilityOverrides, blockedDates, businessHours, businessSettings, InsertUser, notificationEvents, services, testimonials, User, users } from \"../drizzle/schema\";",
        "import { appointments, appointmentSlotLocks, availabilityOverrides, blockedDates, businessHours, businessSettings, InsertUser, n8nLifecycle, notificationEvents, services, testimonials, User, users } from \"../drizzle/schema\";",
    )
    old = "    if (locks.length) await tx.insert(appointmentSlotLocks).values(locks);\n    return { appointmentId: appointment.id };"
    new = "    if (locks.length) await tx.insert(appointmentSlotLocks).values(locks);\n    await tx.insert(n8nLifecycle).values({ appointmentId: appointment.id, auditLog: \"created\", reviewSent: \"\", updatedAt: new Date() });\n    return { appointmentId: appointment.id };"
    if old not in db_text:
        raise SystemExit("createAppointment hook site not found")
    db.write_text(db_text.replace(old, new))

idx = Path("/home/ubuntu/yael/app/server/_core/index.ts")
idx_text = idx.read_text()
if "registerYaelN8nRoutes" not in idx_text:
    idx_text = idx_text.replace(
        "import { listServices } from \"../db\";",
        "import { listServices } from \"../db\";\nimport { registerYaelN8nRoutes } from \"../n8nRoutes\";",
    )
    idx_text = idx_text.replace(
        "  registerOAuthRoutes(app);\n",
        "  registerOAuthRoutes(app);\n  registerYaelN8nRoutes(app);\n",
    )
    idx.write_text(idx_text)

journal = Path("/home/ubuntu/yael/app/drizzle/pg/meta/_journal.json")
data = __import__("json").loads(journal.read_text())
if not any(entry.get("tag") == "0002_yael_n8n_lifecycle" for entry in data.get("entries", [])):
    data["entries"].append({
        "idx": 2,
        "version": "7",
        "when": 1788111000000,
        "tag": "0002_yael_n8n_lifecycle",
        "breakpoints": True,
    })
    journal.write_text(__import__("json").dumps(data, indent=2) + "\n")

smoke = Path("/home/ubuntu/yael/app/scripts/smoke.mjs")
smoke_text = smoke.read_text()
if "/api/n8n/appointments" not in smoke_text:
    needle = "  const admin = await request(\"/api/trpc/admin.appointments?input=%7B%22json%22%3Anull%7D\");"
    insert = """  const n8n = await request("/api/n8n/appointments");
  if (n8n.response.status === 401 || n8n.response.status === 503) pass("n8n appointments require token");
  else fail("n8n appointments require token", `HTTP ${n8n.response.status}`);

"""
    if needle not in smoke_text:
        raise SystemExit("smoke hook site not found")
    smoke.write_text(smoke_text.replace(needle, insert + needle))
print("patched Yael app sources")
PY
