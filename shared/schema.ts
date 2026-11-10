export * from "./models/auth";
export * from "./models/chat";

import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";
import { CUSTOMER_TYPES, PREFERRED_CONTACTS, abnProblem, normaliseAbn } from "./customer-fields";

// Indexes are declared in this file, not created by hand in the database.
// db:push diffs the live schema against this one and drops anything it does not
// find here — so an index added with a console would survive exactly until the
// next publish. Every foreign key the app filters or joins on is covered:
// user_id on the per-tradie tables, quote_id where rows hang off a quote, and
// share_token for the portal lookup (a plain index, not unique: adding a unique
// constraint to a populated table can make push prompt, and the tokens come from
// crypto.randomUUID()).
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes").default(""),
  // Round 2 (c2). All optional. `address` is the site address (where the work
  // is); an invoice goes to billingAddress when set, otherwise the site.
  companyName: text("company_name"),
  abn: text("abn"),
  billingAddress: text("billing_address"),
  accessNotes: text("access_notes"),
  customerType: text("customer_type"),       // CUSTOMER_TYPES in shared/customer-fields
  preferredContact: text("preferred_contact"), // PREFERRED_CONTACTS
  xeroContactId: text("xero_contact_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  customers_user_id_idx: index("customers_user_id_idx").on(t.userId),
}));

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address"),
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  scheduledDate: timestamp("scheduled_date"),
  estimatedDuration: integer("estimated_duration"), // minutes
  // Optional links to the quote/invoice this job came from. Drizzle resolves the
  // thunks lazily at runtime, but TYPE inference is a different matter: jobs points
  // at quotes and quotes points back at jobs, and without an explicit return type
  // TypeScript cannot settle either one. Both silently became `any`, and that `any`
  // spread out through storage and routes as ~30 nonsense errors elsewhere. The
  // AnyPgColumn annotation breaks the cycle — it is Drizzle's documented fix for
  // circular and self references. Do not remove it.
  quoteId: integer("quote_id").references((): AnyPgColumn => quotes.id),
  invoiceId: integer("invoice_id").references((): AnyPgColumn => invoices.id),
  completionData: text("completion_data"), // JSON: { actualHours, extraNotes, completedAt, estimatedHours, quotedAmount }
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  jobs_user_id_idx: index("jobs_user_id_idx").on(t.userId),
}));

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  jobId: integer("job_id").references((): AnyPgColumn => jobs.id),
  customerId: integer("customer_id").references(() => customers.id),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").default("draft"), // draft, sent, viewed, accepted, rejected, invoiced
  content: text("content"), // AI generated text or structured notes
  xeroInvoiceId: text("xero_invoice_id"),
  xeroInvoiceNumber: text("xero_invoice_number"),
  shareToken: text("share_token"), // UUID for client portal link
  jobTitle: text("job_title"),
  followUpSchedule: text("follow_up_schedule"), // JSON: [{ day, status, sentAt? }]
  sentAt: timestamp("sent_at"), // set when status first changes to "sent"
  /**
   * Set by the phone on a new quote (offline outbox or online). Creating a quote
   * with a clientId the user already has returns that quote instead of a second
   * one, so a retried save can never duplicate. A plain index plus a locked
   * lookup (storage.createQuoteOnce), not a unique constraint.
   */
  clientId: text("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  quotes_user_id_idx: index("quotes_user_id_idx").on(t.userId),
  quotes_share_token_idx: index("quotes_share_token_idx").on(t.shareToken),
  quotes_user_client_id_idx: index("quotes_user_client_id_idx").on(t.userId, t.clientId),
}));

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  description: text("description").notNull(),
  // NUMERIC, not integer. As an integer, any fractional quantity failed to insert
  // — "0.5 hr cleanup", "1.5 hr labour" — and the mobile save loop swallowed the
  // error, so the line vanished from the rows while staying in content. The AI
  // prompt asks for at least fifteen minutes of cleanup, so this hit most AI
  // quotes. Drizzle returns numeric as a STRING: read it through num() from
  // shared/money.ts, never with a bare arithmetic operator.
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  price: numeric("price").notNull(),
}, (t) => ({
  quote_items_quote_id_idx: index("quote_items_quote_id_idx").on(t.quoteId),
}));

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  quoteId: integer("quote_id").references(() => quotes.id),
  customerId: integer("customer_id").references(() => customers.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").default("draft"), // draft, sent, paid, overdue
  // full = the whole job on one invoice; deposit = an up-front part-payment;
  // balance = what's left after deposits. A quote may have several invoices.
  invoiceType: text("invoice_type").default("full"), // full, deposit, balance
  items: text("items").notNull(), // JSON array of line items
  subtotal: numeric("subtotal").notNull(),
  gstAmount: numeric("gst_amount").default("0"),
  totalAmount: numeric("total_amount").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  paidAmount: numeric("paid_amount").default("0"), // tracks cumulative partial payments
  notes: text("notes"),
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripePaymentLinkUrl: text("stripe_payment_link_url"),
  squarePaymentLinkId: text("square_payment_link_id"),
  squarePaymentLinkUrl: text("square_payment_link_url"),
  xeroInvoiceId: text("xero_invoice_id"),
  xeroInvoiceNumber: text("xero_invoice_number"),
  /** The customer's link (/invoice/:token). Unguessable, unlike the id; set when it's first shared or sent. */
  shareToken: text("share_token"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  invoices_user_id_idx: index("invoices_user_id_idx").on(t.userId),
  invoices_quote_id_idx: index("invoices_quote_id_idx").on(t.quoteId),
  invoices_share_token_idx: index("invoices_share_token_idx").on(t.shareToken),
}));

export const portalFeedback = pgTable("portal_feedback", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  portal_feedback_quote_id_idx: index("portal_feedback_quote_id_idx").on(t.quoteId),
}));

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
  /** The charge-out rate: what the customer pays per hour. Not marked up unless markupLabour. */
  labourRate: integer("labour_rate").default(85),
  markupPercent: integer("markup_percent").default(15),
  /** Apply the markup to labour too (cost-plus across the whole job). Off: materials only. */
  markupLabour: boolean("markup_labour").default(false),
  /** What an hour costs the tradie, $/hr. Optional; only feeds profit on labour lines. */
  labourCostRate: integer("labour_cost_rate"),
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
  stripeEnabled: boolean("stripe_enabled").default(false),
  squareEnabled: boolean("square_enabled").default(false),
  followUpEnabled: boolean("follow_up_enabled").default(false),
  followUpDays: text("follow_up_days").default("[3,7,14]"),
  followUpChannel: text("follow_up_channel").default("sms"),
  // Expo push notification token for this user's device
  expoPushToken: text("expo_push_token").default(""),
  // Quote branding
  quoteAccentColor: text("quote_accent_color").default("#ea580c"),
  quoteFontFamily: text("quote_font_family").default("inter"),
  logoUrl: text("logo_url").default(""),
  quoteHeaderStyle: text("quote_header_style").default("gradient"),
  // Which PDF style quotes and invoices are sent in — an id from
  // mobile/lib/pdf-templates. "classic" is the plain, expected-looking document.
  quoteTemplate: text("quote_template").default("classic"),
  workingHours: text("working_hours").default('{"mon":{"on":true,"start":"07:30","end":"16:00"},"tue":{"on":true,"start":"07:30","end":"16:00"},"wed":{"on":true,"start":"07:30","end":"16:00"},"thu":{"on":true,"start":"07:30","end":"16:00"},"fri":{"on":true,"start":"07:30","end":"16:00"},"sat":{"on":false,"start":"08:00","end":"12:00"},"sun":{"on":false,"start":"08:00","end":"12:00"}}'),
  serviceArea: text("service_area").default('{"suburb":"","state":"","radius":15}'),
  notificationPrefs: text("notification_prefs").default('{"quotes":true,"invoices":true,"jobs":true,"reviews":true,"reminders":true}'),
  /**
   * When quick setup (docs/pricing-design.md, step 3) was first offered: after
   * sign up for a new tradie, once for an existing one. Null = not offered yet.
   */
  quickSetupSeenAt: timestamp("quick_setup_seen_at"),
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

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  vendor: text("vendor"),
  receiptDate: text("receipt_date"),
  totalAmount: text("total_amount").notNull().default("0"),
  category: text("category").default("Other"),
  notes: text("notes"),
  /**
   * JSON array of lines (shared/receipt-lines.ts): { description, amount } and,
   * from pricing step 4, quantity, unit, unitPrice and lineDiscount when printed.
   * Old receipts have description and amount only; both shapes read the same.
   */
  items: text("items"),
  /** The receipt's prices include GST (normal for an Australian tax invoice). Null = not stated. */
  pricesIncludeGst: boolean("prices_include_gst"),
  /** A discount on the whole receipt, not tied to a line. Such a receipt is an expense but teaches no prices. */
  receiptDiscount: numeric("receipt_discount", { precision: 12, scale: 2 }),
  jobId: integer("job_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  receipts_user_id_idx: index("receipts_user_id_idx").on(t.userId),
}));

export const insertReceiptSchema = createInsertSchema(receipts).omit({ id: true, createdAt: true });
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

/**
 * Every AI quote generation, exactly as the tradie received it, and what they
 * finally sent. The pair (response vs sentSnapshot) is the correction record:
 * where the AI was wrong and how the tradie fixed it. Written by
 * /api/quotes/generate; never blocks quoting if the write fails.
 */
export const aiGenerations = pgTable("ai_generations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  quoteId: integer("quote_id").references(() => quotes.id),
  /** One per draft on the phone: groups a first generation with its clarify reruns. */
  draftKey: text("draft_key"),
  /** JSON of what was asked: description, rates, markup, GST, clarify answers. Never images. */
  input: text("input").notNull(),
  /** JSON of the response as returned to the phone, after server normalisation. */
  response: text("response").notNull(),
  model: text("model"),
  /** The quote's content when it was first sent. */
  sentSnapshot: text("sent_snapshot"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  ai_generations_user_id_idx: index("ai_generations_user_id_idx").on(t.userId),
  ai_generations_quote_id_idx: index("ai_generations_quote_id_idx").on(t.quoteId),
}));

export type AiGeneration = typeof aiGenerations.$inferSelect;
export type InsertAiGeneration = typeof aiGenerations.$inferInsert;

/**
 * Each tradie's own price list (docs/pricing-design.md, step 2): what they pay
 * for an item, learned from their own records. History is kept, one row per
 * price seen; the newest per item wins (shared/price-list.ts).
 *
 * Only these fields, by design: item, quantity, unit, unit price, date and
 * supplier. Never a customer, address, job or quote reference. Deleted with the
 * account (storage.deleteAccount).
 */
export const priceListItems = pgTable("price_list_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  item: text("item").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }),
  unit: text("unit").notNull(),
  /** What the tradie pays per unit, ex GST. */
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  priceDate: timestamp("price_date").notNull().defaultNow(),
  /** Where it was bought. Null when it was learned from a quote edit. */
  supplier: text("supplier"),
  /** How it was learned: 'edit', 'quick_setup' or 'receipt' (null on rows from before step 4). */
  source: text("source"),
  /**
   * The receipt (the tradie's own expense record) a 'receipt' price came from, so
   * saving it again replaces what it taught and deleting it removes those prices.
   * Never a customer, job or quote reference.
   */
  receiptId: integer("receipt_id").references(() => receipts.id),
}, (t) => ({
  price_list_items_user_id_idx: index("price_list_items_user_id_idx").on(t.userId),
}));

/**
 * Remembered matches (docs/pricing-design.md, step 4): a receipt line the tradie
 * confirmed or corrected ("SL82 MESH 6X2.4" from Bunnings is their "Reinforcing
 * mesh SL82, sheet"), or a confident AI match that was applied. The same line
 * never needs the AI, or the tradie, again. Per tradie; deleted with the account.
 */
export const priceMatches = pgTable("price_matches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  /** The line text, tidied (shared/matcher lineKey). */
  lineKey: text("line_key").notNull(),
  /** The supplier's name, tidied; '' when unknown. */
  supplierKey: text("supplier_key").notNull().default(""),
  /** The matched item and its unit; null when the tradie said "not a material, ignore it". */
  item: text("item"),
  unit: text("unit"),
  /** How many of the item's unit one of the line's units is. */
  factor: numeric("factor", { precision: 14, scale: 6 }),
  ignore: boolean("ignore").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
}, (t) => ({
  price_matches_user_line_idx: uniqueIndex("price_matches_user_line_idx").on(t.userId, t.lineKey, t.supplierKey),
}));

export type PriceMatch = typeof priceMatches.$inferSelect;

export type PriceListItem = typeof priceListItems.$inferSelect;
export type InsertPriceListItem = typeof priceListItems.$inferInsert;

// Schemas
// Blank strings from a form mean "not set" and are stored as null; the type and
// contact choices must be one of the listed values; an ABN is stored digits-only
// and must pass the ATO checksum (shared/customer-fields).
const optionalText = z.string().trim().transform((v) => (v === '' ? null : v)).nullable().optional();
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true }).extend({
  companyName: optionalText,
  billingAddress: optionalText,
  accessNotes: optionalText,
  customerType: z.enum(CUSTOMER_TYPES, { errorMap: () => ({ message: `Customer type must be one of: ${CUSTOMER_TYPES.join(', ')}` }) }).nullable().optional(),
  preferredContact: z.enum(PREFERRED_CONTACTS, { errorMap: () => ({ message: `Preferred contact must be one of: ${PREFERRED_CONTACTS.join(', ')}` }) }).nullable().optional(),
  abn: z.string().nullable().optional()
    .superRefine((v, ctx) => { const p = abnProblem(v); if (p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p }); })
    .transform((v) => (v == null ? v : normaliseAbn(v) || null)),
});
export const insertJobSchema = createInsertSchema(jobs)
  .omit({ id: true, createdAt: true })
  .extend({ scheduledDate: z.coerce.date().nullable().optional() });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ id: true });
// JSON has no date type, so every date a client sends arrives as a string, and a
// Drizzle timestamp column calls .toISOString() on whatever it is handed — hence
// "toISOString is not a function" when marking an invoice paid. Coerced here the way
// insertJobSchema already does for scheduledDate.
export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true })
  .extend({
    dueDate: z.coerce.date().nullable().optional(),
    paidDate: z.coerce.date().nullable().optional(),
  });
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
export type PortalFeedback = typeof portalFeedback.$inferSelect;
export type InsertPortalFeedback = z.infer<typeof insertPortalFeedbackSchema>;

export const customerMessages = pgTable("customer_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  jobId: integer("job_id"),
  quoteId: integer("quote_id"),
  direction: text("direction").notNull().default("out"), // 'out' = sent by tradesperson, 'in' = from customer
  channel: text("channel").notNull().default("note"),   // 'sms' | 'email' | 'note'
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  customer_messages_user_id_idx: index("customer_messages_user_id_idx").on(t.userId),
}));

export const insertCustomerMessageSchema = createInsertSchema(customerMessages).omit({ id: true, createdAt: true });
export type CustomerMessage = typeof customerMessages.$inferSelect;
export type InsertCustomerMessage = z.infer<typeof insertCustomerMessageSchema>;
