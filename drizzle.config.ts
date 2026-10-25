import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl, describeDatabase } from "./server/lib/database-url";

// The same resolver as server/db.ts, so migrations and the app never target
// different databases. `npm run db:push` sets VARGEN_DB_TARGET=dev and so only
// ever reaches DEV_DATABASE_URL (or refuses); `db:push:prod` is the deploy build's.
const database = resolveDatabaseUrl();
console.log(`[db:push] database: ${describeDatabase(database)}`);

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: database.url,
  },
});
