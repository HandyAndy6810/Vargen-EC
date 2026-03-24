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
import { eq, desc, isNull, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote>;
  getQuoteByShareToken(token: string): Promise<Quote | undefined>;

  // Quote Items
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;
  deleteQuote(id: number): Promise<void>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByQuoteId(quoteId: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  getNextInvoiceNumber(): Promise<string>;

  // Job Timer Entries
  getTimerEntries(jobId: number): Promise<JobTimerEntry[]>;
  getActiveTimer(): Promise<JobTimerEntry | undefined>;
  createTimerEntry(entry: InsertJobTimerEntry): Promise<JobTimerEntry>;
  updateTimerEntry(id: number, entry: Partial<InsertJobTimerEntry>): Promise<JobTimerEntry>;
  deleteTimerEntry(id: number): Promise<void>;

  // Portal Feedback
  createPortalFeedback(feedback: InsertPortalFeedback): Promise<PortalFeedback>;
  getPortalFeedback(quoteId: number): Promise<PortalFeedback[]>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings>;

  // Job Templates
  getJobTemplates(userId: string): Promise<JobTemplate[]>;
  createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate>;
  deleteJobTemplate(id: number, userId: string): Promise<void>;

  // Recent Activity
  getRecentActivity(limit?: number): Promise<Array<{
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
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.scheduledDate));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const [updatedJob] = await db.update(jobs).set(job).where(eq(jobs.id, id)).returning();
    return updatedJob;
  }

  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updatedQuote] = await db.update(quotes).set(quote).where(eq(quotes.id, id)).returning();
    return updatedQuote;
  }

  async getQuoteByShareToken(token: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.shareToken, token));
    return quote;
  }

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

  async deleteQuote(id: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
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

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const next = (result?.count || 0) + 1;
    return `INV-${String(next).padStart(4, "0")}`;
  }

  // Job Timer Entries
  async getTimerEntries(jobId: number): Promise<JobTimerEntry[]> {
    return await db.select().from(jobTimerEntries)
      .where(eq(jobTimerEntries.jobId, jobId))
      .orderBy(desc(jobTimerEntries.startTime));
  }

  async getActiveTimer(): Promise<JobTimerEntry | undefined> {
    const [entry] = await db.select().from(jobTimerEntries)
      .where(isNull(jobTimerEntries.endTime));
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

  // Portal Feedback
  async createPortalFeedback(feedback: InsertPortalFeedback): Promise<PortalFeedback> {
    const [newFeedback] = await db.insert(portalFeedback).values(feedback).returning();
    return newFeedback;
  }

  async getPortalFeedback(quoteId: number): Promise<PortalFeedback[]> {
    return await db.select().from(portalFeedback)
      .where(eq(portalFeedback.quoteId, quoteId))
      .orderBy(desc(portalFeedback.createdAt));
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
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

  async getJobTemplates(userId: string): Promise<JobTemplate[]> {
    return await db.select().from(jobTemplates).where(eq(jobTemplates.userId, userId)).orderBy(desc(jobTemplates.createdAt));
  }

  async createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate> {
    const [newTemplate] = await db.insert(jobTemplates).values(template).returning();
    return newTemplate;
  }

  async deleteJobTemplate(id: number, userId: string): Promise<void> {
    await db.delete(jobTemplates).where(sql`${jobTemplates.id} = ${id} AND ${jobTemplates.userId} = ${userId}`);
  }

  async getRecentActivity(limit: number = 20): Promise<Array<{
    type: "quote_created" | "quote_accepted" | "quote_rejected" | "job_scheduled" | "job_completed";
    description: string;
    timestamp: Date;
    entityId: number;
    entityType: "quote" | "job";
  }>> {
    const recentQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt)).limit(limit);
    const recentJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);

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
        activities.push({
          type: "quote_accepted",
          description: `Quote accepted: ${jobTitle} ($${Number(q.totalAmount).toLocaleString()})`,
          timestamp: q.createdAt || new Date(),
          entityId: q.id,
          entityType: "quote",
        });
      } else if (q.status === "rejected") {
        activities.push({
          type: "quote_rejected",
          description: `Quote rejected: ${jobTitle}`,
          timestamp: q.createdAt || new Date(),
          entityId: q.id,
          entityType: "quote",
        });
      } else {
        activities.push({
          type: "quote_created",
          description: `Quote created: ${jobTitle} ($${Number(q.totalAmount).toLocaleString()})`,
          timestamp: q.createdAt || new Date(),
          entityId: q.id,
          entityType: "quote",
        });
      }
    }

    for (const j of recentJobs) {
      if (j.status === "completed") {
        activities.push({
          type: "job_completed",
          description: `Job completed: ${j.title}`,
          timestamp: j.createdAt || new Date(),
          entityId: j.id,
          entityType: "job",
        });
      } else {
        activities.push({
          type: "job_scheduled",
          description: `Job scheduled: ${j.title}`,
          timestamp: j.createdAt || new Date(),
          entityId: j.id,
          entityType: "job",
        });
      }
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);
  }

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
