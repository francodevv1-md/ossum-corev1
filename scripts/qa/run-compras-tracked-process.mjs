import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuration as stockConfiguration, company, project } from './run-compras-stock-process.mjs';
import { loopbackUrl } from './dev-readiness.mjs';
import { EXPIRED } from './dev-session.mjs';
import { registeredRoots, validateStatePath } from './dev-session.mjs';
import { readFileSync, lstatSync } from 'node:fs';

export { company, project };
export const task = 'OC-TRACKED-RECEIPT-DEV-001';
export const namespace = 'QA-OC-TRACKED-';
// Coordinator execution only. Reuse ALL existing COMPRAS_STOCK gates and its
// external, independently verified synthetic NONE fixture for supplier/actor.
// The NONE article is read-only here; this command creates five NEW tracked SKUs.
// Additional exact gates (no credentials in these attestations):
// COMPRAS_TRACKED_APPROVED_SYNTHETIC_MUTATION=
//   codevdistricorr1000000000:OC-TRACKED-RECEIPT-DEV-001:fresh:5-articles:4-orders:tracked-replay-conflict-serial-race
// COMPRAS_TRACKED_REVIEW_APPROVED=
//   OC-TRACKED-RECEIPT-DEV-001:independent-source-review:tracked:receipt-stock-identity-warning-audit:no-outbound
// CORE_FLOW_STORAGE_STATE remains the existing external MANUAL login variable.
// No .env loading, credential login, fixture resume, cleanup, backfill or DB client.
// Frozen notice API exposes only the actor's recipient rows, but the emitter
// excludes that actor. A separate saved test reports BLOCKED (never silently
// skips/passes). --fresh can validate available checks, not full notice acceptance.
export function configuration(env = process.env) {
  const url = loopbackUrl(env.CORE_FLOW_BASE_URL);
  if (!url || url.port !== '5000'
    || env.COMPRAS_TRACKED_APPROVED_SYNTHETIC_MUTATION !== `${company}:${task}:fresh:5-articles:4-orders:tracked-replay-conflict-serial-race`
    || env.COMPRAS_TRACKED_REVIEW_APPROVED !== `${task}:independent-source-review:tracked:receipt-stock-identity-warning-audit:no-outbound`
    || env.COMPRAS_TRACKED_FRESH !== task) throw new Error('BLOCKED: tracked exact-target/review/fresh gates');
  const setup = stockConfiguration(env);
  if (!env.COMPRAS_TRACKED_RESUME_PATH) return setup;
  const resumePath = validateStatePath(env.COMPRAS_TRACKED_RESUME_PATH, 'preflight', registeredRoots(project));
  if (lstatSync(resumePath).size > 32768) throw new Error('BLOCKED: resume manifest size');
  const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
  const cuid = /^c[a-z0-9]{24}$/;
  if (resume.task !== task || resume.companyId !== company || resume.result !== 'FAIL'
    || resume.phase !== 'native-tracked-dialog' || !/^QA-OC-TRACKED-[a-f0-9-]{36}$/.test(resume.marker)
    || resume.location !== `${resume.marker}-DEST` || resume.writes?.nativeReceipt
    || resume.articles?.length !== 5 || resume.orders?.length !== 4
    || !['receiptIds', 'movementIds', 'unitIds'].every(key => Array.isArray(resume[key]) && resume[key].length === 0)
    || !resume.articles.every((a, i) => cuid.test(a.id) && a.code === `${resume.marker}-A${i}`
      && a.policy === ['LOT_EXPIRY', 'LOT_SERIAL_EXPIRY', 'SERIAL', 'SERIAL', 'SERIAL'][i])
    || !resume.orders.every(o => cuid.test(o.id) && Array.isArray(o.itemIds) && o.itemIds.every(id => cuid.test(id)))
    || new Set(resume.articles.map(a => a.id)).size !== 5 || new Set(resume.orders.map(o => o.id)).size !== 4) {
    throw new Error('BLOCKED: resume manifest identity/zero-ingress proof');
  }
  return { ...setup, resume };
}

export function main(args = process.argv.slice(2)) {
  try {
    if (args.length !== 1 || !['--list', '--fresh', '--resume'].includes(args[0])) throw new Error();
    const discovery = args[0] === '--list';
    if (!discovery && Boolean(process.env.COMPRAS_TRACKED_RESUME_PATH) !== (args[0] === '--resume')) throw new Error();
    const env = { ...process.env, DEBUG: '', PWDEBUG: '0', COMPRAS_TRACKED_FRESH: discovery ? '' : task };
    if (!discovery) configuration(env); // Existing offline session/path/fixture gates first.
    const require = createRequire(import.meta.url);
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test',
      '--config=playwright.compras-tracked.config.ts', ...(discovery ? ['--list'] : [])], {
      cwd: project, env, stdio: 'pipe', timeout: 19 * 60_000,
    });
    const output = `${child.stdout || ''}${child.stderr || ''}`;
    console.log(output.includes(EXPIRED) ? `BLOCKED: ${EXPIRED}` : discovery
      ? (child.status === 0 ? 'DISCOVERED: saved tracked journey; browser/DB NOT RUN' : 'FAIL: tracked discovery')
      : (child.status === 0 ? 'PASS: fresh tracked journey; private manifest/checks retained'
        : 'BLOCKED/FAIL: recipient WARNING readback unavailable or journey failed; inspect private manifest/checks; no retry/resume/cleanup'));
    return child.status === 0 ? 0 : 1;
  } catch (error) {
    console.log(error?.message === EXPIRED ? `BLOCKED: ${EXPIRED}` : 'BLOCKED: tracked configuration or installed runner; details withheld');
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
