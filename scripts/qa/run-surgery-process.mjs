import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loopbackUrl, projectDir } from './dev-readiness.mjs';
import { observeMembership, registeredRoots, validateStatePath, EXPIRED } from './dev-session.mjs';

const company = 'codevdistricorr1000000000';
const baseline = {
  patient: { id: 'ctdevpatient1000000000000', code: 'DEV-PATIENT', email: 'juan.perez.dev@ossum.local', type: 'patient', group: 'pacientes' },
  doctor: { id: 'ctdevdoctor10000000000000', code: 'DEV-DOCTOR', email: 'dra.garcia.dev@ossum.local', type: 'doctor', group: 'medicos' },
  institution: { id: 'ctdevinstitution100000000', code: 'DEV-INSTITUTION', email: 'hospital.dev@ossum.local', type: 'institution', group: 'instituciones' },
  payer: { id: 'ctdevpayer100000000000000', code: 'DEV-PAYER', email: 'obra.social.dev@ossum.local', type: 'payer', group: 'obras_sociales' },
};

export async function main(args = process.argv.slice(2)) {
  let browser;
  let phase = 'local-configuration';
  try {
    if (args.length) throw new Error();
    const url = loopbackUrl(process.env.CORE_FLOW_BASE_URL);
    if (!url) throw new Error();
    const roots = registeredRoots(projectDir);
    const state = validateStatePath(process.env.CORE_FLOW_STORAGE_STATE, 'preflight', roots);
    const artifacts = process.env.CORE_FLOW_ARTIFACT_DIR;
    if (!artifacts || !path.isAbsolute(artifacts)) throw new Error();
    validateStatePath(path.join(artifacts, `.intake-check-${randomUUID()}`), 'capture', roots);
    const require = createRequire(import.meta.url);
    process.env.DEBUG = '';
    process.env.PWDEBUG = '0';
    const { chromium } = require('@playwright/test');
    phase = 'browser-launch';
    browser = await chromium.launch();
    const context = await browser.newContext({ storageState: state });
    await context.addInitScript(observeMembership, { base: url.origin, company });
    const page = await context.newPage();
    phase = 'session-membership';
    await page.goto(`${url.origin}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => ['valid', 'expired', 'blocked'].includes(window.__ossumQaMembership), undefined, { timeout: 30000 });
    const verdict = await page.evaluate(() => window.__ossumQaMembership);
    if (verdict === 'expired') throw new Error(EXPIRED);
    if (verdict !== 'valid') throw new Error();
    phase = 'synthetic-fixtures';
    const fixtures = await page.evaluate(async ({ company, baseline }) => {
      const key = Object.keys(localStorage).find(key => /^sb-.+-auth-token$/.test(key));
      const token = key && JSON.parse(localStorage.getItem(key))?.access_token;
      if (!token) return null;
      const fixtures = {};
      for (const [field, f] of Object.entries(baseline)) {
        const response = await fetch(`/api/companies/${company}/contacts?search=${encodeURIComponent(f.code)}&take=20`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status !== 200) return null;
        const body = await response.json();
        const matches = Array.isArray(body.data) ? body.data.filter(c => c.id === f.id && c.code === f.code) : [];
        const c = matches[0];
        if (matches.length !== 1 || c.email !== f.email || c.isActive !== true || c.linkIsActive !== true || c.contactType !== f.type || c.linkRole !== f.type
          || !Array.isArray(c.roles) || !c.roles.includes('cliente') || !Array.isArray(c.groupSlugs) || !c.groupSlugs.includes(f.group)) return null;
        const name = c.firstName && c.lastName ? `${c.firstName.trim()} ${c.lastName.trim()}` : c.legalName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
        if (typeof name !== 'string' || !name.trim()) return null;
        fixtures[field] = { id: f.id, code: f.code, email: f.email, name, roles: c.roles, linkRole: c.linkRole, groups: c.groupSlugs };
      }
      return fixtures;
    }, { company, baseline });
    if (!fixtures) throw new Error();
    await browser.close();
    browser = undefined;
    console.log('PASS exact-company session and four synthetic baseline fixtures; starting one guarded journey');
    // Scoped approval and source-chain review are recorded in the task brief and
    // FIXTURE_SCOPE.md; these attestations are not production safety guarantees.
    const env = {
      ...process.env,
      CORE_FLOW_BASE_URL: url.origin,
      CORE_FLOW_COMPANY_ID: company,
      CORE_FLOW_STORAGE_STATE: state,
      CORE_FLOW_ARTIFACT_DIR: artifacts,
      CORE_FLOW_APPROVED_SYNTHETIC_MUTATION: `${company}:one-intake-authorization`,
      CORE_FLOW_SERVER_EFFECTS_ATTESTED: `${company}:read-only-explorer:no-outbound:no-recipients`,
      CORE_FLOW_BASELINE_ATTESTED: `${company}:synthetic-baseline-only`,
      CORE_FLOW_INTAKE_FIXTURES: JSON.stringify(fixtures),
      CORE_FLOW_CLASSIFICATION_ID: 'CLA-0009',
      CORE_FLOW_CLASSIFICATION_NAME: 'Otro',
    };
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config=playwright.process.config.ts'], {
      cwd: projectDir, env, stdio: 'pipe', timeout: 7 * 60000,
    });
    const ok = child.status === 0;
    console.log(ok ? 'PASS saved intake/authorization process; private receipt in artifact directory' : 'FAIL saved process; inspect private report; no automatic retries or cleanup');
    return ok ? 0 : 1;
  } catch (error) {
    console.log(error?.message === EXPIRED ? EXPIRED : `BLOCKED process prerequisites at ${phase}; details withheld`);
    return 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    console.log('BLOCKED process runtime; details withheld'); process.exitCode = 1;
  });
}
