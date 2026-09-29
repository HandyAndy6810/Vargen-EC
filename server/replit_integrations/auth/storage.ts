import { users, type User, type UpsertUser } from "../../../shared/models/auth";
import { db } from "../../db";
import { eq, and, gt, sql } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  setPassword(userId: string, hashedPassword: string): Promise<void>;
  saveResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearResetToken(userId: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Emails match regardless of case and surrounding spaces. It was an exact
  // match, so "Andrew@…" from a phone keyboard's auto-capital, or a trailing
  // space from autofill, failed to sign in — and register would have created a
  // second account for the same person. Existing mixed-case addresses still
  // match, because both sides are normalised here.
  async getUserByEmail(email: string): Promise<User | undefined> {
    const wanted = String(email ?? '').trim().toLowerCase();
    if (!wanted) return undefined;
    const [user] = await db.select().from(users).where(sql`lower(trim(${users.email})) = ${wanted}`);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async setPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async saveResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.resetToken, token), gt(users.resetTokenExpiry, new Date())));
    return user;
  }

  async clearResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: null, resetTokenExpiry: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const authStorage = new AuthStorage();
