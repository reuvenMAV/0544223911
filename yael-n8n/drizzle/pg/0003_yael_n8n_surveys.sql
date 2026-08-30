CREATE TABLE IF NOT EXISTS "yael_n8n_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer,
	"name" varchar(160) DEFAULT '' NOT NULL,
	"phone" varchar(30) DEFAULT '' NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
