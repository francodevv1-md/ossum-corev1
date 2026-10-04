import { realpathSync, lstatSync, existsSync, readFileSync, openSync, writeFileSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loopbackUrl, projectDir } from './dev-readiness.mjs';

export const EXPIRED = 'E2E blocked by expired authentication state';
const BUDGET = 20 * 60 * 1000;
const inside = (candidate, root) => {
  const relative = path.relative(root, candidate);
  return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function canonical(value) {
  let existing = path.resolve(value);
  const tail = [];
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error('blocked');
    tail.unshift(path.basename(existing)); existing = parent;
  }
  return path.join(realpathSync(existing), ...tail);
}

export function registeredRoots(directory) {
  // Read-only Git discovery; never emit Git output or errors (paths may be private).
  const output = execFileSync('git', ['worktree', 'list', '--porcelain', '-z'], {
    cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const roots = output.split('\0').filter(line => line.startsWith('worktree ')).map(line => line.slice(9));
  if (!roots.length) throw new Error('blocked');
  return roots;
}

export function validateStatePath(value, mode, roots) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !['capture', 'preflight'].includes(mode)
    || /[\x00-\x1f]/.test(value) || !roots.length) throw new Error('blocked');
  const requested = path.resolve(value);
  const parent = realpathSync(path.dirname(requested)); // Existing parent only; no directory creation.
  const target = path.join(parent, path.basename(requested));
  if (roots.some(root => inside(target, canonical(root)) || inside(requested, path.resolve(root)))) throw new Error('blocked');
  for (const start of [parent, path.dirname(requested)]) {
    for (let ancestor = start; ; ancestor = path.dirname(ancestor)) {
      if (existsSync(path.join(ancestor, '.git'))) throw new Error('blocked');
      if (path.dirname(ancestor) === ancestor) break;
    }
  }
  let stat;
  try { stat = lstatSync(target); } catch (error) { if (error.code !== 'ENOENT') throw new Error('blocked'); }
  if (mode === 'capture' && stat) throw new Error('blocked');
  if (mode === 'preflight' && (!stat?.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)) throw new Error('blocked');
  return target;
}

export function sessionOptions(env, mode, roots) {
  const url = loopbackUrl(env.CORE_FLOW_BASE_URL);
  const company = env.CORE_FLOW_COMPANY_ID;
  if (!url || typeof company !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(company)) throw new Error('blocked');
  return { base: url.origin, company, state: validateStatePath(env.CORE_FLOW_STORAGE_STATE, mode, roots) };
}

// Installed before app bootstrap. Inspect the application's own bearer fetch in
// the browser; only a fixed verdict crosses back to Node, never tokens or JSON.
export function observeMembership({ company, base }) {
  window.__ossumQaMembership = 'waiting';
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await original(...args);
    try {
      const request = args[0];
      const url = new URL(typeof request === 'string' || request instanceof URL ? request : request.url, location.href);
      if (url.origin !== base || !/^\/api\/companies\/[^/]+\/me$/.test(url.pathname)) return response;
      const headers = new Headers(args[1]?.headers ?? (request instanceof Request ? request.headers : undefined));
      if (!/^Bearer \S+$/.test(headers.get('Authorization') ?? '')) return response;
      if ((args[1]?.method ?? (request instanceof Request ? request.method : 'GET')).toUpperCase() !== 'GET') return response;
      if (response.status === 401) { window.__ossumQaMembership = 'expired'; return response; }
      const body = await response.clone().json();
      if (body?.error?.code === 'invalid_auth_token') window.__ossumQaMembership = 'expired';
      else if (response.status === 200 && url.pathname === `/api/companies/${encodeURIComponent(company)}/me`
        && body?.data?.activeCompany?.id === company
        && typeof body?.data?.user?.id === 'string' && body.data.user.id
        && typeof body?.data?.access?.role === 'string' && body.data.access.role) window.__ossumQaMembership = 'valid';
      else window.__ossumQaMembership = 'blocked';
    } catch { window.__ossumQaMembership = 'blocked'; }
    return response;
  };
}

export function storedSessionVerdict() {
  // Supabase's default persisted key; inspect only inside the browser, no JWT decoding.
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!/^sb-.+-auth-token$/.test(key ?? '')) continue;
      const session = JSON.parse(localStorage.getItem(key));
      if (typeof session?.access_token === 'string' && session.access_token
        && !(typeof session.expires_at === 'number' && session.expires_at * 1000 <= Date.now())) return 'waiting';
    }
    return 'expired';
  } catch { return 'blocked'; }
}

export async function main(args = process.argv.slice(2)) {
  const mode = args[0];
  if (args.length !== 1 || !['capture', 'preflight'].includes(mode)) {
    console.log('BLOCKED use capture or preflight'); return 1;
  }
  let browser;
  let timer;
  let interrupted = false;
  const close = async () => { if (browser) await browser.close().catch(() => {}); };
  const interrupt = () => { interrupted = true; void close(); };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const roots = registeredRoots(projectDir);
    const options = sessionOptions(process.env, mode, roots);
    const deadline = Date.now() + BUDGET;
    timer = setTimeout(interrupt, BUDGET);
    // Playwright debug logging can include URLs/transport details; keep it off.
    process.env.DEBUG = '';
    process.env.PWDEBUG = '0';
    const { chromium } = await import('@playwright/test');
    // Load only after path gates. Contents/errors never appear in output.
    const state = mode === 'preflight' ? JSON.parse(readFileSync(options.state, 'utf8')) : undefined;
    browser = await chromium.launch({ headless: mode !== 'capture', timeout: 30_000 });
    if (interrupted) throw new Error('blocked');
    const context = await browser.newContext({ storageState: state });
    await context.addInitScript(observeMembership, { base: options.base, company: options.company });
    const page = await context.newPage();
    if (mode === 'capture') console.log('Manual login required; waiting for authenticated company membership (20-minute maximum).');
    await page.goto(`${options.base}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const end = mode === 'capture' ? deadline : Math.min(deadline, Date.now() + 30_000);
    let verdict = 'waiting';
    while (Date.now() < end && !interrupted) {
      try { verdict = await page.evaluate(() => window.__ossumQaMembership ?? 'waiting'); }
      catch { verdict = 'waiting'; } // Login navigation can replace the execution context.
      if (verdict === 'valid' || verdict === 'blocked' || (mode === 'preflight' && verdict === 'expired')) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (verdict !== 'valid' || interrupted) {
      if (mode === 'preflight' && verdict === 'waiting' && !interrupted) {
        verdict = await page.evaluate(storedSessionVerdict).catch(() => 'blocked');
      }
      console.log(mode === 'preflight' && verdict === 'expired' && !interrupted
        ? EXPIRED : 'BLOCKED authenticated company membership or session budget');
      return 1;
    }
    if (mode === 'capture') {
      const fresh = await context.storageState();
      const target = validateStatePath(options.state, mode, roots);
      const descriptor = openSync(target, 'wx', 0o600); // Exclusive: never overwrite, including races.
      try { writeFileSync(descriptor, JSON.stringify(fresh), { encoding: 'utf8' }); }
      finally { closeSync(descriptor); }
      console.log('PASS fresh session saved outside Git (requested mode 0600; Windows ACL not certified)');
    } else console.log('PASS authenticated/200 JSON company membership; saved state reused without overwrite');
    return 0;
  } catch {
    console.log('BLOCKED session prerequisites or runtime; details withheld'); return 1;
  } finally {
    clearTimeout(timer);
    await close();
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    console.log('BLOCKED session runtime; details withheld'); process.exitCode = 1;
  });
}
