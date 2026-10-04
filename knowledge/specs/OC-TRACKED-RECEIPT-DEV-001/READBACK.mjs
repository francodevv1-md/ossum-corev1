import { chromium } from '@playwright/test';
import { configuration } from '../../../scripts/qa/run-compras-tracked-process.mjs';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
const setup = configuration();
const company = 'codevdistricorr1000000000';
const marker = 'QA-OC-TRACKED-5704fb06-0eb7-484f-be1f-2b046432ef6e';
const ids = ['cmutyatiq002oxohuq1edd2ke', 'cmutyazd7002sxohul1jtusp1', 'cmutyb0ub002wxohuowq7st49', 'cmutyb22x0030xohuh9bd0cfl', 'cmutyb3iu0034xohuyvsbrn3a'];
const orderIds = ['cmutyb50s0038xohuqs84k5ff', 'cmutybas8003exohur9fa9pwz', 'cmutybc57003jxohuzfe9rcaq', 'cmutybde2003oxohu3n5vynae'];
let browser, timer;
try {
  browser = await chromium.launch();
  timer = setTimeout(() => { void browser?.close(); }, 3 * 60000);
  const context = await browser.newContext({ storageState: setup.state });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url()), p = url.pathname;
    const ownedRead = p.startsWith(`/api/companies/${company}/`) || p === '/api/me/companies'
      || p === '/compras/ordenes-compra' || p.startsWith('/_next/') || p === '/favicon.ico'
      || ['/brand/', '/images/', '/fonts/'].some(prefix => p.startsWith(prefix));
    if (route.request().method() !== 'GET' || url.origin !== setup.baseURL || !ownedRead) await route.abort();
    else await route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${setup.baseURL}/compras/ordenes-compra`);
  const result = await page.evaluate(async ({ company, marker, ids, orderIds }) => {
    const key = Object.keys(localStorage).find(k => /^sb-.+-auth-token$/.test(k));
    const token = key && JSON.parse(localStorage.getItem(key))?.access_token;
    if (!token) return { result: 'BLOCKED_AUTH' };
    const get = async suffix => {
      const r = await fetch(`/api/companies/${company}${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json();
      if (r.status !== 200) throw new Error('blocked');
      return body.data;
    };
    const me = await get('/me');
    if (me.activeCompany?.id !== company || me.access?.role !== 'admin') return { result: 'BLOCKED_SCOPE' };
    const orders = (await get('/ordenes-compra')).filter(o => orderIds.includes(o.id));
    const stock = [], movements = [];
    for (const id of ids) {
      const detail = await get(`/stock/${id}`);
      stock.push({ articleId: id, physical: detail.summary?.physical, movements: detail.movements?.length, lots: detail.lots?.length });
      movements.push(...detail.movements.map(m => ({ ...m, articleId: id })));
    }
    const units = (await get('/stock/physical-units')).filter(u => ids.includes(u.articleId) || u.serialNumber?.startsWith(marker));
    const audits = await get(`/audit-events?entityType=OrdenCompra&entityId=${orderIds[0]}&take=100`);
    const origins = audits.filter(a => a.action === 'orden_compra_recibida');
    const summary = { result: 'READ_ONLY', orders: orders.map(o => ({ id: o.id, state: o.state, items: o.items.map(i => ({ id: i.id, received: i.received })) })),
      stock, identityCount: units.length, receipts: origins.map(a => ({ receiptId: a.newValue?.receiptId, operationKey: a.newValue?.operationKey })) };
    if (origins.length !== 1) return summary;
    const receipt = await get(`/receipts/${origins[0].newValue.receiptId}`);
    const main = orders.find(o => o.id === orderIds[0]);
    const keys = rows => rows.map(r => JSON.stringify(r)).sort().join('|');
    const expectedTrace = [0, 1].flatMap(i => [1, 2].map(n => [ids[i], `${marker}-${i ? 'C' : 'L'}${n}`, i ? `${marker}-S${n}` : null, n === 1 ? '2000-01-01' : '2099-12-31']));
    const valid = orders.length === 4 && keys(orders.map(o => [o.id])) === keys(orderIds.map(id => [id]))
      && main?.state === 'Recibida' && main.items.length === 2 && new Set(main.items.map(i => i.id)).size === 2
      && keys(main.items.map(i => [i.stockItemId])) === keys(ids.slice(0, 2).map(id => [id])) && main.items.every(i => Number(i.received) === 2)
      && orders.filter(o => o.id !== orderIds[0]).every(o => o.state === 'Enviada' && o.items.every(i => Number(i.received) === 0))
      && stock.every((s, i) => s.physical === (i < 2 ? 2 : 0) && s.movements === (i < 2 ? 2 : 0))
      && movements.length === 4 && units.length === 2 && receipt.lines.length === 4
      && new Set(movements.map(m => m.id)).size === 4 && new Set(receipt.lines.map(l => l.id)).size === 4
      && keys(movements.map(m => [m.articleId, m.lot, m.serial, m.expiry?.slice(0, 10)])) === keys(expectedTrace)
      && keys(receipt.lines.map(l => [l.articleId, l.lotCode, l.serialNumber, l.expirationDate?.slice(0, 10)])) === keys(expectedTrace)
      && keys(units.map(u => [u.serialNumber])) === keys([1, 2].map(n => [`${marker}-S${n}`]))
      && units.every(u => u.companyId === company && u.articleId === ids[1] && u.createdById === me.user.id && u.status === 'ACTIVE' && u.location === `${marker}-DEST`)
      && receipt.status === 'CONFIRMED' && receipt.documentReference === orderIds[0] && receipt.confirmedById === me.user.id
      && origins[0].userId === me.user.id && origins[0].newValue.receiptWarnings?.length === 2
      && origins[0].newValue.receiptWarnings.every(w => w.code === 'EXPIRED_RECEIPT_ACCEPTED' && w.expirationDate === '2000-01-01')
      && movements.every(m => {
        const articleIndex = ids.indexOf(m.articleId);
        const allocationIndex = m.lot === `${marker}-${articleIndex ? 'C' : 'L'}1` ? 1 : 2;
        const expectedDate = allocationIndex === 1 ? '2000-01-01' : '2099-12-31';
        const expectedSerial = articleIndex ? `${marker}-S${allocationIndex}` : null;
        const line = receipt.lines.find(l => l.id === m.receiptLineId);
        return articleIndex < 2 && m.lot === `${marker}-${articleIndex ? 'C' : 'L'}${allocationIndex}`
          && m.serial === expectedSerial && m.expiry?.slice(0, 10) === expectedDate
          && m.qty === 1 && m.movementType === 'RECEIPT_IN' && m.location === `${marker}-DEST` && m.createdById === me.user.id
          && m.receiptId === receipt.id && m.idempotencyKey === `receipt:${receipt.id}:line:${m.receiptLineId}`
          && line?.articleId === m.articleId && line.expectedCode === `${marker}-A${articleIndex}` && Number(line.receivedQuantity) === 1 && line.lotCode === m.lot
          && line.serialNumber === expectedSerial && line.expirationDate?.slice(0, 10) === expectedDate
          && (!expectedSerial || units.some(u => u.serialNumber === expectedSerial && u.articleId === m.articleId && u.status === 'ACTIVE' && u.location === `${marker}-DEST`));
      });
    return { ...summary, result: valid ? 'PASS_CANONICAL_RECEIVING' : 'FAIL_CANONICAL_ASSERTION', receiptLineCount: receipt.lines.length,
      warningCount: origins[0].newValue.receiptWarnings?.length, actorAndTraceVerified: valid };
  }, { company, marker, ids, orderIds });
  await writeFile(path.join(setup.artifacts, `${marker}-readback-${randomUUID()}.json`), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`Read-only scope verdict: ${result.result}; private owned-fixture summary saved, no business writes`);
  if (result.result !== 'PASS_CANONICAL_RECEIVING') process.exitCode = 1;
} catch { console.log('BLOCKED read-only owned-fixture readback'); process.exitCode = 1; }
finally { clearTimeout(timer); await browser?.close(); }
