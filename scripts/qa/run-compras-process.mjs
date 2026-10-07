import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registeredRoots, validateStatePath, EXPIRED } from './dev-session.mjs';

export const company = 'codevdistricorr1000000000';
export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const discoveryDirectory = 'C:/Users/franc/AppData/Local/Temp/opencode';

// Coordinator supplies these after independent checks; never derive approval,
// isolation or source attestation from a URL, .env, imported identities or NODE_ENV.
// CORE_FLOW_BASE_URL = http://127.0.0.1:5000 (localhost/[::1] also accepted)
// CORE_FLOW_COMPANY_ID = codevdistricorr1000000000
// CORE_FLOW_STORAGE_STATE = existing absolute external manual-login session
// CORE_FLOW_ARTIFACT_DIR = existing absolute directory outside every Git root
// COMPRAS_APPROVED_SYNTHETIC_MUTATION = <company>:one-oc-partial-full-receipt
// COMPRAS_DEV_ISOLATION_ATTESTED = <company>:existing-approved-disposable-dev:5000
// COMPRAS_SERVER_EFFECTS_ATTESTED = <company>:independent-source-review:no-outbound:oc-items-state-audit-only
// COMPRAS_SUPPLIER_FIXTURE = JSON {id,code,name,email}; synthetic exact identity
// COMPRAS_SUPPLIER_PROOF = JSON {companyId,id,code,name,email,synthetic:true,independentlyVerified:true}
// COMPRAS_ARTICLE_FIXTURE = JSON {id,code,name}; exact independently verified QA catalog entry.
// No runtime resume: retained creation receipts are inspection evidence, not PASS.
export function configuration(env = process.env) {
  try {
    const url = new URL(env.CORE_FLOW_BASE_URL || '');
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.port !== '5000' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || env.CORE_FLOW_COMPANY_ID !== company
      || env.COMPRAS_APPROVED_SYNTHETIC_MUTATION !== `${company}:one-oc-partial-full-receipt`
      || env.COMPRAS_DEV_ISOLATION_ATTESTED !== `${company}:existing-approved-disposable-dev:5000`
      || env.COMPRAS_SERVER_EFFECTS_ATTESTED !== `${company}:independent-source-review:no-outbound:oc-items-state-audit-only`) throw new Error();
    const supplier = JSON.parse(env.COMPRAS_SUPPLIER_FIXTURE || '');
    const proof = JSON.parse(env.COMPRAS_SUPPLIER_PROOF || '');
    if (!supplier || !/^c[a-z0-9]{24}$/.test(supplier.id)
      || !['code', 'name', 'email'].every(key => typeof supplier[key] === 'string' && supplier[key].trim())
      || proof.companyId !== company || proof.synthetic !== true || proof.independentlyVerified !== true
      || !['id', 'code', 'name', 'email'].every(key => proof[key] === supplier[key])) throw new Error();
    const article = JSON.parse(env.COMPRAS_ARTICLE_FIXTURE || '');
    if (!article || !/^c[a-z0-9]{24}$/.test(article.id) || article.code !== 'QA-OC-ARTICLE-20261003'
      || article.name !== '000 QA OC Receipt Article 20261003' || supplier.name !== 'QA COMPRAS-OC-RECEIPT-20261003'
      || supplier.email !== 'qa.oc.receipt@ossum.local') throw new Error();
    const roots = registeredRoots(project);
    const state = validateStatePath(env.CORE_FLOW_STORAGE_STATE, 'preflight', roots);
    const saved = JSON.parse(readFileSync(state, 'utf8'));
    const stored = saved.origins?.find(origin => origin.origin === url.origin)?.localStorage?.find(entry => /^sb-.+-auth-token$/.test(entry.name));
    const session = stored ? JSON.parse(stored.value) : null;
    if (!session?.access_token || (typeof session.expires_at === 'number' && session.expires_at * 1000 <= Date.now())) throw new Error(EXPIRED);
    const artifacts = env.CORE_FLOW_ARTIFACT_DIR;
    if (!artifacts || !path.isAbsolute(artifacts) || !lstatSync(artifacts).isDirectory() || lstatSync(artifacts).isSymbolicLink()) throw new Error();
    validateStatePath(path.join(artifacts, `compras-check-${randomUUID()}`), 'capture', roots);
    return { baseURL: url.origin, state, artifacts, supplier, article };
  } catch (error) {
    if (error?.message === EXPIRED) throw new Error(EXPIRED);
    throw new Error('BLOCKED: exact DEV5000 target, independent source/isolation/supplier proof and external session/artifacts required');
  }
}

export function main(args = process.argv.slice(2)) {
  try {
    if (args.length && !(args.length === 1 && args[0] === '--list')) throw new Error();
    const discovery = args[0] === '--list';
    if (!discovery) configuration(); // Local configuration only; no arbitrary contact scan.
    const require = createRequire(import.meta.url);
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config=playwright.compras.config.ts', ...args], {
      cwd: project, env: { ...process.env, DEBUG: '', PWDEBUG: '0' }, stdio: 'pipe', timeout: 8 * 60_000,
    });
    // Raw runner errors can include bearer headers, fixture values or UI content.
    const output = `${child.stdout || ''}${child.stderr || ''}`;
    if (output.includes(EXPIRED)) console.log(EXPIRED);
    else console.log(discovery
      ? (child.status === 0 ? 'DISCOVERED: one saved compras journey; browser NOT RUN' : 'FAIL: compras discovery')
      : (child.status === 0 ? 'PASS: bounded OC receipt journey; private report retained' : 'BLOCKED/FAIL: inspect private report; owned OC retained; no retries or cleanup'));
    return child.status === 0 ? 0 : 1;
  } catch (error) { console.log(error?.message === EXPIRED ? EXPIRED : 'BLOCKED: compras configuration or installed runner; details withheld'); return 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
