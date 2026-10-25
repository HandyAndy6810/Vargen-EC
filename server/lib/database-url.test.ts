import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseUrl, describeDatabase } from './database-url';

const PROD = 'postgresql://prod_user:prod_secret@ep-prod.example.neon.tech/neondb?sslmode=require';
const DEV = 'postgresql://dev_user:dev_secret@ep-dev.example.neon.tech/neondb?sslmode=require';
const REPLIT = 'postgresql://r:r@replit-internal/db';

describe('resolveDatabaseUrl, dev target', () => {
  test('uses DEV_DATABASE_URL and nothing else', () => {
    const r = resolveDatabaseUrl({ VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: DEV, APP_DATABASE_URL: PROD, DATABASE_URL: REPLIT });
    assert.deepEqual(r, { url: DEV, source: 'DEV_DATABASE_URL', target: 'dev' });
  });

  test('refuses, rather than falling back to production, when DEV_DATABASE_URL is missing', () => {
    for (const env of [
      { VARGEN_DB_TARGET: 'dev', APP_DATABASE_URL: PROD, DATABASE_URL: REPLIT },
      { VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: '', APP_DATABASE_URL: PROD },
      { VARGEN_DB_TARGET: 'dev' },
    ]) {
      assert.throws(() => resolveDatabaseUrl(env), /DEV_DATABASE_URL is not set; refusing to fall back to production/);
    }
  });
});

describe('resolveDatabaseUrl, default target (deployment)', () => {
  test('APP_DATABASE_URL wins over DATABASE_URL, as before', () => {
    assert.deepEqual(resolveDatabaseUrl({ APP_DATABASE_URL: PROD, DATABASE_URL: REPLIT }), { url: PROD, source: 'APP_DATABASE_URL', target: 'default' });
    assert.deepEqual(resolveDatabaseUrl({ DATABASE_URL: REPLIT }), { url: REPLIT, source: 'DATABASE_URL', target: 'default' });
  });

  test('ignores DEV_DATABASE_URL, which may be present in the deployment too', () => {
    assert.equal(resolveDatabaseUrl({ DEV_DATABASE_URL: DEV, APP_DATABASE_URL: PROD }).url, PROD);
  });

  test('any other VARGEN_DB_TARGET value is the default rule', () => {
    assert.equal(resolveDatabaseUrl({ VARGEN_DB_TARGET: 'prod', APP_DATABASE_URL: PROD, DEV_DATABASE_URL: DEV }).url, PROD);
  });

  test('throws when nothing is set', () => {
    assert.throws(() => resolveDatabaseUrl({}), /APP_DATABASE_URL or DATABASE_URL must be set/);
  });
});

describe('describeDatabase', () => {
  test('shows host, source and target, never credentials', () => {
    const line = describeDatabase(resolveDatabaseUrl({ VARGEN_DB_TARGET: 'dev', DEV_DATABASE_URL: DEV }));
    assert.equal(line, 'ep-dev.example.neon.tech/neondb (from DEV_DATABASE_URL, target dev)');
    assert.ok(!line.includes('dev_secret') && !line.includes('dev_user'));
  });
});
