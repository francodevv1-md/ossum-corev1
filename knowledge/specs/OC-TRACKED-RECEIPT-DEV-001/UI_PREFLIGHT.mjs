import { chromium, expect } from '@playwright/test';
import { configuration } from '../../../scripts/qa/run-compras-tracked-process.mjs';
const setup = configuration();
const marker = 'QA-OC-TRACKED-5704fb06-0eb7-484f-be1f-2b046432ef6e';
const order = 'cmutyb50s0038xohuqs84k5ff';
const items = ['cmutyb52g0039xohusn2gzl6r', 'cmutyb52g003axohufb06k3gp'];
let browser, phase = 'launch', attemptedWrites = 0;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ storageState: setup.state });
  await context.route('**/*', async route => {
    if (route.request().method() !== 'GET') { attemptedWrites++; await route.abort(); }
    else await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  phase = 'navigate';
  await page.goto(`${setup.baseURL}/compras/ordenes-compra`);
  const row = page.getByRole('row').filter({ has: page.getByText(order, { exact: true }) });
  phase = 'owned-row'; await expect(row).toHaveCount(1);
  phase = 'menu'; await row.locator('button[aria-haspopup="menu"]').click();
  phase = 'receive-menu'; await page.getByRole('menuitem', { name: 'Registrar recepción', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Registrar recepción', exact: true });
  phase = 'dialog'; await expect(dialog).toBeVisible();
  await dialog.getByLabel('Destino del stock', { exact: true }).fill(`${marker}-DEST`);
  for (const [articleIndex, item] of items.entries()) {
    const name = `000 ${marker}-A${articleIndex}`;
    for (let index = 0; index < 2; index++) {
      phase = `add-${articleIndex}-${index}`;
      await dialog.getByRole('button', { name: `Agregar asignación de ${name}`, exact: true }).click();
      const block = dialog.getByTestId(`receipt-allocation-${item}-${index}`);
      phase = `quantity-${articleIndex}-${index}`;
      const quantity = block.getByLabel(`Cantidad — ${name}, asignación ${index + 1}`, { exact: true });
      if (articleIndex) { await expect(quantity).toHaveValue('1'); await expect(quantity).toHaveAttribute('readonly', ''); }
      else await quantity.fill('1');
      phase = `lot-${articleIndex}-${index}`;
      await block.getByLabel(`Lote — ${name}, asignación ${index + 1}`, { exact: true }).fill(`${marker}-${articleIndex ? 'C' : 'L'}${index + 1}`);
      if (articleIndex) await block.getByLabel(`Número de serie — ${name}, asignación ${index + 1}`, { exact: true }).fill(`${marker}-S${index + 1}`);
      phase = `date-${articleIndex}-${index}`;
      await block.getByLabel(`Vencimiento — ${name}, asignación ${index + 1}`, { exact: true }).fill(index ? '2099-12-31' : '2000-01-01');
    }
    phase = `total-${articleIndex}`;
    await expect(dialog.getByRole('spinbutton', { name: `Recibir ${name}`, exact: true })).toHaveValue('2');
  }
  phase = 'invalid-date';
  const firstName = `000 ${marker}-A0`;
  await dialog.getByLabel(`Vencimiento — ${firstName}, asignación 1`, { exact: true }).fill('');
  await dialog.getByRole('button', { name: 'Registrar recepción', exact: true }).click();
  await expect(dialog.getByText('Completá cada asignación con cantidad positiva y lote, serie o fecha válida según la política del artículo.', { exact: true })).toBeVisible();
  phase = 'expired-advisories';
  await dialog.getByLabel(`Vencimiento — ${firstName}, asignación 1`, { exact: true }).fill('2000-01-01');
  await expect(dialog.getByRole('alert').filter({ hasText: 'Material vencido: la recepción se registrará y generará un aviso' })).toHaveCount(2);
  console.log(`PASS UI-only preflight; outbound mutation attempts ${attemptedWrites}, all blocked`);
} catch {
  console.log(`FAIL UI-only phase ${phase}; outbound mutation attempts ${attemptedWrites}, all blocked`);
  process.exitCode = 1;
} finally { await browser?.close(); }
