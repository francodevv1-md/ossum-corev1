import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registeredRoots, validateStatePath, EXPIRED } from './dev-session.mjs';

export const company = 'codevdistricorr1000000000';
export const task = 'OC-RECEIPT-STOCK-TRACE-DEV-20261003';
export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const namespace = 'QA-OC-STOCK-TRACE-20261003-';

// Coordinator-only prerequisites, never inferred from NODE_ENV or the URL:
// CORE_FLOW_BASE_URL=http://127.0.0.1:5000 (localhost/[::1] also accepted)
// CORE_FLOW_STORAGE_STATE=<existing absolute external manual-login state>
// CORE_FLOW_ARTIFACT_DIR=<existing absolute external private directory>
// COMPRAS_STOCK_FIXTURE_PATH=<existing absolute external private fixture.json>
// COMPRAS_STOCK_APPROVED_SYNTHETIC_MUTATION=<company>:<task>:native-new-oc:1+3:replay-conflict-overflow
// COMPRAS_STOCK_REVIEW_APPROVED=<task>:independent-source-review:NONE:receipt-stock-audit:no-outbound
// COMPRAS_STOCK_DEV_ISOLATION_ATTESTED=<company>:existing-approved-disposable-dev:5000
// fixture.json shape (no session/auth values):
// {companyId,supplier:{id,code,name,email},article:{id,code,name},location,actorId,
//  initialPhysical:0,initialMovements:0,policy:"NONE",
//  proof:{sourceVerified:true,independentlyVerified:true,newUniqueSku:true,synthetic:true}}
// Article code/name and location use namespace + a run suffix (4–64 characters).
// Supplier uses that namespace too, or the preceding independently verified QA
// provider (exact name/email below, independently verified catalog code).
// No provider is created here.
// Fixture IDs are source CUIDs, not UUIDs. No fixture creation, resume or cleanup.
export function configuration(env = process.env) {
  try {
    const url = new URL(env.CORE_FLOW_BASE_URL || '');
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.port !== '5000' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || env.COMPRAS_STOCK_APPROVED_SYNTHETIC_MUTATION !== `${company}:${task}:native-new-oc:1+3:replay-conflict-overflow`
      || env.COMPRAS_STOCK_REVIEW_APPROVED !== `${task}:independent-source-review:NONE:receipt-stock-audit:no-outbound`
      || env.COMPRAS_STOCK_DEV_ISOLATION_ATTESTED !== `${company}:existing-approved-disposable-dev:5000`) throw new Error();
    const roots = registeredRoots(project);
    const fixturePath = validateStatePath(env.COMPRAS_STOCK_FIXTURE_PATH, 'preflight', roots);
    if (lstatSync(fixturePath).size > 16_384) throw new Error();
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const cuid = /^c[a-z0-9]{24}$/;
    const owned = new RegExp(`^${namespace}[a-zA-Z0-9][a-zA-Z0-9_-]{3,63}$`);
    const suffix = typeof fixture.article?.code === 'string' && owned.test(fixture.article.code) ? fixture.article.code.slice(namespace.length) : '';
    if (fixture.companyId !== company || fixture.policy !== 'NONE' || fixture.initialPhysical !== 0 || fixture.initialMovements !== 0
      || typeof fixture.actorId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(fixture.actorId) || !cuid.test(fixture.article?.id) || !cuid.test(fixture.supplier?.id)
      || !suffix || fixture.article.name !== `000 QA OC Stock Receipt ${suffix}` || fixture.location !== `QA OC STOCK 20261003 ${suffix}`
      || !(owned.test(fixture.supplier.code) && owned.test(fixture.supplier.name)
        || typeof fixture.supplier.code === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(fixture.supplier.code) && fixture.supplier.name === 'QA COMPRAS-OC-RECEIPT-20261003'
          && fixture.supplier.email === 'qa.oc.receipt@ossum.local')
      || !/^qa[.a-z0-9_-]*@ossum\.local$/i.test(fixture.supplier.email)
      || !['sourceVerified', 'independentlyVerified', 'newUniqueSku', 'synthetic'].every(k => fixture.proof?.[k] === true)) throw new Error();
    const state = validateStatePath(env.CORE_FLOW_STORAGE_STATE, 'preflight', roots);
    const saved = JSON.parse(readFileSync(state, 'utf8'));
    const stored = saved.origins?.find(o => o.origin === url.origin)?.localStorage?.find(e => /^sb-.+-auth-token$/.test(e.name));
    const session = stored ? JSON.parse(stored.value) : null;
    if (!session?.access_token || typeof session.expires_at !== 'number' || session.expires_at * 1000 <= Date.now()) throw new Error(EXPIRED);
    const artifacts = env.CORE_FLOW_ARTIFACT_DIR;
    if (!artifacts || !path.isAbsolute(artifacts) || !lstatSync(artifacts).isDirectory() || lstatSync(artifacts).isSymbolicLink()) throw new Error();
    validateStatePath(path.join(artifacts, `compras-stock-check-${randomUUID()}`), 'capture', roots);
    return { baseURL: url.origin, state, artifacts, ...fixture };
  } catch (error) {
    throw new Error(error?.message === EXPIRED ? EXPIRED : 'BLOCKED: stock fixture, review/approval/isolation gates or external session/artifacts');
  }
}

export function main(args = process.argv.slice(2)) {
  try {
    if (args.length && !(args.length === 1 && args[0] === '--list')) throw new Error();
    const discovery = args[0] === '--list';
    if (!discovery) configuration();
    const require = createRequire(import.meta.url);
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config=playwright.compras-stock.config.ts', ...args], {
      cwd: project, env: { ...process.env, DEBUG: '', PWDEBUG: '0' }, stdio: 'pipe', timeout: 11 * 60_000,
    });
    const output = `${child.stdout || ''}${child.stderr || ''}`;
    console.log(output.includes(EXPIRED) ? EXPIRED : discovery
      ? (child.status === 0 ? 'DISCOVERED: one saved NEW-stock journey; browser NOT RUN' : 'FAIL: stock discovery')
      : (child.status === 0 ? 'PASS: bounded NEW-stock journey; private JSON retained' : 'BLOCKED/FAIL: private JSON retained; no retry or cleanup'));
    return child.status === 0 ? 0 : 1;
  } catch (error) {
    console.log(error?.message === EXPIRED ? EXPIRED : 'BLOCKED: stock configuration or installed runner; details withheld');
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
