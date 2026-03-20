import type { Express } from "express";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user — supports both Replit OIDC and local (mobile) sessions
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      let userId: string;
      if ((req.session as any).localUserId) {
        userId = (req.session as any).localUserId;
      } else {
        userId = req.user.claims.sub;
      }
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _pw, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Set / change password for mobile login (requires existing session)
  app.post("/api/auth/set-password", isAuthenticated, async (req: any, res) => {
    try {
      const { password } = req.body || {};
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      let userId: string;
      if ((req.session as any).localUserId) {
        userId = (req.session as any).localUserId;
      } else {
        userId = req.user.claims.sub;
      }
      const hashed = await bcrypt.hash(password, 12);
      await authStorage.setPassword(userId, hashed);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });
}
