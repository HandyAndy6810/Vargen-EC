import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

/**
 * APP_DATABASE_URL wins over DATABASE_URL.
 *
 * Replit provisions its own managed Postgres and injects DATABASE_URL into the
 * deployment at runtime, overwriting whatever secret is configured — so pointing
 * the app at a database we control was impossible while it read DATABASE_URL.
 * Reading a name Replit doesn't manage settles it. The fallback keeps every other
 * environment (local, CI, any host that sets DATABASE_URL normally) working
 * untouched.
 */
const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "APP_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });

// Say out loud which database this process is actually talking to. Working that
// out has repeatedly meant inferring from app behaviour, which is slow and gets it
// wrong; the deploy log should just answer it. Host and database name only —
// never the credentials.
try {
  const u = new URL(connectionString);
  const source = process.env.APP_DATABASE_URL ? "APP_DATABASE_URL" : "DATABASE_URL";
  console.log(`[startup] database: ${u.hostname}${u.pathname} (from ${source})`);
} catch {
  console.log("[startup] database: connection string could not be parsed for logging");
}
export const db = drizzle(pool, { schema });
