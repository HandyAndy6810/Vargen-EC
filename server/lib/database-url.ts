/**
 * Which database this process talks to. The one place that decides it: the
 * server pool, the session store, drizzle.config.ts and the scripts all ask here,
 * so no two of them can ever disagree.
 *
 * On Replit the workspace and the deployment share their secrets, so
 * APP_DATABASE_URL is production in both. Anything a person runs in the
 * workspace (the Run button, `npm run db:push`, the post-merge hook) sets
 * VARGEN_DB_TARGET=dev, and in that mode ONLY DEV_DATABASE_URL is used. If it's
 * missing we refuse rather than fall back, because the fallback is production:
 * on 25 Oct 2026 a stale branch pushed from the workspace nearly dropped three
 * production columns.
 *
 * Without the flag (the deployment's build and its running server) the rule is
 * unchanged: APP_DATABASE_URL, then DATABASE_URL. APP_DATABASE_URL exists
 * because Replit injects its own DATABASE_URL into deployments at runtime.
 *
 * Dependency-free on purpose: drizzle.config.ts imports it.
 */

export type DbTarget = 'dev' | 'default';
export type DbSource = 'DEV_DATABASE_URL' | 'APP_DATABASE_URL' | 'DATABASE_URL';
export type ResolvedDatabase = { url: string; source: DbSource; target: DbTarget };

type Env = Record<string, string | undefined>;

export function resolveDatabaseUrl(env: Env = process.env): ResolvedDatabase {
  if (env.VARGEN_DB_TARGET === 'dev') {
    if (!env.DEV_DATABASE_URL) {
      throw new Error(
        'DEV_DATABASE_URL is not set; refusing to fall back to production. ' +
        'Add it in Replit Secrets, set to the Neon dev branch connection string.',
      );
    }
    return { url: env.DEV_DATABASE_URL, source: 'DEV_DATABASE_URL', target: 'dev' };
  }
  if (env.APP_DATABASE_URL) return { url: env.APP_DATABASE_URL, source: 'APP_DATABASE_URL', target: 'default' };
  if (env.DATABASE_URL) return { url: env.DATABASE_URL, source: 'DATABASE_URL', target: 'default' };
  throw new Error('APP_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?');
}

/** "host/dbname (from SOURCE, target dev)" for startup logs. Never the credentials. */
export function describeDatabase(db: ResolvedDatabase): string {
  let where = 'connection string could not be parsed for logging';
  try {
    const u = new URL(db.url);
    where = `${u.hostname}${u.pathname}`;
  } catch { /* keep the fallback text */ }
  return `${where} (from ${db.source}, target ${db.target})`;
}
