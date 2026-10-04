import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { assessEnvironment, variableStatus, loadDevelopmentEnvironment, loopbackUrl } from './dev-readiness.mjs';
import { validateStatePath, sessionOptions, observeMembership, storedSessionVerdict } from './dev-session.mjs';

const require = createRequire(import.meta.url);
const temp = () => mkdtempSync(path.join(tmpdir(), 'ossum-qa-synthetic-'));

test('fixed allowlist, required failures, opaque optional keys and private malicious values', () => {
  const secret = 'PRIVATE_SENTINEL\nsecret';
  const env = {
    DATABASE_URL: 'postgresql://user:password@localhost/synthetic', DIRECT_URL: 'postgresql://user:password@localhost/synthetic',
    NEXT_PUBLIC_SUPABASE_URL: 'https://synthetic.supabase.co', SUPABASE_URL: 'https://synthetic.supabase.co/rest/v1/',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'opaque-public', SUPABASE_SERVICE_ROLE_KEY: 'opaque-private',
    NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID: 'company-synthetic', OPENAI_API_KEY: 'opaque-unverified', UNKNOWN: secret,
  };
  assert.equal(assessEnvironment(env).ok, true);
  assert.equal(assessEnvironment({ ...env, DIRECT_URL: undefined }).ok, false);
  assert.equal(variableStatus('DATABASE_URL', 'https://synthetic.invalid/db'), 'invalid-format');
  assert.equal(variableStatus('OPENAI_API_KEY', 'your-api-key'), 'placeholder');
  assert.equal(variableStatus('OPENAI_API_KEY', secret), 'invalid-format');
  const output = JSON.stringify(assessEnvironment({ ...env, SUPABASE_SERVICE_ROLE_KEY: secret }));
  assert.ok(!output.includes('PRIVATE_SENTINEL') && !output.includes('opaque-private') && !output.includes('UNKNOWN'));
  let log;
  const result = loadDevelopmentEnvironment('synthetic', (_dir, dev, logger) => {
    assert.equal(dev, true); log = logger;
    logger.error(secret); logger.info(secret); throw new Error(secret);
  });
  assert.deepEqual(result, { env: {}, failed: true });
  assert.ok(log);
});

test('installed Next loader uses development precedence and shell wins, synthetic files only', () => {
  const directory = temp();
  try {
    for (const [file, value] of [['.env', 'base'], ['.env.development', 'development'], ['.env.local', 'local'], ['.env.development.local', 'development-local']]) {
      writeFileSync(path.join(directory, file), `QA_ORDER=${value}\nQA_SHELL=file\n`);
    }
    const loader = require.resolve('@next/env');
    const run = () => spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { createRequire } from 'node:module';
      const { loadEnvConfig } = createRequire(import.meta.url)(${JSON.stringify(loader)});
      const result = loadEnvConfig(${JSON.stringify(directory)}, true, {info(){},error(){process.exitCode=1}});
      console.log(JSON.stringify([result.combinedEnv.QA_ORDER, result.combinedEnv.QA_SHELL]));
    `], { cwd: directory, env: { NODE_ENV: 'development', QA_SHELL: 'shell' }, encoding: 'utf8' });
    for (const expected of ['development-local', 'local', 'development', 'base']) {
      const result = run();
      assert.equal(result.status, 0); assert.deepEqual(JSON.parse(result.stdout), [expected, 'shell']);
      if (expected !== 'base') rmSync(path.join(directory, { 'development-local': '.env.development.local', local: '.env.local', development: '.env.development' }[expected]));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('loopback URLs require explicit HTTP origin with no userinfo, query or remote host', () => {
  for (const value of ['http://localhost:3000', 'http://127.0.0.1:3000/', 'http://[::1]:3000']) assert.ok(loopbackUrl(value));
  for (const value of [undefined, 'https://localhost', 'http://remote.invalid', 'http://localhost.evil.invalid',
    'http://private@localhost', 'http://localhost/?token=PRIVATE', 'http://localhost/#PRIVATE', 'http://localhost/login', 'http://localhost\\@remote.invalid']) assert.equal(loopbackUrl(value), null);
});

test('imports stay inert and CLI rejects malicious arguments/mode without secret output', () => {
  const directory = temp();
  try {
    // A fresh child receives only synthetic env, and an empty non-project cwd.
    const readiness = new URL('./dev-readiness.mjs', import.meta.url).href;
    const session = new URL('./dev-session.mjs', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      const readiness = await import(${JSON.stringify(readiness)});
      const session = await import(${JSON.stringify(session)});
      console.log('inert');
      await readiness.main(['PRIVATE_SENTINEL']);
      await readiness.main([]);
      await session.main(['PRIVATE_SENTINEL']);
    `], { cwd: directory, env: { NODE_ENV: 'PRIVATE_SENTINEL', SUPABASE_SERVICE_ROLE_KEY: 'PRIVATE_SENTINEL', DEBUG: '' }, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, 'inert\nFAIL readiness arguments\nFAIL NODE_ENV invalid-format (development required)\nBLOCKED use capture or preflight\n');
    assert.ok(!result.stdout.includes('PRIVATE_SENTINEL'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('session paths exclude root/other worktrees, repositories, symlinks and overwrite', t => {
  const directory = temp();
  try {
    const roots = [path.join(directory, 'root'), path.join(directory, 'antigravity')];
    for (const root of roots) mkdirSync(root);
    for (const root of roots) assert.throws(() => validateStatePath(path.join(root, 'state.json'), 'capture', roots));
    assert.throws(() => validateStatePath('relative.json', 'capture', roots));
    const repo = path.join(directory, 'unrelated'); mkdirSync(repo); mkdirSync(path.join(repo, '.git'));
    assert.throws(() => validateStatePath(path.join(repo, 'state.json'), 'capture', roots));
    const state = path.join(directory, 'state.json');
    assert.equal(validateStatePath(state, 'capture', roots), state);
    writeFileSync(state, '{"cookies":[],"origins":[]}');
    assert.throws(() => validateStatePath(state, 'capture', roots));
    assert.equal(validateStatePath(state, 'preflight', roots), state);
    assert.throws(() => sessionOptions({ CORE_FLOW_BASE_URL: 'http://localhost', CORE_FLOW_STORAGE_STATE: state }, 'preflight', roots));
    const alias = path.join(directory, 'alias');
    try { symlinkSync(roots[0], alias, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch { t.diagnostic('Symlink creation unavailable: symlink assertion NOT RUN'); return; }
    assert.throws(() => validateStatePath(path.join(alias, 'state.json'), 'capture', roots));
    const linked = path.join(directory, 'linked.json');
    try { symlinkSync(state, linked, 'file'); }
    catch { t.diagnostic('File symlink unavailable: file symlink assertion NOT RUN'); return; }
    assert.throws(() => validateStatePath(linked, 'preflight', roots));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('browser observer requires bearer/200/JSON/expected company; exposes fixed verdict only', async () => {
  const previous = { window: globalThis.window, location: globalThis.location };
  const base = 'http://localhost:3000';
  const body = { data: { user: { id: 'synthetic-user' }, access: { role: 'admin' }, activeCompany: { id: 'synthetic-company' } } };
  try {
    globalThis.location = { href: `${base}/login` };
    for (const [status, payload, bearer, expected] of [
      [200, body, true, 'valid'], [200, body, false, 'waiting'],
      [401, { error: { code: 'invalid_auth_token', message: 'PRIVATE_SENTINEL' } }, true, 'expired'],
      [401, 'non-json PRIVATE_SENTINEL', true, 'expired'],
      [200, { ...body, data: { ...body.data, activeCompany: { id: 'wrong-company' } } }, true, 'blocked'],
      [403, { error: { message: 'PRIVATE_SENTINEL' } }, true, 'blocked'],
      [200, 'non-json PRIVATE_SENTINEL', true, 'blocked'],
    ]) {
      globalThis.window = { fetch: async () => new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), { status }) };
      observeMembership({ base, company: 'synthetic-company' });
      await window.fetch(`${base}/api/companies/synthetic-company/me`, { headers: bearer ? { Authorization: 'Bearer PRIVATE_SENTINEL' } : {} });
      assert.equal(window.__ossumQaMembership, expected);
      assert.ok(!JSON.stringify(window).includes('PRIVATE_SENTINEL'));
    }
    globalThis.window = { fetch: async () => { throw new Error('PRIVATE_SENTINEL'); } };
    observeMembership({ base, company: 'synthetic-company' });
    // Application fetch errors remain application errors; the CLI never logs them.
    await assert.rejects(window.fetch(`${base}/api/companies/synthetic-company/me`));
    assert.equal(window.__ossumQaMembership, 'waiting');
  } finally {
    if (previous.window === undefined) delete globalThis.window; else globalThis.window = previous.window;
    if (previous.location === undefined) delete globalThis.location; else globalThis.location = previous.location;
  }
});

test('missing/expired saved auth is distinct from a live session with no API proof', () => {
  const previous = globalThis.localStorage;
  try {
    for (const [value, expected] of [
      [null, 'expired'], ['{"access_token":"PRIVATE_SENTINEL","expires_at":1}', 'expired'],
      [JSON.stringify({ access_token: 'PRIVATE_SENTINEL', expires_at: Date.now() / 1000 + 3600 }), 'waiting'],
      ['PRIVATE_SENTINEL invalid JSON', 'blocked'],
    ]) {
      globalThis.localStorage = { length: value === null ? 0 : 1, key: () => 'sb-synthetic-auth-token', getItem: () => value };
      assert.equal(storedSessionVerdict(), expected);
    }
  } finally {
    if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous;
  }
});
