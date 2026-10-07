import { apiFetch } from "@/lib/api/client"
import { toLegacyPresupuestoProjection, type PresupuestoApiRow } from "@/lib/api/presupuestos"
import { fetchAllInvoices, type InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"
import { formatDate } from "@/lib/formatters"
import { documentMoney, type ComprobanteType } from "@/components/expediente/comprobantes-model"

type CommercialType = Exclude<ComprobanteType, "NR">
type PrintDocument = { type: "PR"; row: PresupuestoApiRow } | { type: "FV"; row: InvoiceApiRow } |
  { type: "CO"; row: PaymentApiRow; invoices: InvoiceApiRow[] }
type PrintContext = { companyName?: string; surgeryLabel?: string }

function escape(value: unknown) {
  return String(value ?? "—").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;")
}
function field(label: string, value: unknown) {
  return `<div><dt>${escape(label)}</dt><dd>${escape(value === "" ? "—" : value)}</dd></div>`
}

/** Read-only operational copies. All financial figures are stored backend values. */
export function buildCommercialPrintHtml(document: PrintDocument, context: PrintContext = {}) {
  const { row, type } = document
  const title = type === "PR" ? "Presupuesto" : type === "FV" ? "Factura operativa" : "Recibo de cobro"
  const number = row.visibleNumber ?? "Sin numeración"
  const money = (value: string | number | null | undefined) => documentMoney(value, row.currency)
  let details: string
  let content: string
  let totals: string
  let notes: string
  if (document.type === "CO") {
    const payment = document.row
    const invoices = new Map(document.invoices.map(invoice => [invoice.id, invoice]))
    const allocations = payment.imputations.filter(line => invoices.has(line.invoiceId))
    const methods: Record<string, string> = { transfer: "Transferencia", cash: "Efectivo", check: "Cheque", other: "Otro" }
    const meta = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) ? payment.metadata as Record<string, unknown> : {}
    details = field("Fecha de cobro", formatDate(payment.receivedAt)) + field("Medio de pago", methods[payment.method ?? ""] ?? payment.method) +
      field("Referencia", typeof meta.reference === "string" ? meta.reference : null)
    content = `<h2>Imputaciones a facturas de esta cirugía</h2><p>El importe total del recibo puede incluir otras cirugías. Esta tabla muestra únicamente las imputaciones de este expediente.</p>
      <div class="table-wrap"><table><thead><tr><th>Factura</th><th class="num">Importe imputado</th></tr></thead><tbody>${allocations.map(line => `<tr><td>${escape(invoices.get(line.invoiceId)?.visibleNumber ?? "Sin numeración")}</td><td class="num">${escape(money(line.amount))}</td></tr>`).join("") || '<tr><td colspan="2">Sin imputaciones a facturas de esta cirugía.</td></tr>'}</tbody></table></div>`
    totals = field("Importe total del recibo", money(payment.amount))
    notes = typeof meta.notes === "string" ? meta.notes : ""
  } else {
    const financial = document.row
    details = field("Fecha", formatDate(financial.issuedAt ?? financial.createdAt))
    if (document.type === "PR") {
      const budget = document.row
      const parties = toLegacyPresupuestoProjection(budget)
      details = field("Fecha", formatDate(budget.documentDate ?? budget.issuedAt ?? budget.createdAt)) +
        field("Cliente", parties.client) + field("Financiador", parties.financiador) + field("Paciente", parties.patient) +
        field("Institución", parties.institution) + field("Condición de pago", budget.paymentTerms) +
        field("Vigente hasta", budget.validUntil ? formatDate(budget.validUntil) : null) + field("Versión", budget.versionNumber)
      notes = [budget.title, budget.legend, budget.notes].filter(Boolean).join("\n\n")
    } else {
      details += field("Base", document.row.base) + field("Cobrado", money(document.row.paidTotal)) + field("Saldo", money(document.row.balance))
      notes = "Copia de factura operativa. No constituye una factura fiscal ni acredita CAE."
    }
    content = `<h2>Detalle</h2><div class="table-wrap"><table><thead><tr><th>Código / Descripción</th><th class="num">Cantidad</th><th class="num">Precio unitario</th><th class="num">Descuento</th><th class="num">Impuestos</th><th class="num">Total</th></tr></thead><tbody>${financial.items.map(line => `<tr>
      <td>${escape(line.sku)}<br>${escape(line.description)}${line.unit ? `<br>Unidad: ${escape(line.unit)}` : ""}</td><td class="num">${escape(line.quantity)}</td>
      <td class="num">${escape(money(line.unitPrice))}</td><td class="num">${escape(money(line.discount))}</td><td class="num">${escape(money(line.tax))}</td><td class="num">${escape(money(line.total))}</td></tr>`).join("") || '<tr><td colspan="6">Sin detalle registrado.</td></tr>'}</tbody></table></div>`
    totals = field("Subtotal", money(financial.subtotal)) + field("Descuentos", money(financial.discountTotal)) + field("Impuestos", money(financial.taxTotal)) + field("Total", money(financial.total))
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escape(title)} ${escape(number)}</title><style>
    @page { size: A4; margin: 12mm; } * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font: 12px Arial, sans-serif; color: #17202a; background: #fff; }
    main { max-width: 960px; margin: auto; } header { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; }
    h1 { margin: 8px 0; font-size: 24px; } h2 { margin: 20px 0 8px; font-size: 15px; }
    p, dd, td { overflow-wrap: anywhere; } dl { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
    dt { color: #475569; font-size: 11px; } dd { margin: 4px 0 0; font-weight: 600; }
    .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; } thead { display: table-header-group; } tr { break-inside: avoid; }
    .num { text-align: right; font-variant-numeric: tabular-nums; } .totals { border-top: 1px solid #cbd5e1; padding-top: 12px; break-inside: avoid; }
    .notes { white-space: pre-wrap; } footer { margin-top: 24px; color: #475569; font-size: 11px; }
    @media screen and (max-width: 600px) { body { padding: 12px; } dl { grid-template-columns: 1fr; } table { min-width: 600px; } }
    @media print { body { padding: 0; } main { max-width: none; } .table-wrap { overflow: visible; } th { print-color-adjust: exact; } }
  </style></head><body><main><header><p>OSSUM COR · ${escape(context.companyName ?? "Empresa seleccionada")}</p>
    <h1>${escape(title)} · ${escape(number)}</h1><p>Copia operativa · Sin validez fiscal</p></header>
    <dl>${field("Estado", row.state.replaceAll("_", " "))}${field("Cirugía", context.surgeryLabel)}${field("Moneda", row.currency)}${details}</dl>
    ${content}<dl class="totals">${totals}</dl>${notes ? `<h2>Observaciones</h2><p class="notes">${escape(notes)}</p>` : ""}
    <footer>Solo lectura. Esta impresión no emite ni modifica comprobantes y no reemplaza documentación fiscal.</footer></main></body></html>`
}

export async function fetchCommercialPrintHtml(type: CommercialType, id: string, companyId: string, surgeryId: string, context?: PrintContext) {
  const endpoint = type === "PR" ? "presupuestos" : type === "FV" ? "invoices" : "payments"
  const path = `/api/companies/${encodeURIComponent(companyId)}/${endpoint}/${encodeURIComponent(id)}`
  if (type === "CO") {
    const payment = await apiFetch<PaymentApiRow>(path, { cache: "no-store" })
    if (payment.id !== id || payment.companyId !== companyId) throw new Error("Cobro fuera de alcance")
    const invoices = await fetchAllInvoices(companyId, { surgeryId })
    if (invoices.some(row => row.companyId !== companyId || row.surgeryId !== surgeryId)) throw new Error("Facturas fuera de alcance")
    if (payment.surgeryId !== surgeryId && !payment.imputations.some(line => invoices.some(invoice => invoice.id === line.invoiceId))) throw new Error("Cobro no vinculado")
    return buildCommercialPrintHtml({ type, row: payment, invoices }, context)
  }
  const row = await apiFetch<PresupuestoApiRow | InvoiceApiRow>(path, { cache: "no-store" })
  if (row.id !== id || row.companyId !== companyId || row.surgeryId !== surgeryId) throw new Error("Comprobante fuera de alcance")
  return type === "PR" ? buildCommercialPrintHtml({ type, row: row as PresupuestoApiRow }, context) : buildCommercialPrintHtml({ type, row: row as InvoiceApiRow }, context)
}
