import { defineConfig } from "drizzle-kit";

// Same precedence as server/db.ts, so migrations and the app never target
// different databases.
const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("APP_DATABASE_URL or DATABASE_URL must be set, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
