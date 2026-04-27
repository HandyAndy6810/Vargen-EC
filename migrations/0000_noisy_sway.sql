CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text DEFAULT '',
	"xero_contact_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"quote_id" integer,
	"customer_id" integer,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft',
	"items" text NOT NULL,
	"subtotal" numeric NOT NULL,
	"gst_amount" numeric DEFAULT '0',
	"total_amount" numeric NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"paid_amount" numeric DEFAULT '0',
	"notes" text,
	"stripe_payment_link_id" text,
	"stripe_payment_link_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT '📋',
	"description" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_timer_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"job_id" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"customer_id" integer,
	"title" text NOT NULL,
	"description" text,
	"address" text,
	"status" text DEFAULT 'scheduled',
	"scheduled_date" timestamp,
	"estimated_duration" integer,
	"completion_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"job_id" integer,
	"customer_id" integer,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'draft',
	"content" text,
	"xero_invoice_id" text,
	"xero_invoice_number" text,
	"share_token" text,
	"follow_up_schedule" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT '',
	"abn" text DEFAULT '',
	"phone" text DEFAULT '',
	"email" text DEFAULT '',
	"address" text DEFAULT '',
	"trade_type" text DEFAULT 'General',
	"labour_rate" integer DEFAULT 85,
	"markup_percent" integer DEFAULT 15,
	"call_out_fee" integer DEFAULT 80,
	"call_out_fee_enabled" boolean DEFAULT false,
	"include_gst" boolean DEFAULT true,
	"weekly_goal" integer DEFAULT 0,
	"dark_mode" boolean DEFAULT false,
	"blade_order" text DEFAULT '["hero","activity","pipeline","actions","revenue","stats","calendar"]',
	"bank_name" text DEFAULT '',
	"bsb" text DEFAULT '',
	"account_number" text DEFAULT '',
	"account_name" text DEFAULT '',
	"payment_terms_days" integer DEFAULT 14,
	"follow_up_enabled" boolean DEFAULT false,
	"follow_up_days" text DEFAULT '[3,7,14]',
	"follow_up_channel" text DEFAULT 'sms',
	"quote_accent_color" text DEFAULT '#ea580c',
	"quote_font_family" text DEFAULT 'inter',
	"logo_url" text DEFAULT '',
	"quote_header_style" text DEFAULT 'gradient',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "xero_tokens" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"tenant_id" text NOT NULL,
	"tenant_name" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password" varchar,
	"reset_token" varchar,
	"reset_token_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_timer_entries" ADD CONSTRAINT "job_timer_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_timer_entries" ADD CONSTRAINT "job_timer_entries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_feedback" ADD CONSTRAINT "portal_feedback_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_tokens" ADD CONSTRAINT "xero_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");