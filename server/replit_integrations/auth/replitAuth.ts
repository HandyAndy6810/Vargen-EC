import session from "express-session";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authStorage } from "./storage";
import { sendPasswordResetEmail } from "../../lib/email";

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  // Same precedence as server/db.ts, and it matters.
  //
  // Replit injects its own DATABASE_URL at runtime, so reading it directly sent
  // every login session to REPLIT's database while all the app's data lives in
  // Neon. Logins worked, so nothing looked wrong — but the sessions sat in a
  // database we had otherwise stopped using, and which had already been frozen
  // once for billing. Had it been deleted, every tradie would have been signed
  // out with no clue why.
  const conString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  const sessionStore = new pgStore({
    conString,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  try {
    const u = new URL(conString!);
    const source = process.env.APP_DATABASE_URL ? "APP_DATABASE_URL" : "DATABASE_URL";
    console.log(`[startup] sessions: ${u.hostname}${u.pathname} (from ${source})`);
  } catch {
    console.log("[startup] sessions: connection string could not be parsed");
  }
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const, // CSRF mitigation: blocks cross-origin POST
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Sign in
  app.post("/api/login", authRateLimit, async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await authStorage.getUserByEmail(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      (req.session as any).localUserId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        const { password: _pw, ...safeUser } = user as any;
        res.json(safeUser);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Register
  app.post("/api/register", authRateLimit, async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      const existing = await authStorage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const hashed = await bcrypt.hash(password, 12);
      const user = await authStorage.upsertUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        password: hashed,
      });
      (req.session as any).localUserId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        const { password: _pw, ...safeUser } = user as any;
        res.json(safeUser);
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  // Dev-only: create a real session without a password (never exposed in production)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/dev-login', async (req, res) => {
      try {
        let user = await authStorage.getUserByEmail('dev@vargen.app');
        if (!user) {
          user = await authStorage.upsertUser({
            email: 'dev@vargen.app',
            firstName: 'Dev',
            lastName: 'User',
            phone: null,
            password: null,
          } as any);
        }
        (req.session as any).localUserId = user.id;
        req.session.save((err) => {
          if (err) return res.status(500).json({ message: 'Session error' });
          const { password: _pw, ...safeUser } = user as any;
          res.json(safeUser);
        });
      } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({ message: 'Dev login failed' });
      }
    });
  }

  // Forgot password — generate reset token and (stub) send email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      // Always return 200 to avoid leaking whether an email exists
      const user = await authStorage.getUserByEmail(email);
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await authStorage.saveResetToken(user.id, token, expiry);
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
        await sendPasswordResetEmail(email, `${baseUrl}/reset-password?token=${token}`);
      }
      res.json({ message: "If that email is registered, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password — validate token and set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body || {};
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      const user = await authStorage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      const hashed = await bcrypt.hash(password, 12);
      await authStorage.setPassword(user.id, hashed);
      await authStorage.clearResetToken(user.id);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if ((req.session as any).localUserId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
