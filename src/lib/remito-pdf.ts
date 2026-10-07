import type { RemitoApiRow } from "@/lib/api/remitos"
import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"
import { formatDate } from "@/lib/formatters"

/** Same escaped operational document as printing, adapted to paged PDF geometry. */
export function remitoPdfHtml(remito: RemitoApiRow) {
  const recipient = remito.destinatarioSnapshot
  const date = (value: string | null) => value ? formatDate(value) : "—"
  return buildOperationalRemitoPrintHtml({
    title: `Remito ${remito.visibleNumber ?? "Sin numeración"}`,
    documentNumber: String(remito.visibleNumber ?? "Sin numeración"),
    state: remito.state, origin: remito.origin,
    issuedAt: date(remito.issuedAt), createdAt: date(remito.createdAt),
    destinationName: recipient?.nombre, cuitDni: recipient?.cuitDni,
    address: remito.shippingAddressSnapshot?.domicilio ?? recipient?.domicilio,
    locality: remito.shippingAddressSnapshot?.localidad ?? recipient?.localidad,
    province: remito.shippingAddressSnapshot?.provincia ?? recipient?.provincia,
    surgeryLabel: remito.surgeryId, boxId: remito.boxId, presupuestoId: remito.presupuestoId,
    internalId: remito.id,
    observations: typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : null,
    metaFields: [
      { label: "Entregado", value: date(remito.deliveredAt) },
      { label: "Devuelto", value: date(remito.returnedAt) },
      { label: "Sucursal", value: remito.branchId },
      { label: "Motivo salida", value: remito.salidaReason },
      { label: "Transporte", value: remito.transportSnapshot?.nombre },
      { label: "Bultos", value: remito.packageCount },
      { label: "Valor declarado", value: remito.declaredValue },
    ],
    includeReturned: true,
    items: remito.items.map(item => ({ code: item.sku, description: item.description, quantity: item.quantity, unit: item.unit, returnedQuantity: item.returnedQuantity })),
  }).replace("</style>", `
    html, body { background: #fff; font-family: Geist; }
    .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; overflow: visible; }
    .watermark { display: none; }
    .content { position: static; }
    tr { break-inside: avoid; }
    .observations, .footer { break-inside: avoid; }
  </style>`)
}

export async function renderRemitoPdf(remito: RemitoApiRow) {
  // Load WASM only for an explicit PDF download, not for every register visit.
  const [{ default: init, render }, { default: wasmUrl }] = await Promise.all([
    import("takumi-pdf/no-init"), import("takumi-pdf/wasm-url"),
  ])
  await init({ module_or_path: wasmUrl })
  const bytes = await render(remitoPdfHtml(remito), {
    size: "a4", margin: 12 * 96 / 25.4, fontFamilies: ["Geist"], lang: "es-AR",
    metadata: { title: `Remito ${remito.visibleNumber ?? "Sin numeración"}` },
  })
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") throw new Error("Invalid PDF output")
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" })
}
