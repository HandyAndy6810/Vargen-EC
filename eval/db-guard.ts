/**
 * The model comparison only reads the dev database (the eval user's settings,
 * price list, remembered matches and past quotes). It refuses to start against
 * production, using the same resolver as the server (server/lib/database-url.ts).
 * Pure: tested in db-guard.test.ts.
 */
import { resolveDatabaseUrl, describeDatabase, type ResolvedDatabase } from '../server/lib/database-url';

type Env = Record<string, string | undefined>;

const where = (url: string | undefined) => {
  if (!url) return null;
  try { const u = new URL(url); return `${u.hostname}${u.pathname}`.toLowerCase(); } catch { return null; }
};

export function evalDatabase(env: Env): { ok: true; description: string } | { ok: false; message: string } {
  if (env.VARGEN_DB_TARGET !== 'dev') {
    return { ok: false, message: 'Refusing to run: VARGEN_DB_TARGET is not "dev". Run it with `npm run eval:models`, which sets it.' };
  }
  let db: ResolvedDatabase;
  try {
    db = resolveDatabaseUrl(env);
  } catch (err) {
    return { ok: false, message: `Refusing to run: ${(err as Error).message}` };
  }
  if (db.target !== 'dev' || db.source !== 'DEV_DATABASE_URL') {
    return { ok: false, message: `Refusing to run: the database resolved to ${describeDatabase(db)}, not the dev branch.` };
  }
  // On Replit APP_DATABASE_URL is production. A dev URL that points at the same
  // database is production, whatever it's called.
  const dev = where(db.url);
  for (const prod of ['APP_DATABASE_URL', 'DATABASE_URL'] as const) {
    if (dev && where(env[prod]) === dev) {
      return { ok: false, message: `Refusing to run: DEV_DATABASE_URL points at the same database as ${prod} (production).` };
    }
  }
  return { ok: true, description: describeDatabase(db) };
}
