import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import assert from "node:assert/strict"
import { renderRemitoPdf, remitoPdfHtml } from "../../../../src/lib/remito-pdf"
import type { RemitoApiRow } from "../../../../src/lib/api/remitos"

async function main() {
  const require = createRequire(import.meta.url)
  const { default: init } = await import("takumi-pdf/no-init")
  await init({ module_or_path: await readFile(require.resolve("takumi-pdf/takumi_pdf_wasm_bg.wasm")) })
  const output = path.join(process.env.LOCALAPPDATA!, "Temp/opencode/remito-pdf-step2")
  await mkdir(output, { recursive: true })
  const row = {
    id: "remito-qa-001", companyId: "company-qa", surgeryId: "surgery-qa", visibleNumber: 93,
    state: "Entregado", origin: "manual", createdAt: "2026-10-01", issuedAt: null, deliveredAt: null, returnedAt: null,
    destinatarioSnapshot: { nombre: "Hospital Córdoba <script>invalid()</script>", cuitDni: "30-12345678-9" },
    shippingAddressSnapshot: { domicilio: "Dirección de entrega 123", localidad: "Córdoba" },
    metadata: { observaciones: "Observación: material quirúrgico, prótesis y tornillos." },
    items: [{ id: "item-1", sku: "ART-1", description: "Prótesis quirúrgica <b>sin ejecutar</b>", quantity: "2", unit: "u", returnedQuantity: "1" }],
  } as unknown as RemitoApiRow
  assert.ok(remitoPdfHtml(row).includes("Hospital Córdoba &lt;script&gt;invalid()&lt;/script&gt;"))
  for (const [name, fixture] of [
    ["single", row],
    ["multipage", { ...row, items: Array.from({ length: 120 }, (_, index) => ({ ...row.items[0], id: `item-${index}`, sku: `ART-${index}`, description: `Material índice ${index}: Prótesis quirúrgica y tornillos para artroplastia.` })) }],
    ["empty", { ...row, visibleNumber: null, destinatarioSnapshot: null, shippingAddressSnapshot: null, metadata: null, items: [] }],
  ] as const) {
    const blob = await renderRemitoPdf(fixture)
    assert.equal(blob.type, "application/pdf")
    const bytes = Buffer.from(await blob.arrayBuffer())
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-")
    assert.ok(bytes.subarray(-100).toString().includes("%%EOF"))
    await writeFile(path.join(output, `${name}.pdf`), bytes)
  }
  console.log(JSON.stringify({ result: "PASS", output }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
