import type { Express, Request, Response } from "express";

/**
 * Any /api path no route handled is a 404 with JSON. Register it after every real
 * route and before the web app's catch-all (server/static.ts in production,
 * server/vite.ts in development), which otherwise answers ANY unmatched path,
 * /api included, with index.html and a 200. That made a removed or mistyped
 * endpoint look like a success to the phone, which then failed parsing HTML.
 */
export function registerApiNotFound(app: Express): void {
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not found" });
  });
}
