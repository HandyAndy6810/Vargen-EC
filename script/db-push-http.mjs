// Pushes schema to Neon via HTTP API (works when TCP port 5432/6543 is blocked)
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const migrationFile = join(__dirname, "../migrations/0000_noisy_sway.sql");
const sql_content = readFileSync(migrationFile, "utf-8");

// Split on statement-breaking --> markers from drizzle, then by semicolons
const statements = sql_content
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const sql = neon(DATABASE_URL);

console.log(`Executing ${statements.length} SQL statements via Neon HTTP API...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (!stmt) continue;
  try {
    await sql.query(stmt);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log(`  [${i + 1}/${statements.length}] Already exists, skipping`);
    } else {
      console.error(`  [${i + 1}/${statements.length}] ERROR: ${err.message}`);
      console.error("  Statement:", stmt.slice(0, 100));
      process.exit(1);
    }
  }
}

console.log("\nDone! All tables created in Neon.");
