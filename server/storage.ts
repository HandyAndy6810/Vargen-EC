import { db } from "./db";
import {
  customers, jobs, quotes, quoteItems, userSettings, xeroTokens,
  type InsertCustomer, type InsertJob, type InsertQuote, type InsertQuoteItem,
  type InsertUserSettings, type UserSettings,
  type Customer, type Job, type Quote, type QuoteItem,
  type XeroToken, type InsertXeroToken
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

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

  // Quote Items
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;
  deleteQuote(id: number): Promise<void>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings>;

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
