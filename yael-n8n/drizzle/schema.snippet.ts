// Append to drizzle/schema.ts. Do not copy Haya/Forever tables.
export const n8nLifecycle = pgTable("yael_n8n_lifecycle", {
  appointmentId: integer("appointment_id").primaryKey(),
  auditLog: varchar("audit_log", { length: 64 }).default("created").notNull(),
  reviewSent: varchar("review_sent", { length: 64 }).default("").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const n8nSurveys = pgTable("yael_n8n_surveys", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id"),
  name: varchar("name", { length: 160 }).default("").notNull(),
  phone: varchar("phone", { length: 30 }).default("").notNull(),
  rating: integer("rating").notNull(),
  feedback: text("feedback").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
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
