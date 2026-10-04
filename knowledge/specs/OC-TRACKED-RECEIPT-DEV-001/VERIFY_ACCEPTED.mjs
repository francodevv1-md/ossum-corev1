import { chromium } from '@playwright/test';
import { configuration } from '../../../scripts/qa/run-compras-tracked-process.mjs';
import { registeredRoots, validateStatePath } from '../../../scripts/qa/dev-session.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const setup = configuration(), company = 'codevdistricorr1000000000';
const marker = 'QA-OC-TRACKED-5704fb06-0eb7-484f-be1f-2b046432ef6e';
const articleIds = ['cmutyatiq002oxohuq1edd2ke', 'cmutyazd7002sxohul1jtusp1', 'cmutyb0ub002wxohuowq7st49', 'cmutyb22x0030xohuh9bd0cfl', 'cmutyb3iu0034xohuyvsbrn3a'];
const orderIds = ['cmutyb50s0038xohuqs84k5ff', 'cmutybas8003exohur9fa9pwz', 'cmutybc57003jxohuzfe9rcaq', 'cmutybde2003oxohu3n5vynae'];
const itemIds = ['cmutyb52g0039xohusn2gzl6r', 'cmutyb52g003axohufb06k3gp', 'cmutybats003fxohuurnjgu14', 'cmutybc6r003kxohugmgyyubj', 'cmutybdfn003pxohuqx4closn'];
const intentPath = validateStatePath(process.env.COMPRAS_TRACKED_ACCEPTED_INTENT_PATH, 'preflight', registeredRoots(process.cwd()));
const saved = JSON.parse(await readFile(intentPath, 'utf8')), intent = saved.intent;
assert.equal(saved.marker, marker); assert.equal(saved.companyId, company); assert.equal(saved.status, 200);
assert.equal(intent.location, `${marker}-DEST`);
assert.equal(typeof intent.operationKey, 'string'); assert(intent.operationKey.length > 0 && intent.operationKey.trim() === intent.operationKey && intent.operationKey.length <= 128);
assert.deepEqual(intent.receivedByItem, [0, 1].map(index => ({ itemId: itemIds[index], received: '2', allocations: [1, 2].map(n => ({
  quantity: '1', lotCode: `${marker}-${index ? 'C' : 'L'}${n}`, ...(index ? { serialNumber: `${marker}-S${n}` } : {}), expirationDate: n === 1 ? '2000-01-01' : '2099-12-31',
})) })));
let browser, timer, phase = 'preflight';
const evidencePath = path.join(setup.artifacts, `${marker}-verify-${randomUUID()}.json`);
const checks = [];
try {
  browser = await chromium.launch(); timer = setTimeout(() => { void browser?.close(); }, 10 * 60000);
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
  const pendingMe = page.waitForResponse(r => new URL(r.url()).pathname === `/api/companies/${company}/me`, { timeout: 45000 });
  await page.goto(`${setup.baseURL}/compras/ordenes-compra`, { timeout: 45000 });
  const membership = await pendingMe, me = (await membership.json()).data;
  assert.equal(membership.status(), 200); assert.equal(me.activeCompany.id, company); assert.equal(me.access.role, 'admin'); assert.equal(me.user.id, setup.actorId);
  const bearer = await membership.request().headerValue('authorization'); assert(/^Bearer \S+$/.test(bearer));
  const base = `${setup.baseURL}/api/companies/${company}`;
  const get = async suffix => {
    assert(suffix === '/ordenes-compra' || suffix === '/stock/physical-units'
      || articleIds.some(id => suffix === `/stock/${id}` || suffix === `/articles/${id}`)
      || /^\/receipts\/c[a-z0-9]{24}$/.test(suffix)
      || orderIds.some(id => suffix === `/audit-events?entityType=OrdenCompra&entityId=${id}&take=100`));
    const r = await context.request.get(`${base}${suffix}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 45000 });
    assert.equal(r.status(), 200); return (await r.json()).data;
  };
  const snapshot = async () => {
    const allOrders = await get('/ordenes-compra'); assert(allOrders.length < 100);
    const orders = orderIds.map(id => { const matches = allOrders.filter(o => o.id === id); assert.equal(matches.length, 1); return matches[0]; });
    const stock = await Promise.all(articleIds.map(id => get(`/stock/${id}`)));
    const units = (await get('/stock/physical-units')).filter(u => articleIds.includes(u.articleId) || u.serialNumber?.startsWith(marker)).sort((a, b) => a.id.localeCompare(b.id));
    const audits = await Promise.all(orderIds.map(id => get(`/audit-events?entityType=OrdenCompra&entityId=${id}&take=100`)));
    assert(audits.every(rows => rows.length < 100));
    const receiptIds = [...new Set(stock.flatMap(s => s.movements.map(m => m.receiptId)))].sort();
    const receipts = await Promise.all(receiptIds.map(id => get(`/receipts/${id}`)));
    return { orders, stock, units, audits, receipts };
  };
  const initial = await snapshot();
  assert.equal(initial.orders[0].state, 'Recibida'); assert(initial.orders[0].items.every(i => Number(i.received) === 2));
  assert.equal(initial.units.length, 2); assert.equal(initial.receipts.length, 1);
  const acceptedOrigins = initial.audits[0].filter(a => a.action === 'orden_compra_recibida'); assert.equal(acceptedOrigins.length, 1);
  assert.equal(acceptedOrigins[0].newValue.operationKey, intent.operationKey); assert.equal(acceptedOrigins[0].newValue.receiptId, initial.receipts[0].id);
  assert.equal(initial.receipts[0].idempotencyKey, `oc:${encodeURIComponent(orderIds[0])}:operation:${encodeURIComponent(intent.operationKey)}`);
  for (const [index, order] of initial.orders.entries()) {
    assert.equal(order.companyId, company); assert.equal(order.proveedorId, setup.supplier.id);
    assert.equal(new Set(order.items.map(i => i.id)).size, order.items.length);
    const expectedArticles = index ? [articleIds[index + 1]] : articleIds.slice(0, 2);
    assert.deepEqual(order.items.map(i => i.stockItemId).sort(), [...expectedArticles].sort());
    if (index) { assert.equal(order.state, 'Enviada'); assert.equal(order.items.length, 1); assert.equal(order.items[0].id, itemIds[index + 1]); assert.equal(Number(order.items[0].received), 0); assert.equal(Number(order.items[0].quantity), 1); }
  }
  for (let index = 2; index < 5; index++) {
    const article = await get(`/articles/${articleIds[index]}`);
    assert.equal(article.sku, `${marker}-A${index}`); assert.equal(article.tracePolicies[0].policy, 'SERIAL');
    assert.equal(initial.stock[index].summary.physical, 0); assert.equal(initial.stock[index].movements.length, 0);
    assert(!initial.units.some(u => u.articleId === articleIds[index]));
  }
  const post = async (orderIndex, payload) => {
    assert(orderIndex >= 0 && orderIndex < 4 && Number.isInteger(orderIndex));
    assert.equal(payload.location, intent.location); assert(payload.operationKey.length <= 128);
    if (orderIndex === 0) assert.equal(payload.operationKey, intent.operationKey);
    else assert(payload.operationKey.startsWith(`${marker}-`));
    assert(payload.receivedByItem.length === (orderIndex ? 1 : 2));
    assert(payload.receivedByItem.every(row => initial.orders[orderIndex].items.some(i => i.id === row.itemId)
      && row.allocations.every(a => (!a.serialNumber || a.serialNumber.startsWith(marker)) && (!a.lotCode || a.lotCode.startsWith(marker)))));
    const r = await context.request.post(`${base}/ordenes-compra/${orderIds[orderIndex]}/recibir`, { headers: { Authorization: bearer }, data: payload, maxRedirects: 0, timeout: 90000 });
    return { status: r.status(), body: await r.json() };
  };
  for (const reordered of [false, true]) {
    phase = reordered ? 'reordered-replay' : 'exact-replay';
    const payload = structuredClone(intent);
    if (reordered) { payload.receivedByItem.reverse(); for (const row of payload.receivedByItem) { row.allocations.reverse(); row.received = '2.00000e0'; for (const a of row.allocations) a.quantity = '0.00001e5'; } }
    const before = await snapshot(), result = await post(0, payload);
    assert.equal(result.status, 200); assert.equal(result.body.data.state, 'Recibida'); assert.equal(result.body.data.receiptWarnings.length, 2);
    assert.deepEqual(await snapshot(), before); checks.push(phase);
  }
  phase = 'changed-trace';
  const changed = structuredClone(intent); changed.receivedByItem[0].allocations[0].lotCode += '-CHANGED';
  let before = await snapshot(), result = await post(0, changed);
  assert.equal(result.status, 409); assert.equal(result.body.error.code, 'orden_compra_receipt_conflict'); assert.deepEqual(await snapshot(), before); checks.push(phase);
  const serialPayload = (orderIndex, serial) => ({ operationKey: `${marker}-${randomUUID()}`, location: intent.location,
    receivedByItem: [{ itemId: itemIds[orderIndex + 1], received: '1', allocations: [{ quantity: '1', serialNumber: `${marker}-${serial}` }] }] });
  phase = 'cross-article-serial'; before = await snapshot(); result = await post(1, serialPayload(1, 'S1'));
  assert.equal(result.status, 409); assert.equal(result.body.error.code, 'orden_compra_serial_conflict'); assert.deepEqual(await snapshot(), before); checks.push(phase);
  phase = 'concurrent-serial-race'; before = await snapshot();
  const payloads = [serialPayload(2, 'RACE'), serialPayload(3, 'RACE')];
  await writeFile(evidencePath, JSON.stringify({ marker, result: 'FROZEN_BEFORE_RACE', checks, raceIntents: payloads }), { flag: 'wx', mode: 0o600 });
  const results = await Promise.all([post(2, payloads[0]), post(3, payloads[1])]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const winner = results.findIndex(r => r.status === 200), loser = 1 - winner;
  assert.equal(results[loser].body.error.code, 'orden_compra_serial_conflict');
  const after = await snapshot(), winnerArticleIndex = winner + 3, loserArticleIndex = loser + 3;
  assert.equal(after.units.length, 3); assert.equal(after.receipts.length, 2);
  assert.equal(after.stock[winnerArticleIndex].summary.physical, 1); assert.equal(after.stock[winnerArticleIndex].movements.length, 1);
  assert.equal(after.orders[winner + 2].state, 'Recibida');
  assert.equal(after.orders[winner + 2].items.length, 1); assert.equal(Number(after.orders[winner + 2].items[0].received), 1);
  assert.deepEqual(after.stock[loserArticleIndex], before.stock[loserArticleIndex]); assert.deepEqual(after.orders[loser + 2], before.orders[loser + 2]); assert.deepEqual(after.audits[loser + 2], before.audits[loser + 2]);
  for (const index of [0, 1]) { assert.deepEqual(after.orders[index], before.orders[index]); assert.deepEqual(after.audits[index], before.audits[index]); }
  for (const index of [0, 1, 2]) assert.deepEqual(after.stock[index], before.stock[index]);
  assert.deepEqual(after.units.filter(u => before.units.some(old => old.id === u.id)), before.units);
  assert.deepEqual(after.receipts.filter(r => before.receipts.some(old => old.id === r.id)), before.receipts);
  const newReceipts = after.receipts.filter(r => !before.receipts.some(old => old.id === r.id)); assert.equal(newReceipts.length, 1);
  const receipt = newReceipts[0], movement = after.stock[winnerArticleIndex].movements[0];
  assert.equal(receipt.companyId, company); assert.equal(receipt.documentReference, orderIds[winner + 2]); assert.equal(receipt.supplierId, setup.supplier.id);
  assert.equal(receipt.status, 'CONFIRMED'); assert.equal(receipt.confirmedById, me.user.id); assert.equal(receipt.lines.length, 1);
  const line = receipt.lines[0]; assert.equal(line.articleId, articleIds[winnerArticleIndex]); assert.equal(line.serialNumber, `${marker}-RACE`);
  assert.equal(Number(line.receivedQuantity), 1); assert.equal(line.lotCode, null); assert.equal(line.expirationDate, null);
  assert.equal(movement.receiptId, receipt.id); assert.equal(movement.receiptLineId, line.id); assert.equal(movement.qty, 1);
  assert.equal(movement.serial, `${marker}-RACE`); assert.equal(movement.lot, null); assert.equal(movement.expiry, null);
  assert.equal(movement.movementType, 'RECEIPT_IN'); assert.equal(movement.location, intent.location); assert.equal(movement.createdById, me.user.id);
  assert.equal(movement.idempotencyKey, `receipt:${receipt.id}:line:${line.id}`);
  const newUnits = after.units.filter(u => !before.units.some(old => old.id === u.id)); assert.equal(newUnits.length, 1);
  const unit = newUnits[0]; assert.equal(unit.companyId, company); assert.equal(unit.serialNumber, `${marker}-RACE`);
  assert.equal(unit.articleId, articleIds[winnerArticleIndex]); assert.equal(unit.createdById, me.user.id); assert.equal(unit.location, intent.location); assert.equal(unit.status, 'ACTIVE');
  const origins = after.audits[winner + 2].filter(a => a.action === 'orden_compra_recibida' && a.newValue?.receiptId === receipt.id); assert.equal(origins.length, 1);
  assert.equal(origins[0].userId, me.user.id); assert.equal(origins[0].newValue.operationKey, payloads[winner].operationKey); assert.equal(origins[0].newValue.location, intent.location);
  const allocations = origins[0].newValue.allocations; assert.equal(allocations.length, 1); assert.equal(allocations[0].lineNumber, line.lineNumber);
  assert.equal(allocations[0].physicalUnitId, unit.id); assert.equal(allocations[0].unitCode, unit.unitCode); assert.equal(allocations[0].articleId, line.articleId); assert.equal(allocations[0].ordenCompraItemId, itemIds[winner + 3]); checks.push(phase);
  phase = 'reload'; const persisted = await snapshot(); await page.reload(); assert.deepEqual(await snapshot(), persisted); checks.push(phase);
  await writeFile(`${evidencePath}.result.json`, JSON.stringify({ marker, result: 'PASS', checks, winnerOrderId: orderIds[winner + 2], loserOrderId: orderIds[loser + 2], fixtureCreation: false, cleanup: false }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log('PASS real DEV accepted-key replay/reordered replay/changed trace/cross-article serial/concurrent rollback/reload; same owned fixtures, no creation');
} catch {
  await writeFile(`${evidencePath}.stopped.json`, JSON.stringify({ marker, result: 'FAIL_OR_BLOCKED', phase, checks }), { flag: 'wx', mode: 0o600 }).catch(() => {});
  console.log(`FAIL/BLOCKED accepted verification phase ${phase}; fixtures retained, no automatic retry`); process.exitCode = 1;
} finally { clearTimeout(timer); await browser?.close(); }
