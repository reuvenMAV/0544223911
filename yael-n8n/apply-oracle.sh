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
cp -a "${SRC_DIR}/server/studioAuth.ts" "${APP}/server/studioAuth.ts"
cp -a "${SRC_DIR}/server/studioAuth.test.ts" "${APP}/server/studioAuth.test.ts"
cp -a "${SRC_DIR}/drizzle/pg/0002_yael_n8n_lifecycle.sql" "${APP}/drizzle/pg/0002_yael_n8n_lifecycle.sql"
cp -a "${SRC_DIR}/drizzle/pg/0003_yael_n8n_surveys.sql" "${APP}/drizzle/pg/0003_yael_n8n_surveys.sql"
cp -a "${SRC_DIR}/client/Survey.tsx" "${APP}/client/src/pages/Survey.tsx"
cp -a "${SRC_DIR}/client/Admin.tsx" "${APP}/client/src/pages/Admin.tsx"

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
if "yael_n8n_surveys" not in schema.read_text():
    schema.write_text(schema.read_text().rstrip() + """

export const n8nSurveys = pgTable("yael_n8n_surveys", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id"),
  name: varchar("name", { length: 160 }).default("").notNull(),
  phone: varchar("phone", { length: 30 }).default("").notNull(),
  rating: integer("rating").notNull(),
  feedback: text("feedback").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});
""" + "\n")

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
if "/survey" not in smoke.read_text():
    smoke.write_text(smoke.read_text().replace(
        "  const admin = await request(\"/api/trpc/admin.appointments?input=%7B%22json%22%3Anull%7D\");",
        """  const survey = await request("/survey");
  if (survey.response.ok && (survey.body.includes("סקר") || survey.body.includes('id="root"'))) pass("survey page shell");
  else fail("survey page shell", `HTTP ${survey.response.status}`);

  const adminPage = await request("/admin");
  if (adminPage.response.ok && (adminPage.body.includes("האזור האישי") || adminPage.body.includes('id="root"'))) pass("admin page shell");
  else fail("admin page shell", `HTTP ${adminPage.response.status}`);

  const admin = await request("/api/trpc/admin.appointments?input=%7B%22json%22%3Anull%7D");""",
    ))

ctx = Path("/home/ubuntu/yael/app/server/_core/context.ts")
ctx_text = ctx.read_text()
if "studioUserFromRequest" not in ctx_text:
    ctx_text = ctx_text.replace(
        "import { sdk } from \"./sdk\";",
        "import { sdk } from \"./sdk\";\nimport { studioUserFromRequest } from \"../studioAuth\";",
    )
    ctx_text = ctx_text.replace(
        "  try {\n    user = await sdk.authenticateRequest(opts.req);\n  } catch (error) {\n    // Authentication is optional for public procedures.\n    user = null;\n  }",
        "  try {\n    user = studioUserFromRequest(opts.req) ?? await sdk.authenticateRequest(opts.req);\n  } catch (error) {\n    // Authentication is optional for public procedures.\n    user = studioUserFromRequest(opts.req);\n  }",
    )
    ctx.write_text(ctx_text)

app = Path("/home/ubuntu/yael/app/client/src/App.tsx")
app_text = app.read_text()
if "Survey" not in app_text:
    app_text = app_text.replace("import Admin from \"@/pages/Admin\";", "import Admin from \"@/pages/Admin\";\nimport Survey from \"@/pages/Survey\";")
    app_text = app_text.replace(
        "<Route path=\"/admin\" component={Admin} />",
        "<Route path=\"/admin\" component={Admin} /><Route path=\"/survey\" component={Survey} />",
    )
    app.write_text(app_text)

routers = Path("/home/ubuntu/yael/app/server/routers.ts")
rt = routers.read_text()
if "studio:" not in rt:
    if "from \"./n8nLifecycle\"" not in rt:
        rt = rt.replace(
            "import { adminProcedure, publicProcedure, protectedProcedure, router } from \"./_core/trpc\";",
            "import { adminProcedure, publicProcedure, protectedProcedure, router } from \"./_core/trpc\";\nimport { TRPCError } from \"@trpc/server\";\nimport { listN8nCustomers, listSurveys } from \"./n8nLifecycle\";\nimport { clearStudioCookie, setStudioCookie, studioPasswordConfigured, studioPasswordMatches, studioAdminUser } from \"./studioAuth\";",
        )
    rt = rt.replace(
        "    logout: publicProcedure.mutation(({ ctx }) => {\n      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });\n      return { success: true } as const;\n    }),\n  }),",
        """    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  studio: router({
    login: publicProcedure.input(z.object({ password: z.string().min(1).max(200) })).mutation(({ input, ctx }) => {
      if (!studioPasswordConfigured() || !studioPasswordMatches(input.password)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "wrong_password" });
      }
      setStudioCookie(ctx.req, ctx.res);
      return studioAdminUser();
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearStudioCookie(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),""",
    )
    if "surveys:" not in rt:
        rt = rt.replace(
            "    testimonials: adminProcedure.query(() => listAllTestimonials()),",
            "    testimonials: adminProcedure.query(() => listAllTestimonials()),\n    surveys: adminProcedure.query(() => listSurveys()),\n    customers: adminProcedure.query(() => listN8nCustomers()),",
        )
    routers.write_text(rt)

contact = Path("/home/ubuntu/yael/app/client/src/lib/yaelContact.ts")
contact.write_text("""export const yaelContact = {
  phoneDisplay: "054-806-0140",
  phoneHref: "tel:+972548060140",
  whatsappHref: "https://wa.me/972548060140?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%99%D7%A2%D7%9C%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A7%D7%91%D7%95%D7%A2%20%D7%AA%D7%95%D7%A8",
  areaLabel: "אשקלון · שכונת נווה הדרים",
  mapsHref: "https://www.google.com/maps/search/?api=1&query=%D7%A9%D7%9B%D7%95%D7%A0%D7%AA%20%D7%A0%D7%95%D7%95%D7%94%20%D7%94%D7%93%D7%A8%D7%99%D7%9D%2C%20%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F",
  wazeHref: "https://www.waze.com/ul?q=%D7%A9%D7%9B%D7%95%D7%A0%D7%AA%20%D7%A0%D7%95%D7%95%D7%94%20%D7%94%D7%93%D7%A8%D7%99%D7%9D%20%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F&navigate=yes",
} as const;
""")
test = Path("/home/ubuntu/yael/app/client/src/lib/yaelContact.test.ts")
test.write_text(test.read_text().replace("054-808-0140", "054-806-0140").replace("972548080140", "972548060140"))
home = Path("/home/ubuntu/yael/app/client/src/pages/Home.tsx")
home.write_text(home.read_text().replace("0548080140", "0548060140").replace("054-808-0140", "054-806-0140"))

journal = Path("/home/ubuntu/yael/app/drizzle/pg/meta/_journal.json")
data = __import__("json").loads(journal.read_text())
if not any(entry.get("tag") == "0003_yael_n8n_surveys" for entry in data.get("entries", [])):
    data["entries"].append({
        "idx": 3,
        "version": "7",
        "when": 1788112800000,
        "tag": "0003_yael_n8n_surveys",
        "breakpoints": True,
    })
    journal.write_text(__import__("json").dumps(data, indent=2) + "\n")
print("patched Yael app sources")
PY
