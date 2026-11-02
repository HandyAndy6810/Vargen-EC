import { db } from "./db";
import {
  customers, jobs, quotes, quoteItems, userSettings, xeroTokens,
  invoices, portalFeedback, jobTemplates, receipts, customerMessages, aiGenerations,
  sessions, users,
  type InsertCustomer, type InsertJob, type InsertQuote, type InsertQuoteItem,
  type InsertUserSettings, type UserSettings,
  type Customer, type Job, type Quote, type QuoteItem,
  type XeroToken, type InsertXeroToken,
  type Invoice, type InsertInvoice,
  type PortalFeedback, type InsertPortalFeedback,
  type JobTemplate, type InsertJobTemplate,
  type Receipt, type InsertReceipt,
  type CustomerMessage, type InsertCustomerMessage,
  type AiGeneration, type InsertAiGeneration,
} from "../shared/schema";
import { eq, desc, and, or, sql, inArray, getTableColumns } from "drizzle-orm";

export interface IStorage {
  // Customers (userId-scoped)
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: number, userId?: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>, userId?: string): Promise<Customer>;
  deleteCustomer(id: number, userId: string): Promise<void>;

  // Jobs (userId-scoped)
  getJobs(userId: string): Promise<Job[]>;
  getJob(id: number, userId?: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>, userId?: string): Promise<Job>;
  deleteJob(id: number, userId: string): Promise<void>;

  // Quotes (userId-scoped)
  getQuotes(userId: string): Promise<Quote[]>;
  getQuote(id: number, userId?: string): Promise<Quote | undefined>;
  getQuoteByXeroInvoiceId(xeroInvoiceId: string, userId: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>, userId?: string): Promise<Quote>;
  getQuoteByShareToken(token: string): Promise<Quote | undefined>;
  deleteQuote(id: number, userId: string): Promise<void>;
  /** Create, unless this user already has a quote with this clientId: then return that one. */
  createQuoteOnce(quote: InsertQuote, clientId: string): Promise<{ quote: Quote; created: boolean }>;

  /** Delete the account and every row belonging to it, in one transaction. */
  deleteAccount(userId: string): Promise<void>;

  // AI generations (the correction record)
  createAiGeneration(row: InsertAiGeneration): Promise<AiGeneration>;
  /** Link a generation, and every other one from the same draft, to a quote. Owner-scoped. */
  linkAiGenerations(userId: string, generationId: number, quoteId: number): Promise<number>;
  /** Store what was sent on the quote's most recent generation, the first time only. */
  snapshotSentGeneration(userId: string, quoteId: number, content: string): Promise<void>;

  // Quote Items
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;

  // Invoices (userId-scoped)
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: number, userId?: string): Promise<Invoice | undefined>;
  getInvoiceByQuoteId(quoteId: number): Promise<Invoice | undefined>;
  getInvoicesByQuoteId(quoteId: number): Promise<Invoice[]>;
  getInvoiceByXeroInvoiceId(xeroInvoiceId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: string): Promise<Invoice>;
  getNextInvoiceNumber(userId: string): Promise<string>;


  // Portal Feedback (no auth — public)
  createPortalFeedback(feedback: InsertPortalFeedback): Promise<PortalFeedback>;
  getPortalFeedback(quoteId: number): Promise<PortalFeedback[]>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  getAnyUserSettings(): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings>;

  // Job Templates
  getJobTemplates(userId: string): Promise<JobTemplate[]>;
  createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate>;
  deleteJobTemplate(id: number, userId: string): Promise<void>;

  // Recent Activity (userId-scoped)
  getRecentActivity(userId: string, limit?: number): Promise<Array<{
    type: "quote_created" | "quote_accepted" | "quote_rejected" | "job_scheduled" | "job_completed";
    description: string;
    timestamp: Date;
    entityId: number;
    entityType: "quote" | "job";
  }>>;

  // Xero Tokens
  getXeroToken(userId: string): Promise<XeroToken | undefined>;
  getXeroTokenByTenantId(tenantId: string): Promise<XeroToken | undefined>;
  upsertXeroToken(userId: string, token: Omit<InsertXeroToken, "userId">): Promise<XeroToken>;
  deleteXeroToken(userId: string): Promise<void>;

  // Receipts
  getReceipts(userId: string): Promise<Receipt[]>;
  getReceipt(id: number, userId: string): Promise<Receipt | undefined>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: number, userId: string, updates: Partial<InsertReceipt>): Promise<Receipt>;
  deleteReceipt(id: number, userId: string): Promise<void>;
  getReceiptsByJobId(jobId: number, userId: string): Promise<Receipt[]>;

  // Customer messages
  getCustomerMessages(userId: string, customerId: number): Promise<CustomerMessage[]>;
  createCustomerMessage(msg: InsertCustomerMessage): Promise<CustomerMessage>;
  deleteCustomerMessage(id: number, userId: string): Promise<void>;
}

/**
 * An update never changes who owns a record, or its id. The update schemas are
 * partial copies of the insert schemas, which include userId, and .set() writes
 * whatever it is given — so a PATCH carrying a userId moved the record into
 * that account. A quote moved that way showed the other tradie's business name,
 * logo and ABN on its customer page above content its sender wrote. Stripping
 * here covers every route, including ones not yet written.
 */
function withoutOwnership<T extends Record<string, any>>(patch: T): Omit<T, 'userId' | 'id'> {
  const { userId: _u, id: _i, ...rest } = patch ?? ({} as T);
  return rest;
}

export class DatabaseStorage implements IStorage {
  // ── Customers ───────────────────────────────────────────────────────
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number, userId?: string): Promise<Customer | undefined> {
    const conditions = userId
      ? and(eq(customers.id, id), eq(customers.userId, userId))
      : eq(customers.id, id);
    const [customer] = await db.select().from(customers).where(conditions);
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>, userId?: string): Promise<Customer> {
    const conditions = userId
      ? and(eq(customers.id, id), eq(customers.userId, userId))
      : eq(customers.id, id);
    const [updated] = await db.update(customers).set(withoutOwnership(customer)).where(conditions).returning();
    return updated;
  }

  async deleteCustomer(id: number, userId: string): Promise<void> {
    // Their message log goes with them — the app promises "all their contact
    // history" is removed — and it has to go first: the messages point at the
    // customer, so deleting the customer alone failed on any customer who had one.
    await db.transaction(async (tx) => {
      await tx.delete(customerMessages).where(and(eq(customerMessages.customerId, id), eq(customerMessages.userId, userId)));
      await tx.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    });
  }

  // ── Jobs ─────────────────────────────────────────────────────────────
  async getJobs(userId: string): Promise<Job[]> {
    return await db.select().from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.scheduledDate));
  }

  async getJobsWithCustomer(userId: string): Promise<(Job & { customerName: string | null; customerPhone: string | null })[]> {
    return await db
      // getTableColumns rather than a hand-written column list. Every one of these
      // selects had silently gone stale: the jobs one dropped quoteId/invoiceId, so
      // a job's links to its quote and invoice never reached the app; the quotes one
      // dropped jobTitle; the invoices one dropped invoiceType, which is what marks a
      // deposit or balance. The row TYPE said the columns were there, so nothing
      // complained — the values just arrived undefined. Spreading the table's columns
      // cannot drift when a column is added.
      .select({
        ...getTableColumns(jobs),
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.scheduledDate));
  }

  async getJob(id: number, userId?: string): Promise<Job | undefined> {
    const conditions = userId
      ? and(eq(jobs.id, id), eq(jobs.userId, userId))
      : eq(jobs.id, id);
    const [job] = await db.select().from(jobs).where(conditions);
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>, userId?: string): Promise<Job> {
    const conditions = userId
      ? and(eq(jobs.id, id), eq(jobs.userId, userId))
      : eq(jobs.id, id);
    const [updatedJob] = await db.update(jobs).set(withoutOwnership(job)).where(conditions).returning();
    return updatedJob;
  }

  async deleteJob(id: number, userId: string): Promise<void> {
    // A job is a slot in the diary; the quote and the receipts it gathered are
    // records in their own right. Quotes point at the job with a foreign key, so
    // deleting a job a quote was linked to failed outright. Unlink first: the
    // quote stays, and its receipts become general expenses instead of pointing
    // at a job that no longer exists.
    await db.transaction(async (tx) => {
      await tx.update(quotes).set({ jobId: null }).where(and(eq(quotes.jobId, id), eq(quotes.userId, userId)));
      await tx.update(receipts).set({ jobId: null }).where(and(eq(receipts.jobId, id), eq(receipts.userId, userId)));
      await tx.update(customerMessages).set({ jobId: null }).where(and(eq(customerMessages.jobId, id), eq(customerMessages.userId, userId)));
      await tx.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
    });
  }

  // ── Quotes ────────────────────────────────────────────────────────────
  async getQuotes(userId: string): Promise<Quote[]> {
    return await db.select().from(quotes)
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));
  }

  async getQuotesWithCustomer(userId: string): Promise<(Quote & { customerName: string | null })[]> {
    return await db
      .select({
        ...getTableColumns(quotes),
        customerName: customers.name,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: number, userId?: string): Promise<Quote | undefined> {
    const conditions = userId
      ? and(eq(quotes.id, id), eq(quotes.userId, userId))
      : eq(quotes.id, id);
    const [quote] = await db.select().from(quotes).where(conditions);
    return quote;
  }

  async getQuoteByXeroInvoiceId(xeroInvoiceId: string, userId: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(
      and(eq(quotes.xeroInvoiceId, xeroInvoiceId), eq(quotes.userId, userId))
    );
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async createQuoteOnce(quote: InsertQuote, clientId: string): Promise<{ quote: Quote; created: boolean }> {
    // The advisory lock (held until the transaction ends) serialises creates for
    // the same user + clientId, so two retries racing each other still produce one
    // quote. It's keyed by a hash; a rare collision only makes an unrelated save
    // wait a moment, never merge.
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${quote.userId}:${clientId}`}))`);
      const [existing] = await tx.select().from(quotes)
        .where(and(eq(quotes.userId, quote.userId as string), eq(quotes.clientId, clientId)))
        .limit(1);
      if (existing) return { quote: existing, created: false };
      const [created] = await tx.insert(quotes).values({ ...quote, clientId }).returning();
      return { quote: created, created: true };
    });
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>, userId?: string): Promise<Quote> {
    const conditions = userId
      ? and(eq(quotes.id, id), eq(quotes.userId, userId))
      : eq(quotes.id, id);
    const [updatedQuote] = await db.update(quotes).set(withoutOwnership(quote)).where(conditions).returning();
    return updatedQuote;
  }

  async getQuoteByShareToken(token: string): Promise<Quote | undefined> {
    // Public — no userId filter (portal access)
    const [quote] = await db.select().from(quotes).where(eq(quotes.shareToken, token));
    return quote;
  }

  async deleteQuote(id: number, userId: string): Promise<void> {
    // One transaction, ownership checked inside it. This used to delete the line
    // items first, on their own, by quote id alone — then delete the quote, which
    // the database refused whenever anything else pointed at it. The error came
    // back, but the quote had already lost every line. Jobs keep existing with
    // the link cleared; portal feedback and line items belong to the quote and
    // go with it. Invoices are refused at the route: they're money records.
    await db.transaction(async (tx) => {
      const [owned] = await tx.select({ id: quotes.id }).from(quotes)
        .where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
      if (!owned) return;
      await tx.update(jobs).set({ quoteId: null }).where(and(eq(jobs.quoteId, id), eq(jobs.userId, userId)));
      await tx.delete(portalFeedback).where(eq(portalFeedback.quoteId, id));
      await tx.delete(quoteItems).where(eq(quoteItems.quoteId, id));
      // The AI's record of this quote is the tradie's data too: it goes with it.
      await tx.delete(aiGenerations).where(and(eq(aiGenerations.quoteId, id), eq(aiGenerations.userId, userId)));
      await tx.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
    });
  }

  // ── Account deletion ──────────────────────────────────────────────────
  /**
   * Everything the user owns, then the user. One transaction: it all goes, or (on
   * any error) nothing does. Ordered by the foreign keys in shared/schema.ts:
   * children before parents, and the quotes ⇄ jobs ⇄ invoices links cleared
   * first because jobs point at quotes and invoices while quotes point at jobs.
   *
   * Not here, because nothing in them belongs to a user: conversations and
   * messages (the chat integration's tables have no owner column).
   */
  async deleteAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const myQuotes = tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.userId, userId));

      // Break the cycles first.
      await tx.update(jobs).set({ quoteId: null, invoiceId: null }).where(eq(jobs.userId, userId));
      await tx.update(quotes).set({ jobId: null }).where(eq(quotes.userId, userId));

      // Rows that hang off the user's quotes.
      await tx.delete(aiGenerations).where(eq(aiGenerations.userId, userId));
      await tx.delete(quoteItems).where(inArray(quoteItems.quoteId, myQuotes));
      await tx.delete(portalFeedback).where(inArray(portalFeedback.quoteId, myQuotes));

      // The documents, then what they point at.
      await tx.delete(invoices).where(eq(invoices.userId, userId));
      await tx.delete(jobs).where(eq(jobs.userId, userId));
      await tx.delete(quotes).where(eq(quotes.userId, userId));
      await tx.delete(customerMessages).where(eq(customerMessages.userId, userId));
      await tx.delete(receipts).where(eq(receipts.userId, userId));
      await tx.delete(customers).where(eq(customers.userId, userId));

      // Account-level rows.
      await tx.delete(jobTemplates).where(eq(jobTemplates.userId, userId));
      await tx.delete(xeroTokens).where(eq(xeroTokens.userId, userId));
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));

      // Every signed-in session (the user id lives inside the session JSON), then the user.
      await tx.delete(sessions).where(sql`${sessions.sess} ->> 'localUserId' = ${userId}`);
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  // ── AI generations ────────────────────────────────────────────────────
  async createAiGeneration(row: InsertAiGeneration): Promise<AiGeneration> {
    const [created] = await db.insert(aiGenerations).values(row).returning();
    return created;
  }

  async linkAiGenerations(userId: string, generationId: number, quoteId: number): Promise<number> {
    // Both the generation and the quote must belong to this user; a body naming
    // someone else's generation (or quote) links nothing.
    const [gen] = await db.select({ id: aiGenerations.id, draftKey: aiGenerations.draftKey })
      .from(aiGenerations)
      .where(and(eq(aiGenerations.id, generationId), eq(aiGenerations.userId, userId)));
    if (!gen) return 0;
    const [owned] = await db.select({ id: quotes.id }).from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.userId, userId)));
    if (!owned) return 0;
    // The first generation and its clarify reruns share a draft key: link them all.
    const which = gen.draftKey
      ? or(eq(aiGenerations.id, gen.id), eq(aiGenerations.draftKey, gen.draftKey))
      : eq(aiGenerations.id, gen.id);
    const linked = await db.update(aiGenerations).set({ quoteId })
      .where(and(eq(aiGenerations.userId, userId), which))
      .returning({ id: aiGenerations.id });
    return linked.length;
  }

  async snapshotSentGeneration(userId: string, quoteId: number, content: string): Promise<void> {
    const [latest] = await db.select({ id: aiGenerations.id, sentAt: aiGenerations.sentAt })
      .from(aiGenerations)
      .where(and(eq(aiGenerations.quoteId, quoteId), eq(aiGenerations.userId, userId)))
      .orderBy(desc(aiGenerations.createdAt), desc(aiGenerations.id))
      .limit(1);
    if (!latest || latest.sentAt) return;
    await db.update(aiGenerations).set({ sentSnapshot: content, sentAt: new Date() })
      .where(eq(aiGenerations.id, latest.id));
  }

  // ── Quote Items ───────────────────────────────────────────────────────
  async getQuoteItems(quoteId: number): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db.insert(quoteItems).values(item).returning();
    return newItem;
  }

  /** One row by id, so a caller can check who owns the quote it belongs to. */
  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    const [row] = await db.select().from(quoteItems).where(eq(quoteItems.id, id));
    return row;
  }

  async deleteQuoteItem(id: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.id, id));
  }

  /**
   * Replace a quote's rows wholesale, in ONE transaction.
   *
   * The mobile app used to do this as N sequential HTTP deletes followed by N
   * posts, each able to fail on its own and each failure swallowed — so a quote
   * could be left with some old rows, some new, or none. Inside a transaction it
   * is all or nothing.
   */
  async replaceQuoteItems(
    quoteId: number,
    rows: { description: string; quantity: number; price: number }[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
      if (rows.length === 0) return;
      await tx.insert(quoteItems).values(
        rows.map((r) => ({
          quoteId,
          description: r.description,
          // Both numeric columns; drizzle wants them as strings.
          quantity: String(r.quantity),
          price: String(r.price),
        })),
      );
    });
  }

  // ── Invoices ──────────────────────────────────────────────────────────
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesWithCustomer(userId: string): Promise<(Invoice & { customerName: string | null })[]> {
    return await db
      .select({
        ...getTableColumns(invoices),
        customerName: customers.name,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async deleteInvoice(id: number, userId: string): Promise<void> {
    // A job can point at its invoice, which made this fail for any linked job.
    await db.transaction(async (tx) => {
      await tx.update(jobs).set({ invoiceId: null }).where(and(eq(jobs.invoiceId, id), eq(jobs.userId, userId)));
      await tx.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    });
  }

  async getInvoice(id: number, userId?: string): Promise<Invoice | undefined> {
    const conditions = userId
      ? and(eq(invoices.id, id), eq(invoices.userId, userId))
      : eq(invoices.id, id);
    const [invoice] = await db.select().from(invoices).where(conditions);
    return invoice;
  }

  async getInvoiceByQuoteId(quoteId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.quoteId, quoteId));
    return invoice;
  }

  // A quote can carry several invoices once deposits are in play
  async getInvoicesByQuoteId(quoteId: number): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.quoteId, quoteId))
      .orderBy(invoices.createdAt);
  }

  async getInvoiceByXeroInvoiceId(xeroInvoiceId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.xeroInvoiceId, xeroInvoiceId));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: string): Promise<Invoice> {
    const conditions = userId
      ? and(eq(invoices.id, id), eq(invoices.userId, userId))
      : eq(invoices.id, id);
    const [updated] = await db.update(invoices).set(withoutOwnership(invoice)).where(conditions).returning();
    return updated;
  }

  async getNextInvoiceNumber(userId: string): Promise<string> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.userId, userId));
    const next = (result?.count || 0) + 1;
    return `INV-${String(next).padStart(4, "0")}`;
  }

  // ── Portal Feedback ───────────────────────────────────────────────────
  async createPortalFeedback(feedback: InsertPortalFeedback): Promise<PortalFeedback> {
    const [newFeedback] = await db.insert(portalFeedback).values(feedback).returning();
    return newFeedback;
  }

  async getPortalFeedback(quoteId: number): Promise<PortalFeedback[]> {
    return await db.select().from(portalFeedback)
      .where(eq(portalFeedback.quoteId, quoteId))
      .orderBy(desc(portalFeedback.createdAt));
  }

  // ── User Settings ─────────────────────────────────────────────────────
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async getAnyUserSettings(): Promise<UserSettings | undefined> {
    // Used only in public portal routes to fetch business name/contact
    const [settings] = await db.select().from(userSettings).limit(1);
    return settings;
  }

  async upsertUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings> {
    const [settings] = await db
      .insert(userSettings)
      .values({ userId, ...updates })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    return settings;
  }

  // ── Job Templates ─────────────────────────────────────────────────────
  async getJobTemplates(userId: string): Promise<JobTemplate[]> {
    return await db.select().from(jobTemplates)
      .where(eq(jobTemplates.userId, userId))
      .orderBy(desc(jobTemplates.createdAt));
  }

  async createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate> {
    const [newTemplate] = await db.insert(jobTemplates).values(template).returning();
    return newTemplate;
  }

  async deleteJobTemplate(id: number, userId: string): Promise<void> {
    await db.delete(jobTemplates)
      .where(and(eq(jobTemplates.id, id), eq(jobTemplates.userId, userId)));
  }

  // ── Recent Activity ───────────────────────────────────────────────────
  async getRecentActivity(userId: string, limit: number = 20): Promise<Array<{
    type: "quote_created" | "quote_accepted" | "quote_rejected" | "job_scheduled" | "job_completed";
    description: string;
    timestamp: Date;
    entityId: number;
    entityType: "quote" | "job";
  }>> {
    const recentQuotes = await db.select().from(quotes)
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt))
      .limit(limit);

    const recentJobs = await db.select().from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);

    const activities: Array<{
      type: "quote_created" | "quote_accepted" | "quote_rejected" | "job_scheduled" | "job_completed";
      description: string;
      timestamp: Date;
      entityId: number;
      entityType: "quote" | "job";
    }> = [];

    for (const q of recentQuotes) {
      let jobTitle = "Untitled";
      try {
        const parsed = JSON.parse(q.content || "{}");
        jobTitle = parsed.jobTitle || parsed.title || "Untitled";
      } catch {}

      if (q.status === "accepted") {
        activities.push({ type: "quote_accepted", description: `Quote accepted: ${jobTitle} ($${Number(q.totalAmount).toLocaleString()})`, timestamp: q.createdAt || new Date(), entityId: q.id, entityType: "quote" });
      } else if (q.status === "rejected" || q.status === "declined") {
        activities.push({ type: "quote_rejected", description: `Quote rejected: ${jobTitle}`, timestamp: q.createdAt || new Date(), entityId: q.id, entityType: "quote" });
      } else {
        activities.push({ type: "quote_created", description: `Quote created: ${jobTitle} ($${Number(q.totalAmount).toLocaleString()})`, timestamp: q.createdAt || new Date(), entityId: q.id, entityType: "quote" });
      }
    }

    for (const j of recentJobs) {
      if (j.status === "completed") {
        activities.push({ type: "job_completed", description: `Job completed: ${j.title}`, timestamp: j.createdAt || new Date(), entityId: j.id, entityType: "job" });
      } else {
        activities.push({ type: "job_scheduled", description: `Job scheduled: ${j.title}`, timestamp: j.createdAt || new Date(), entityId: j.id, entityType: "job" });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);
  }

  // ── Xero Tokens ───────────────────────────────────────────────────────
  async getXeroToken(userId: string): Promise<XeroToken | undefined> {
    const [token] = await db.select().from(xeroTokens).where(eq(xeroTokens.userId, userId));
    return token;
  }

  async getXeroTokenByTenantId(tenantId: string): Promise<XeroToken | undefined> {
    const [token] = await db.select().from(xeroTokens).where(eq(xeroTokens.tenantId, tenantId));
    return token;
  }

  async upsertXeroToken(userId: string, token: Omit<InsertXeroToken, "userId">): Promise<XeroToken> {
    const [result] = await db
      .insert(xeroTokens)
      .values({ userId, ...token })
      .onConflictDoUpdate({
        target: xeroTokens.userId,
        set: { ...token, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async deleteXeroToken(userId: string): Promise<void> {
    await db.delete(xeroTokens).where(eq(xeroTokens.userId, userId));
  }

  // ── Receipts ─────────────────────────────────────────────────────────
  async getReceipts(userId: string): Promise<Receipt[]> {
    return await db.select().from(receipts)
      .where(eq(receipts.userId, userId))
      .orderBy(desc(receipts.createdAt));
  }

  async getReceipt(id: number, userId: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
    return receipt;
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const [newReceipt] = await db.insert(receipts).values(receipt).returning();
    return newReceipt;
  }

  async updateReceipt(id: number, userId: string, updates: Partial<InsertReceipt>): Promise<Receipt> {
    const [updated] = await db.update(receipts)
      .set(withoutOwnership(updates))
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteReceipt(id: number, userId: string): Promise<void> {
    await db.delete(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  }

  async getReceiptsByJobId(jobId: number, userId: string): Promise<Receipt[]> {
    return await db.select().from(receipts)
      .where(and(eq(receipts.jobId, jobId), eq(receipts.userId, userId)));
  }

  async getCustomerMessages(userId: string, customerId: number): Promise<CustomerMessage[]> {
    return db
      .select()
      .from(customerMessages)
      .where(and(eq(customerMessages.userId, userId), eq(customerMessages.customerId, customerId)))
      .orderBy(customerMessages.createdAt);
  }

  async createCustomerMessage(msg: InsertCustomerMessage): Promise<CustomerMessage> {
    const [created] = await db.insert(customerMessages).values(msg).returning();
    return created;
  }

  async deleteCustomerMessage(id: number, userId: string): Promise<void> {
    await db.delete(customerMessages).where(and(eq(customerMessages.id, id), eq(customerMessages.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
