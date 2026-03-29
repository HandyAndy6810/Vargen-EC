export * from "./models/auth";
export * from "./models/chat";

import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes").default(""),
  xeroContactId: text("xero_contact_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  scheduledDate: timestamp("scheduled_date"),
  completionData: text("completion_data"), // JSON: { actualHours, extraNotes, completedAt, estimatedHours, quotedAmount }
  createdAt: timestamp("created_at").defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id),
  customerId: integer("customer_id").references(() => customers.id),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").default("draft"), // draft, sent, viewed, accepted, rejected
  content: text("content"), // AI generated text or structured notes
  xeroInvoiceId: text("xero_invoice_id"),
  xeroInvoiceNumber: text("xero_invoice_number"),
  shareToken: text("share_token"), // UUID for client portal link
  followUpSchedule: text("follow_up_schedule"), // JSON: [{ day, status, sentAt? }]
  createdAt: timestamp("created_at").defaultNow(),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  customerId: integer("customer_id").references(() => customers.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").default("draft"), // draft, sent, paid, overdue
  items: text("items").notNull(), // JSON array of line items
  subtotal: numeric("subtotal").notNull(),
  gstAmount: numeric("gst_amount").default("0"),
  totalAmount: numeric("total_amount").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobTimerEntries = pgTable("job_timer_entries", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // seconds
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portalFeedback = pgTable("portal_feedback", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  quotes: many(quotes),
  timerEntries: many(jobTimerEntries),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  job: one(jobs, {
    fields: [quotes.jobId],
    references: [jobs.id],
  }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  items: many(quoteItems),
  invoice: one(invoices),
  feedback: many(portalFeedback),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  quote: one(quotes, {
    fields: [invoices.quoteId],
    references: [quotes.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
}));

export const jobTimerEntriesRelations = relations(jobTimerEntries, ({ one }) => ({
  job: one(jobs, {
    fields: [jobTimerEntries.jobId],
    references: [jobs.id],
  }),
}));

export const portalFeedbackRelations = relations(portalFeedback, ({ one }) => ({
  quote: one(quotes, {
    fields: [portalFeedback.quoteId],
    references: [quotes.id],
  }),
}));

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  businessName: text("business_name").default(""),
  abn: text("abn").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  address: text("address").default(""),
  tradeType: text("trade_type").default("General"),
  labourRate: integer("labour_rate").default(85),
  markupPercent: integer("markup_percent").default(15),
  callOutFee: integer("call_out_fee").default(80),
  callOutFeeEnabled: boolean("call_out_fee_enabled").default(false),
  includeGST: boolean("include_gst").default(true),
  weeklyGoal: integer("weekly_goal").default(0),
  darkMode: boolean("dark_mode").default(false),
  bladeOrder: text("blade_order").default('["hero","activity","pipeline","actions","revenue","stats","calendar"]'),
  bankName: text("bank_name").default(""),
  bsb: text("bsb").default(""),
  accountNumber: text("account_number").default(""),
  accountName: text("account_name").default(""),
  paymentTermsDays: integer("payment_terms_days").default(14),
  followUpEnabled: boolean("follow_up_enabled").default(false),
  followUpDays: text("follow_up_days").default("[3,7,14]"),
  followUpChannel: text("follow_up_channel").default("sms"),
  // Quote branding
  quoteAccentColor: text("quote_accent_color").default("#ea580c"),
  quoteFontFamily: text("quote_font_family").default("inter"),
  logoUrl: text("logo_url").default(""),
  quoteHeaderStyle: text("quote_header_style").default("gradient"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobTemplates = pgTable("job_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  icon: text("icon").default("📋"),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobTemplateSchema = createInsertSchema(jobTemplates).omit({ id: true, createdAt: true });
export type JobTemplate = typeof jobTemplates.$inferSelect;
export type InsertJobTemplate = z.infer<typeof insertJobTemplateSchema>;

export const xeroTokens = pgTable("xero_tokens", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  tenantId: text("tenant_id").notNull(),
  tenantName: text("tenant_name").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type XeroToken = typeof xeroTokens.$inferSelect;
export type InsertXeroToken = typeof xeroTokens.$inferInsert;

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ updatedAt: true });
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertJobTimerEntrySchema = createInsertSchema(jobTimerEntries).omit({ id: true, createdAt: true });
export const insertPortalFeedbackSchema = createInsertSchema(portalFeedback).omit({ id: true, createdAt: true });

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type JobTimerEntry = typeof jobTimerEntries.$inferSelect;
export type InsertJobTimerEntry = z.infer<typeof insertJobTimerEntrySchema>;
export type PortalFeedback = typeof portalFeedback.$inferSelect;
export type InsertPortalFeedback = z.infer<typeof insertPortalFeedbackSchema>;
