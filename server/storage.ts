import { db } from "./db";
import {
  customers, jobs, quotes, quoteItems, userSettings, xeroTokens,
  invoices, jobTimerEntries, portalFeedback, jobTemplates,
  type InsertCustomer, type InsertJob, type InsertQuote, type InsertQuoteItem,
  type InsertUserSettings, type UserSettings,
  type Customer, type Job, type Quote, type QuoteItem,
  type XeroToken, type InsertXeroToken,
  type Invoice, type InsertInvoice,
  type JobTimerEntry, type InsertJobTimerEntry,
  type PortalFeedback, type InsertPortalFeedback,
  type JobTemplate, type InsertJobTemplate
} from "../shared/schema";
import { eq, desc, isNull, and, sql } from "drizzle-orm";

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

  // Quotes (userId-scoped)
  getQuotes(userId: string): Promise<Quote[]>;
  getQuote(id: number, userId?: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>, userId?: string): Promise<Quote>;
  getQuoteByShareToken(token: string): Promise<Quote | undefined>;
  deleteQuote(id: number, userId: string): Promise<void>;

  // Quote Items
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;

  // Invoices (userId-scoped)
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: number, userId?: string): Promise<Invoice | undefined>;
  getInvoiceByQuoteId(quoteId: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: string): Promise<Invoice>;
  getNextInvoiceNumber(userId: string): Promise<string>;

  // Job Timer Entries (userId-scoped)
  getTimerEntries(jobId: number): Promise<JobTimerEntry[]>;
  getActiveTimer(userId: string): Promise<JobTimerEntry | undefined>;
  createTimerEntry(entry: InsertJobTimerEntry): Promise<JobTimerEntry>;
  updateTimerEntry(id: number, entry: Partial<InsertJobTimerEntry>): Promise<JobTimerEntry>;
  deleteTimerEntry(id: number): Promise<void>;

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
  upsertXeroToken(userId: string, token: Omit<InsertXeroToken, "userId">): Promise<XeroToken>;
  deleteXeroToken(userId: string): Promise<void>;
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
    const [updated] = await db.update(customers).set(customer).where(conditions).returning();
    return updated;
  }

  async deleteCustomer(id: number, userId: string): Promise<void> {
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
  }

  // ── Jobs ─────────────────────────────────────────────────────────────
  async getJobs(userId: string): Promise<Job[]> {
    return await db.select().from(jobs)
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
    const [updatedJob] = await db.update(jobs).set(job).where(conditions).returning();
    return updatedJob;
  }

  // ── Quotes ────────────────────────────────────────────────────────────
  async getQuotes(userId: string): Promise<Quote[]> {
    return await db.select().from(quotes)
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

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>, userId?: string): Promise<Quote> {
    const conditions = userId
      ? and(eq(quotes.id, id), eq(quotes.userId, userId))
      : eq(quotes.id, id);
    const [updatedQuote] = await db.update(quotes).set(quote).where(conditions).returning();
    return updatedQuote;
  }

  async getQuoteByShareToken(token: string): Promise<Quote | undefined> {
    // Public — no userId filter (portal access)
    const [quote] = await db.select().from(quotes).where(eq(quotes.shareToken, token));
    return quote;
  }

  async deleteQuote(id: number, userId: string): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
  }

  // ── Quote Items ───────────────────────────────────────────────────────
  async getQuoteItems(quoteId: number): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db.insert(quoteItems).values(item).returning();
    return newItem;
  }

  async deleteQuoteItem(id: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.id, id));
  }

  // ── Invoices ──────────────────────────────────────────────────────────
  async getInvoices(userId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
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

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: string): Promise<Invoice> {
    const conditions = userId
      ? and(eq(invoices.id, id), eq(invoices.userId, userId))
      : eq(invoices.id, id);
    const [updated] = await db.update(invoices).set(invoice).where(conditions).returning();
    return updated;
  }

  async getNextInvoiceNumber(userId: string): Promise<string> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.userId, userId));
    const next = (result?.count || 0) + 1;
    return `INV-${String(next).padStart(4, "0")}`;
  }

  // ── Job Timer Entries ─────────────────────────────────────────────────
  async getTimerEntries(jobId: number): Promise<JobTimerEntry[]> {
    return await db.select().from(jobTimerEntries)
      .where(eq(jobTimerEntries.jobId, jobId))
      .orderBy(desc(jobTimerEntries.startTime));
  }

  async getActiveTimer(userId: string): Promise<JobTimerEntry | undefined> {
    const [entry] = await db.select().from(jobTimerEntries)
      .where(and(isNull(jobTimerEntries.endTime), eq(jobTimerEntries.userId, userId)));
    return entry;
  }

  async createTimerEntry(entry: InsertJobTimerEntry): Promise<JobTimerEntry> {
    const [newEntry] = await db.insert(jobTimerEntries).values(entry).returning();
    return newEntry;
  }

  async updateTimerEntry(id: number, entry: Partial<InsertJobTimerEntry>): Promise<JobTimerEntry> {
    const [updated] = await db.update(jobTimerEntries).set(entry)
      .where(eq(jobTimerEntries.id, id)).returning();
    return updated;
  }

  async deleteTimerEntry(id: number): Promise<void> {
    await db.delete(jobTimerEntries).where(eq(jobTimerEntries.id, id));
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
      } else if (q.status === "rejected") {
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
}

export const storage = new DatabaseStorage();
