import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { loopbackUrl, projectDir, loadDevelopmentEnvironment } from './dev-readiness.mjs';
import { observeMembership, registeredRoots, validateStatePath, storedSessionVerdict, EXPIRED } from './dev-session.mjs';

const company = 'codevdistricorr1000000000';
const prefix = `/api/companies/${company}`;
const attemptPath = 'C:/Users/franc/AppData/Local/Temp/opencode/mail-single-attempt-20261006.json';
const notice = 'DEV QA test only. Synthetic image; NOT a clinical authorization.';
// Pin this task's authorized destination without coupling application transport to it.
const approvedRecipientHash = '72d396d6c2930dd3d494eb599c816537052bc847153cc91abd6cda65a6440cdc';
const recipientApproved = value => typeof value === 'string'
  && createHash('sha256').update(value).digest('hex') === approvedRecipientHash;
const fixtureIds = {
  patientId: 'ctdevpatient1000000000000', doctorId: 'ctdevdoctor10000000000000',
  institutionId: 'ctdevinstitution100000000', payerContactId: 'ctdevpayer100000000000000',
};
const requireCondition = (value) => { if (!value) throw new Error('gate'); };
export function expectedMail(body, expected) {
  return body?.surgeryId === expected.id && body.templateType === 'authorization'
    && Array.isArray(body.to) && body.to.length === 1 && body.to[0] === expected.to
    && (!body.cc || Array.isArray(body.cc) && body.cc.length === 0)
    && (!body.bcc || Array.isArray(body.bcc) && body.bcc.length === 0)
    && body.subject === expected.subject && body.authorizationData?.notes === notice
    && Array.isArray(body.attachments) && body.attachments.length === 1
    && body.attachments[0].content === expected.image && body.attachments[0].contentType === 'image/png'
    && body.attachments[0].contentId === 'authorization-1';
}
function selfTest() {
  const expected = { id: 'synthetic', to: 'test@example.com', subject: 'QA', image: 'synthetic-bytes' };
  const body = { surgeryId: expected.id, templateType: 'authorization', to: [expected.to], subject: expected.subject,
    authorizationData: { notes: notice }, attachments: [{ content: expected.image, contentType: 'image/png', contentId: 'authorization-1' }] };
  assert(expectedMail(body, expected));
  assert(!recipientApproved('other@example.com'));
  for (const change of [{ surgeryId: 'other' }, { to: ['other@example.com'] }, { cc: ['extra@example.com'] },
    { bcc: ['extra@example.com'] }, { attachments: [] }, { authorizationData: { notes: 'clinical claim' } }]) {
    assert(!expectedMail({ ...body, ...change }, expected));
  }
  console.log('PASS offline single-send payload guards');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') return selfTest();
  const send = args.length === 1 && args[0] === '--send-once';
  const diagnoseFicha = args.length === 1 && args[0] === '--diagnose-ficha';
  requireCondition(args.length === 1 && (send || diagnoseFicha || args[0] === '--check-only'));
  let browser, timer, phase = 'prerequisites', sends = 0, violation = false, allowSend = false, expected;
  let messageId = '', auditRecorded = false, auditVerified = false, nativeCompleted = false, delivered = false, lastEvent = 'not-observed', uiFailure = 'none', uiSource = 'unavailable';
  const close = () => browser?.close().catch(() => {});
  const interrupt = () => { void close(); };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  try {
    const base = loopbackUrl(process.env.CORE_FLOW_BASE_URL)?.origin;
    const to = process.env.CORE_FLOW_MAIL_TO?.trim().toLowerCase();
    requireCondition(base === 'http://127.0.0.1:5000' && process.env.CORE_FLOW_COMPANY_ID === company
      && process.env.CORE_FLOW_APPROVED_MAIL === `${company}:one-real-email`
      && recipientApproved(to) && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to));
    const roots = registeredRoots(projectDir);
    const state = validateStatePath(process.env.CORE_FLOW_STORAGE_STATE, 'preflight', roots);
    const directory = path.resolve(process.env.CORE_FLOW_ARTIFACT_DIR || '');
    validateStatePath(path.join(directory, `mail-path-check-${randomUUID()}`), 'capture', roots);
    validateStatePath(attemptPath, existsSync(attemptPath) ? 'preflight' : 'capture', roots);
    requireCondition(!send || !existsSync(attemptPath));
    process.env.DEBUG = ''; process.env.PWDEBUG = '0';
    const require = createRequire(import.meta.url);
    const { chromium } = require('@playwright/test');
    browser = await chromium.launch({ headless: false, timeout: 30_000 });
    timer = setTimeout(interrupt, 6 * 60_000);
    const context = await browser.newContext({ storageState: state, baseURL: base, viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.addInitScript(observeMembership, { company, base });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      let allowed = url.origin === base && (!url.pathname.startsWith('/api/companies/') || url.pathname.startsWith(`${prefix}/`));
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        allowed = false;
        if (send && allowSend && sends === 0 && !violation && url.origin === base && !url.search
          && url.pathname === `${prefix}/mail/send` && method === 'POST') {
          try {
            allowed = expectedMail(request.postDataJSON(), expected);
            if (allowed) {
              writeFileSync(attemptPath, JSON.stringify({ phase: 'attempted', companyId: company, surgeryId: expected.id, marker: expected.subject }), { flag: 'wx', mode: 0o600 });
              sends++; allowSend = false;
            }
          } catch { allowed = false; }
        }
      }
      if (!allowed) { violation = true; await route.abort('blockedbyclient'); }
      else await route.continue();
    });
    await context.routeWebSocket('**/*', socket => {
      const url = new URL(socket.url());
      if (url.origin === base.replace('http:', 'ws:') && ['/_next/hmr', '/_next/webpack-hmr'].includes(url.pathname)) socket.connectToServer();
      else { violation = true; socket.close(); }
    });
    const page = await context.newPage(); page.setDefaultTimeout(30_000);
    page.on('pageerror', error => {
      const method = error.message.match(/([A-Za-z_$][\w$.]*) is not a function/)?.[1];
      const missing = error.message.match(/Cannot read properties of (?:undefined|null) \(reading '([A-Za-z_$][\w$]*)'\)/)?.[1];
      uiFailure = /Maximum update depth/i.test(error.message) ? 'react-update-depth' : method ? `method-not-function:${method}` : missing ? `missing-property:${missing}` : 'client-exception';
      // Retain code paths only: never raw errors, URLs, headers or user data.
      uiSource = error.stack?.match(/src\/[A-Za-z0-9_./-]+\.(?:tsx?|jsx?)/)?.[0] || 'unavailable';
    });
    phase = 'membership';
    const membershipPromise = page.waitForResponse(r => r.url() === `${base}${prefix}/me` && r.request().method() === 'GET', { timeout: 60_000 });
    await page.goto('/cirugias', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    let membership;
    try { membership = await membershipPromise; }
    catch (error) {
      const verdict = await page.evaluate(storedSessionVerdict).catch(() => 'blocked');
      if (verdict === 'expired') throw new Error(EXPIRED);
      throw error;
    }
    if (membership.status() === 401) throw new Error(EXPIRED);
    const me = (await membership.json()).data;
    const bearer = await membership.request().headerValue('authorization');
    requireCondition(membership.status() === 200 && me?.activeCompany?.id === company && me.user?.id
      && /^Bearer \S+$/.test(bearer || '') && ['admin', 'manager', 'coordinator', 'operator', 'owner', 'super_admin'].includes(me.access?.role));
    const get = async pathname => {
      requireCondition(pathname.startsWith(`${prefix}/`));
      const response = await context.request.get(`${base}${pathname}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 30_000 });
      if (response.status() === 401) throw new Error(EXPIRED);
      requireCondition(response.status() === 200); return (await response.json()).data;
    };
    phase = 'synthetic-fixture';
    const records = await get(`${prefix}/surgeries?patientId=${fixtureIds.patientId}&take=100`);
    const candidates = Array.isArray(records) ? records.filter(row => row.visibleNumber === 'CX-0010' && row.companyId === company) : [];
    requireCondition(candidates.length === 1);
    const fixture = await get(`${prefix}/surgeries/${encodeURIComponent(candidates[0].id)}`);
    requireCondition(fixture.companyId === company && fixture.visibleNumber === 'CX-0010'
      && /^QA-INTAKE-[0-9a-f-]{36}$/.test(fixture.notes || '')
      && Object.entries(fixtureIds).every(([key, value]) => fixture[key] === value)
      && (!fixture.coordinatorAssignments || fixture.coordinatorAssignments.length === 0));
    phase = 'native-row';
    const row = page.getByRole('row').filter({ has: page.getByText('CX-0010', { exact: true }) });
    console.log(`Read-only target UI: exact-code-elements=${await page.getByText('CX-0010', { exact: true }).count()}, matching-rows=${await row.count()}`);
    await row.waitFor({ state: 'visible' }); requireCondition(await row.count() === 1);
    phase = 'native-expediente-command';
    await row.locator('button[aria-haspopup="menu"]').last().click();
    await page.getByRole('menuitem', { name: 'Ver expediente', exact: true }).click();
    if (diagnoseFicha) {
      try { await page.getByTitle('Más acciones de la cirugía', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 }); } catch { /* Report bounded structural evidence below. */ }
      console.log(`Ficha structural evidence: header-menu=${await page.getByTitle('Más acciones de la cirugía', { exact: true }).count()}, edit-ficha=${await page.getByRole('button', { name: 'Editar ficha', exact: true }).count()}, ficha-tab=${await page.getByRole('tab', { name: 'Ficha', exact: true }).count()}, target-row=${await row.count()}, uiFailure=${uiFailure}, uiSource=${uiSource}, writes=${sends}, tripwire=${violation}`);
      requireCondition(await page.getByTitle('Más acciones de la cirugía', { exact: true }).isVisible());
      console.log('PASS native Ver expediente opens the actual Ficha Header; no mail modal or send tested');
      return;
    }
    phase = 'native-header-menu';
    await page.getByTitle('Más acciones de la cirugía', { exact: true }).click();
    phase = 'native-email-action';
    await page.getByRole('menuitem', { name: 'Enviar correo con autorizado', exact: true }).click();
    phase = 'native-modal';
    const modal = page.getByRole('dialog', { name: 'Compartir evidencia de autorización', exact: true });
    await modal.waitFor({ state: 'visible' });
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1200;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 1200);
      ctx.fillStyle = '#172554'; ctx.font = 'bold 38px Arial'; ctx.fillText('DEV TEST - NOT A CLINICAL AUTHORIZATION', 40, 100);
      ctx.font = '30px Arial'; ctx.fillText('Synthetic image for one controlled email test.', 40, 180); ctx.fillText('END OF SYNTHETIC DOCUMENT', 40, 1120);
      return canvas.toDataURL('image/png');
    });
    expected = { id: fixture.id, to, subject: `QA-MAIL-${randomUUID()}`, image: dataUrl.split(',')[1] };
    const recipient = modal.getByPlaceholder('Escribí un correo y presioná Enter...', { exact: true });
    await recipient.fill(to); await recipient.press('Enter');
    await modal.getByPlaceholder('Asunto formal del caso...', { exact: true }).fill(expected.subject);
    await modal.getByPlaceholder('Escribí aquí observaciones sobre la autorización, materiales o coordinación...', { exact: true }).fill(notice);
    phase = 'native-upload-ready';
    const upload = modal.locator('input[type="file"]');
    console.log(`Upload readiness: disabled=${await upload.isDisabled()}, loading=${await modal.getByText('Cargando evidencia...', { exact: true }).count()}, alerts=${await modal.getByRole('alert').count()}`);
    await page.waitForFunction(() => {
      const input = document.querySelector('[role="dialog"] input[type="file"]');
      return input instanceof HTMLInputElement && !input.disabled;
    }, undefined, { timeout: 30_000 });
    requireCondition(await modal.getByRole('alert').count() === 0);
    await upload.setInputFiles({ name: 'dev-synthetic-authorization.png', mimeType: 'image/png', buffer: Buffer.from(expected.image, 'base64') });
    phase = 'preview';
    const image = modal.getByRole('img', { name: 'dev-synthetic-authorization.png', exact: true });
    try { await image.waitFor({ state: 'visible' }); }
    catch (error) {
      console.log(`Preview structural evidence: images=${await modal.getByRole('img').count()}, file-labels=${await modal.getByText('dev-synthetic-authorization.png', { exact: true }).count()}, preview-open=${await modal.getByRole('button', { name: 'Ocultar Vista Previa', exact: true }).count()}, upload-disabled=${await upload.isDisabled()}, alerts=${await modal.getByRole('alert').count()}, tripwire=${violation}`);
      throw error;
    }
    requireCondition(await image.getAttribute('src') === dataUrl);
    requireCondition(await image.evaluate(img => img.complete && img.naturalWidth === 1000 && img.naturalHeight === 1200));
    requireCondition((await modal.textContent()).includes(me.user.email) && (await modal.textContent()).includes(me.activeCompany.name));
    requireCondition(!violation);
    console.log('PASS authenticated exact-company synthetic fixture and actual image/signature preview');
    if (!send) return;
    phase = 'single-dispatch'; allowSend = true;
    const responsePromise = page.waitForResponse(r => r.url() === `${base}${prefix}/mail/send` && r.request().method() === 'POST', { timeout: 60_000 });
    await modal.getByRole('button', { name: /Enviar Correo/ }).click();
    const response = await responsePromise;
    const result = (await response.json()).data;
    requireCondition(response.status() === 200 && result?.success && result.devMode === false
      && /^[0-9a-f-]{36}$/i.test(result.id || '') && sends === 1 && !violation);
    messageId = result.id; auditRecorded = result.auditRecorded === true;
    writeFileSync(attemptPath, JSON.stringify({ phase: 'accepted', companyId: company, surgeryId: fixture.id, marker: expected.subject, messageId, auditRecorded }), { mode: 0o600 });
    try { await modal.waitFor({ state: 'hidden', timeout: 10_000 }); nativeCompleted = true; } catch { /* Acceptance is retained even if the UI callback fails. */ }
    phase = 'audit-readback';
    try {
      const feed = await get(`${prefix}/surgeries/${fixture.id}/seguimiento?take=100`);
      const matching = feed.entries?.filter(entry => entry.surgeryId === fixture.id && entry.companyId === company
        && entry.authorId === me.user.id && entry.content?.includes(messageId) && entry.content?.includes(expected.subject));
      auditVerified = matching?.length === 1;
    } catch { /* Provider delivery readback remains independent of the tracking result. */ }
    phase = 'provider-readback';
    const loaded = loadDevelopmentEnvironment(projectDir, require('@next/env').loadEnvConfig);
    requireCondition(!loaded.failed && loaded.env.RESEND_API_KEY);
    const mailbox = value => typeof value === 'string' ? (value.match(/<([^<>]+)>/)?.[1] || value).trim().toLowerCase() : '';
    const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const signatureName = [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || me.user.email;
    for (let index = 0; index < 6; index++) {
      const provider = await fetch(`https://api.resend.com/emails/${messageId}`, { headers: { Authorization: `Bearer ${loaded.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(15_000) });
      requireCondition(provider.status === 200);
      const email = await provider.json();
      requireCondition(email.id === messageId && Array.isArray(email.to) && email.to.length === 1 && email.to[0].toLowerCase() === to
        && mailbox(email.from) === mailbox(loaded.env.RESEND_FROM_EMAIL)
        && Array.isArray(email.reply_to) && email.reply_to.map(mailbox).includes(me.user.email.toLowerCase())
        && email.html?.includes('cid:authorization-1') && email.html?.includes(escape(signatureName))
        && email.html?.includes(escape(me.activeCompany.name)) && email.html?.includes(me.user.email));
      lastEvent = ['sent', 'delivered', 'delivery_delayed', 'bounced', 'failed', 'suppressed', 'opened', 'clicked', 'complained'].includes(email.last_event) ? email.last_event : 'unknown';
      if (email.last_event === 'delivered') { delivered = true; break; }
      if (['bounced', 'failed', 'suppressed'].includes(email.last_event)) break;
      if (index < 5) await new Promise(resolve => setTimeout(resolve, 3000));
    }
    writeFileSync(attemptPath, JSON.stringify({ phase: delivered ? 'delivered' : 'accepted-readback', companyId: company, surgeryId: fixture.id, marker: expected.subject, messageId, auditRecorded, auditVerified, nativeCompleted, lastEvent }), { mode: 0o600 });
    console.log(`${delivered && auditVerified && nativeCompleted ? 'PASS' : 'PARTIAL'} real provider acceptance; delivered=${delivered}; auditRecorded=${auditRecorded}; auditVerified=${auditVerified}; nativeCompleted=${nativeCompleted}; lastEvent=${lastEvent}; messageId=${messageId}`);
    if (!delivered || !auditVerified || !nativeCompleted) process.exitCode = 1;
  } catch (error) {
    console.log(error?.message === EXPIRED ? EXPIRED : `${messageId || sends ? 'PARTIAL' : 'BLOCKED'} controlled mail at ${phase}; errorClass=${String(error?.name || 'Error').replace(/[^a-zA-Z]/g, '')}; uiFailure=${uiFailure}; uiSource=${uiSource}; no automatic retry`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer); await close(); process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  }
}
main().catch(() => { console.log('BLOCKED mail invocation; details withheld'); process.exitCode = 1; });
