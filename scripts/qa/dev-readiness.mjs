import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

export const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const required = {
  DATABASE_URL: 'database', DIRECT_URL: 'database',
  NEXT_PUBLIC_SUPABASE_URL: 'supabase-public', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'supabase-public',
  SUPABASE_URL: 'supabase-server', SUPABASE_SERVICE_ROLE_KEY: 'supabase-server',
  NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID: 'company',
};
const optional = {
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'optional-ocr', AZURE_DOCUMENT_INTELLIGENCE_API_KEY: 'optional-ocr',
  AI_PROVIDER: 'optional-ai', OPENAI_API_KEY: 'optional-ai', OPENROUTER_API_KEY: 'optional-ai',
  MAIL_PROVIDER: 'optional-mail', GMAIL_CLIENT_ID: 'optional-mail', GMAIL_CLIENT_SECRET: 'optional-mail',
  GMAIL_REDIRECT_URI: 'optional-mail', GMAIL_ENCRYPTION_KEY: 'optional-mail', GMAIL_MAILBOX: 'optional-mail',
};

export function variableStatus(name, value) {
  if (typeof value !== 'string' || !value.trim()) return 'missing';
  const text = value.trim();
  if (/placeholder|change[-_ ]?me|replace[-_ ]?me|your[-_ ]|example|<[^>]*>/i.test(text)) return 'placeholder';
  if (/[\x00-\x20\x7f]/.test(text)) return 'invalid-format';
  if (name.endsWith('_URL') || name.endsWith('_ENDPOINT') || name.endsWith('_URI')) {
    try {
      const url = new URL(text);
      const db = name === 'DATABASE_URL' || name === 'DIRECT_URL';
      if (!url.hostname || !(db ? ['postgres:', 'postgresql:'] : ['http:', 'https:']).includes(url.protocol)) return 'invalid-format';
      if (db && (!url.username || url.pathname.length < 2)) return 'invalid-format';
      if (!db && (url.username || url.password || url.hash)) return 'invalid-format';
    } catch { return 'invalid-format'; }
  }
  if (name.endsWith('_COMPANY_ID') && !/^[a-zA-Z0-9_-]{1,128}$/.test(text)) return 'invalid-format';
  // Opaque keys are presence-only: no JWT decoding or credential validity claim.
  return 'present';
}

export function assessEnvironment(env) {
  const variables = Object.entries({ ...required, ...optional }).map(([name, group]) => ({
    name, group, status: variableStatus(name, env[name]),
  }));
  return { variables, ok: variables.every(v => !(v.name in required) || v.status === 'present') };
}

export function loadDevelopmentEnvironment(directory, loader) {
  let failed = false;
  try {
    const result = loader(directory, true, { info() {}, error() { failed = true; } });
    return { env: result.combinedEnv, failed };
  } catch { return { env: {}, failed: true }; }
}

export function loopbackUrl(value) {
  try {
    if (typeof value !== 'string' || /[\s\\]/.test(value)) return null;
    const url = new URL(value);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url;
  } catch { return null; }
}

export async function tcpReachable(url) {
  const { createConnection } = await import('node:net');
  return new Promise(resolve => {
    // Pin localhost to a literal loopback address: no DNS lookup or remote fallback.
    const host = url.hostname === '[::1]' ? '::1' : '127.0.0.1';
    const socket = createConnection({ host, port: Number(url.port || 80) });
    const finish = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(1500, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export async function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--tcp') || args.filter(arg => arg === '--tcp').length > 1) {
    console.log('FAIL readiness arguments'); return 1;
  }
  let loaded;
  try {
    // NODE_ENV=test would change Next precedence despite dev=true; require DEV mode.
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
      console.log('FAIL NODE_ENV invalid-format (development required)'); return 1;
    }
    loaded = loadDevelopmentEnvironment(projectDir, require('@next/env').loadEnvConfig);
  } catch { console.log('FAIL environment loader unavailable'); return 1; }
  const report = assessEnvironment(loaded.env);
  for (const item of report.variables) console.log(`${item.group} ${item.name}: ${item.status}`);
  let browserPresent = false;
  try {
    const { chromium } = require('@playwright/test');
    const binary = chromium.executablePath();
    browserPresent = existsSync(binary) && statSync(binary).isFile();
  } catch { /* Fixed output only. */ }
  console.log(`Chromium binary: ${browserPresent ? 'present' : 'missing'}`);
  let tcpOk = true;
  if (args.includes('--tcp')) {
    const url = loopbackUrl(process.env.CORE_FLOW_BASE_URL);
    tcpOk = Boolean(url) && await tcpReachable(url);
    console.log(`loopback TCP: ${tcpOk ? 'reachable' : 'blocked'}`);
  } else console.log('loopback TCP: NOT RUN (offline default)');
  console.log('Format/presence != connectivity, valid credentials, authorized DEV target or working integrations.');
  if (loaded.failed) console.log('FAIL environment loading');
  const ok = report.ok && !loaded.failed && browserPresent && tcpOk;
  console.log(ok ? 'PASS prerequisites (presence/format only)' : 'FAIL prerequisites');
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    console.log('FAIL readiness unavailable'); process.exitCode = 1;
  });
}
