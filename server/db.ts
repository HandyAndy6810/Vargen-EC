import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";
import { resolveDatabaseUrl, describeDatabase } from "./lib/database-url";

const { Pool } = pg;

// Which database, and why, lives in server/lib/database-url.ts. With
// VARGEN_DB_TARGET=dev and no DEV_DATABASE_URL this throws before any pool
// exists, so the workspace can never quietly reach production.
const database = resolveDatabaseUrl();

export const pool = new Pool({ connectionString: database.url });

// Say out loud which database this process is actually talking to. Working that
// out has repeatedly meant inferring from app behaviour, which is slow and gets it
// wrong; the deploy log should just answer it. Host and database name only —
// never the credentials.
console.log(`[startup] database: ${describeDatabase(database)}`);
export const db = drizzle(pool, { schema });
