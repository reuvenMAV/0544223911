CREATE TABLE IF NOT EXISTS "yael_n8n_lifecycle" (
	"appointment_id" integer PRIMARY KEY NOT NULL,
	"audit_log" varchar(64) DEFAULT 'created' NOT NULL,
	"review_sent" varchar(64) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "yael_n8n_customers" (
	"phone" varchar(30) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"first_visit" varchar(32) DEFAULT '' NOT NULL,
	"last_visit" varchar(32) DEFAULT '' NOT NULL,
	"total_visits" varchar(16) DEFAULT '0' NOT NULL,
	"completed_visits" varchar(16) DEFAULT '0' NOT NULL,
	"services_history" text DEFAULT '' NOT NULL,
	"is_returning" varchar(8) DEFAULT 'לא' NOT NULL,
	"folder_url" varchar(500) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
