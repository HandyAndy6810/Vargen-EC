/**
 * Publishes an OTA update (npm run update:preview / update:production) that
 * can only ever talk to the deployed server.
 *
 *   node scripts/publish-update.mjs preview [--message "..."]     # bundle, check, upload
 *   node scripts/publish-update.mjs preview --check                # bundle and check only
 *
 * Why: an update bundles whatever EXPO_PUBLIC_API_URL happens to be set when
 * it runs (the shell, mobile/.env, EAS). On Replit that can be the workspace's
 * own *.replit.dev address, or a local one, and every phone on the channel
 * would then send its requests (and session cookie) there. So this script:
 *
 *  1. takes the URL from eas.json (build.<branch>.env.EXPO_PUBLIC_API_URL),
 *     the same one the build used, and refuses anything that isn't https on a
 *     public host: replit.dev, localhost, .local and private / loopback IPs are
 *     refused. It must also match PRODUCTION_API_URL in lib/api.ts.
 *  2. bundles the app itself with that URL forced (a variable set here wins
 *     over mobile/.env; Expo never overwrites one that is already set),
 *  3. reads the finished bundles: the URL must be in them and no replit.dev
 *     address may be,
 *  4. only then uploads exactly those bundles (eas update --skip-bundler).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [branch, ...rest] = process.argv.slice(2);
const checkOnly = rest.includes('--check');
const passThrough = rest.filter((a) => a !== '--check');

const fail = (msg) => { console.error(`\n✖ ${msg}\n`); process.exit(1); };
if (!branch || branch.startsWith('-')) fail('Usage: node scripts/publish-update.mjs <preview|production> [eas update options]');

// 1. The URL, and whether it is safe to ship.
const eas = JSON.parse(fs.readFileSync(path.join(mobile, 'eas.json'), 'utf8'));
const url = eas.build?.[branch]?.env?.EXPO_PUBLIC_API_URL;
if (!url) fail(`eas.json has no build.${branch}.env.EXPO_PUBLIC_API_URL to publish with.`);

export function refusal(raw) {
  let u;
  try { u = new URL(raw); } catch { return `"${raw}" is not a URL.`; }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (u.protocol !== 'https:') return `${raw} is not https.`;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return `${raw} is a local address.`;
  if (host.endsWith('.replit.dev') || host === 'replit.dev') return `${raw} is a Replit workspace (replit.dev) address, which is only up while the workspace is open.`;
  const ip4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ip4) {
    const [a, b] = [Number(ip4[1]), Number(ip4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) {
      return `${raw} is a private or loopback IP address.`;
    }
    return `${raw} is a bare IP address; use the deployed server's name.`;
  }
  if (host.includes(':')) return `${raw} is an IPv6 address; use the deployed server's name.`;
  return null;
}
const why = refusal(url);
if (why) fail(`Refusing to publish: ${why}\nSet build.${branch}.env.EXPO_PUBLIC_API_URL in eas.json to the deployed server.`);

const apiTs = fs.readFileSync(path.join(mobile, 'lib/api.ts'), 'utf8');
const prod = apiTs.match(/PRODUCTION_API_URL\s*=\s*["']([^"']+)["']/)?.[1];
if (prod !== url) fail(`eas.json (${url}) and PRODUCTION_API_URL in lib/api.ts (${prod ?? 'missing'}) disagree. Make them the same.`);

if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL !== url) {
  console.log(`Note: ignoring EXPO_PUBLIC_API_URL=${process.env.EXPO_PUBLIC_API_URL} from the shell.`);
}
const dotenv = path.join(mobile, '.env');
if (fs.existsSync(dotenv)) {
  const local = fs.readFileSync(dotenv, 'utf8').match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*(.*)$/m)?.[1]?.trim();
  if (local && local !== url) console.log(`Note: mobile/.env says ${local}; this update uses ${url} instead.`);
}
console.log(`Publishing to "${branch}" with EXPO_PUBLIC_API_URL=${url}`);

// 2. Bundle with the URL forced.
const env = { ...process.env, EXPO_PUBLIC_API_URL: url, NODE_ENV: 'production' };
const outDir = path.join(mobile, 'dist');
fs.rmSync(outDir, { recursive: true, force: true });
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: mobile, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.error) fail(`Could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) fail(`${cmd} ${args.join(' ')} failed (exit ${r.status}).`);
};
run('npx', ['expo', 'export', '--platform', 'ios', '--platform', 'android', '--output-dir', 'dist']);

// 3. Read what was built.
const bundles = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|hbc)$/.test(e.name)) bundles.push(p);
  }
};
walk(outDir);
if (!bundles.length) fail('expo export produced no bundles.');
for (const b of bundles) {
  const text = fs.readFileSync(b).toString('latin1');
  const rel = path.relative(mobile, b);
  if (text.includes('replit.dev')) fail(`${rel} contains a replit.dev address. Not publishing.`);
  if (!text.includes(url)) fail(`${rel} does not contain ${url}. Not publishing.`);
  console.log(`✔ ${rel}: uses ${url}, no replit.dev`);
}
if (checkOnly) { console.log('\n--check: bundles are fine; nothing uploaded.'); process.exit(0); }

// 4. Upload exactly these bundles.
run('eas', ['update', '--branch', branch, '--skip-bundler', '--input-dir', 'dist', ...passThrough]);
