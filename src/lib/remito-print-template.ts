import type { RemitoPrintCodesDto } from "@/lib/api/remito-print-codes"
import { REMITO_DOCUMENT_THEME } from "@/lib/remito-document-theme"

const { brand, colors, documentTitle, fontFamily } = REMITO_DOCUMENT_THEME

type PrintMetaField = {
  label: string
  value?: string | number | null
}

type PrintItem = {
  code?: string | null
  description: string
  quantity?: string | number | null
  unit?: string | null
  returnedQuantity?: string | number | null
  consumedQuantity?: string | number | null
  openQuantity?: string | number | null
  lotNumber?: string | null
  serialNumber?: string | null
  expirationDate?: string | null
  boxId?: string | null
  identifiedCode?: string | null
  groupLabel?: string | null
}

type BuildOperationalRemitoPrintHtmlOptions = {
  format?: "a4" | "thermal80"
  title?: string
  documentNumber: string
  copyLabel?: string
  state?: string | null
  origin?: string | null
  issuedAt?: string | null
  createdAt?: string | null
  destinationName?: string | null
  cuitDni?: string | null
  address?: string | null
  locality?: string | null
  province?: string | null
  surgeryLabel?: string | null
  patient?: string | null
  doctor?: string | null
  institution?: string | null
  client?: string | null
  surgeryDate?: string | null
  createdBy?: string | null
  responsible?: string | null
  boxId?: string | null
  presupuestoId?: string | null
  observations?: string | null
  metaFields?: PrintMetaField[]
  items: PrintItem[]
  detailItems?: PrintItem[]
  includeReturned?: boolean
  includeConsumedOpen?: boolean
  printCodes?: RemitoPrintCodesDto
  logoUrl?: string
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function dash(value: string | number | null | undefined) {
  const text = String(value ?? "").trim()
  return text || "—"
}

function metaRow(label: string, value: string | number | null | undefined) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(dash(value))}</strong></div>`
}

export function buildOperationalRemitoPrintHtml(options: BuildOperationalRemitoPrintHtmlOptions) {
  const thermal = options.format === "thermal80"
  const location = [options.locality, options.province].map((part) => part?.trim()).filter(Boolean).join(" · ")
  const itemColumns = [
    "<th>Código</th>",
    "<th>Descripción</th>",
    '<th class="num">Cantidad</th>',
    thermal ? "" : "<th>Unidad</th>",
    options.includeReturned ? '<th class="num">Devuelto</th>' : "",
    options.includeConsumedOpen ? '<th class="num">Consumido</th><th class="num">Abierto</th>' : "",
  ].join("")
  const itemColspan = (thermal ? 3 : 4) + (options.includeReturned ? 1 : 0) + (options.includeConsumedOpen ? 2 : 0)
  const rows = options.items.map((item) => `
    <tr>
      <td>${escapeHtml(dash(item.code))}</td>
      <td>${escapeHtml(item.description)}</td>
      <td class="num">${escapeHtml(dash(item.quantity))}</td>
      ${thermal ? "" : `<td>${escapeHtml(dash(item.unit))}</td>`}
      ${options.includeReturned ? `<td class="num">${escapeHtml(dash(item.returnedQuantity))}</td>` : ""}
      ${options.includeConsumedOpen ? `<td class="num">${escapeHtml(dash(item.consumedQuantity))}</td><td class="num strong">${escapeHtml(dash(item.openQuantity))}</td>` : ""}
    </tr>
  `).join("")

  const title = options.title ?? `Remito ${options.documentNumber}`
  const metaFields = options.metaFields ?? []
  const codes = options.printCodes
  const stateClass = (options.state ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const logoUrl = options.logoUrl ?? (typeof window === "undefined" ? brand.logoPublicPath : new URL(brand.logoPublicPath, window.location.origin).href)
  const brandLogo = `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand.logoAlt)}" />`
  const barcode = codes ? `
    <figure class="barcode">
      <figcaption>Identificación del remito</figcaption>
      ${codes.code128Svg}
      <strong>${escapeHtml(codes.remitoShortCode)}</strong>
    </figure>` : ""
  const printCodes = codes ? `
    <section class="codes compact-codes" aria-label="Remito identification codes">
      <figure class="qr">
        <figcaption>Uso interno OSSUM</figcaption>
        <img src="${escapeHtml(codes.internalQrDataUrl)}" alt="${escapeHtml(codes.labels.internal)}" />
      </figure>
      <figure class="qr">
        <figcaption>Verificar documento</figcaption>
        <img src="${escapeHtml(codes.publicQrDataUrl)}" alt="${escapeHtml(codes.labels.public)}" />
      </figure>
    </section>` : ""
  const surgeryBlock = options.surgeryLabel || options.patient || options.doctor || options.institution || options.surgeryDate ? `
    <section class="section">
      <p class="section-title">Referencia quirúrgica</p>
      <div class="meta">
        ${metaRow("CX / expediente", options.surgeryLabel)}
        ${metaRow("Paciente", options.patient)}
        ${metaRow("Médico", options.doctor)}
        ${metaRow("Institución", options.institution)}
        ${metaRow("Fecha de cirugía", options.surgeryDate)}
        ${metaRow("Cliente", options.client)}
      </div>
    </section>` : ""
  let previousGroup: string | null = null
  const detailedRows = (options.detailItems ?? options.items).map((item) => {
    const groupLabel = /^Caja \/ Fórmula \d+$/.test(item.groupLabel ?? "") ? item.groupLabel! : null
    const groupRow = groupLabel && groupLabel !== previousGroup
      ? `<tr class="detail-group"><td colspan="8">${escapeHtml(groupLabel)}</td></tr>`
      : ""
    previousGroup = groupLabel
    return `${groupRow}<tr>
      <td>${escapeHtml(dash(item.code))}</td>
      <td>${escapeHtml(item.description)}</td>
      <td class="num">${escapeHtml(dash(item.quantity))}</td>
      <td>${escapeHtml(dash(item.unit))}</td>
      <td>${escapeHtml(dash(item.lotNumber))}</td>
      <td>${escapeHtml(dash(item.serialNumber))}</td>
      <td>${escapeHtml(dash(item.expirationDate))}</td>
      <td>${escapeHtml(dash(item.identifiedCode))}</td>
    </tr>`
  }).join("")
  const detailedPage = thermal ? "" : `
    <main class="page detail-page">
      <div class="watermark">DISTRICORR</div>
      <div class="content">
        <header class="detail-header">
          <div class="company">${brandLogo}<p class="muted">${escapeHtml(brand.subtitle)} · detalle operativo</p></div>
          <div class="detail-document"><span>DETALLADO</span><strong>${escapeHtml(options.documentNumber)}</strong></div>
        </header>
        <section class="section"><div class="meta">
          ${metaRow("Remito", options.documentNumber)}${metaRow("Fecha / hora", options.issuedAt ?? options.createdAt)}${metaRow("Sucursal", options.metaFields?.find((field) => field.label === "Sucursal")?.value)}${metaRow("Depósito de salida", options.metaFields?.find((field) => field.label === "Depósito")?.value)}
          ${metaRow("Destinatario", options.destinationName)}${metaRow("Cliente", options.client)}${metaRow("Contacto", options.metaFields?.find((field) => field.label === "Contacto")?.value)}${metaRow("Generado por", options.createdBy)}
        </div></section>
        ${printCodes}
        ${surgeryBlock}
        <section class="section detail-material"><p class="section-title">Componentes emitidos · snapshot original</p><table><thead><tr><th>Código</th><th>Descripción</th><th class="num">Cant.</th><th>Unidad</th><th>Lote</th><th>Serie</th><th>Vencimiento</th><th>Identificación</th></tr></thead><tbody>${detailedRows || '<tr><td colspan="8">Sin ítems</td></tr>'}</tbody></table></section>
        <section class="section"><p class="section-title">Datos logísticos</p><div class="meta">${metaFields.map((field) => metaRow(field.label, field.value)).join("")}</div><div class="detail-notes"><strong>Observaciones</strong><p>${escapeHtml(dash(options.observations))}</p></div></section>
        <footer class="detail-signatures"><div>Entregado por</div><div>Recibido por</div><div>Firma / aclaración</div><div>Fecha / hora</div></footer>
      </div>
    </main>`

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: ${thermal ? "80mm auto" : "A4"}; margin: ${thermal ? "0 3.95mm" : "17mm"}; }
        * { box-sizing: border-box; }
        html { background: ${colors.preview}; }
        body { margin: 0; color: ${colors.ink}; font-family: ${fontFamily}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: ${thermal ? "80mm" : "210mm"}; min-height: ${thermal ? "auto" : "297mm"}; margin: 16px auto; background: #fff; padding: ${thermal ? "4mm" : "17mm"}; box-shadow: 0 16px 40px rgba(15, 23, 42, .18); overflow: hidden; }
        .watermark { display: none; }
        .content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; }
        /* Header band */
        .top { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; padding-bottom: 16px; border-bottom: 2px solid ${colors.line}; }
        .company { display: flex; flex-direction: column; gap: 1px; }
        .brand-logo { display: block; width: 54mm; height: auto; margin-bottom: 2px; object-fit: contain; object-position: left center; }
        .company .muted { color: ${colors.muted}; font-size: 9px; }
        .company p { margin: 0; }
        .doc { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .doc-title { color: ${colors.accent}; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .doc-number { font-size: 14px; font-weight: 600; color: ${colors.heading}; letter-spacing: 0; font-variant-numeric: tabular-nums; }
        .pill { display: inline-block; padding: 3px 8px; border-radius: 4px; background: ${colors.softLine}; color: ${colors.muted}; border: 0; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
        .pill.issued { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
        .pill.transit, .pill.en-transito { background: #fffbeb; color: #92400e; border-color: #fde68a; }
        .pill.delivered, .pill.entregado { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .pill.returned, .pill.devuelto, .pill.parcialmente-devuelto { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
        .pill.draft, .pill.borrador { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
        .pill.cancelled, .pill.anulado { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        /* Meta grid */
        .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px 12px; }
        .meta div { display: flex; flex-direction: column; gap: 1px; padding: 2px 0; }
        .meta span, .doc-grid span { color: ${colors.quiet}; text-transform: uppercase; font-size: 8px; letter-spacing: .05em; }
        .meta strong, .doc-grid strong { color: ${colors.text}; font-size: 9px; font-weight: 600; }
        .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 12px; }
        /* Section cards */
        .section { padding: 10px; border: 1px solid ${colors.line}; border-radius: 4px; background: #fff; break-inside: avoid; }
        .section + .section { margin-top: 0; }
        .section-title { margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1px solid ${colors.softLine}; color: ${colors.quiet}; font-size: 8px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
        /* Items table */
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th, td { border: 0; border-bottom: 1px solid ${colors.softLine}; padding: 5px 8px; font-size: 9px; vertical-align: top; }
        th { border-bottom: 2px solid ${colors.line}; background: ${colors.softSurface}; color: ${colors.muted}; font-weight: 700; text-align: left; text-transform: uppercase; letter-spacing: .03em; font-size: 8px; }
        td { height: 20px; }
        tbody tr { background: #fff; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .strong { font-weight: 800; }
        .observations { min-height: 38px; white-space: pre-wrap; color: ${colors.warningText}; background: ${colors.warningBackground}; border-color: ${colors.warningBorder}; }
        .barcode { width: 54mm; margin: 3px 0 0; text-align: center; }
        .barcode figcaption { margin-bottom: 2px; color: ${colors.muted}; font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
        .barcode svg { display: block; width: 100%; height: 8mm; margin: 0 auto 1px; }
        .barcode strong { font-family: ui-monospace, "JetBrains Mono", "Courier New", monospace; font-size: 8px; letter-spacing: .08em; color: ${colors.heading}; }
        /* Codes band — two clearly separated actions */
        .codes { display: grid; grid-template-columns: auto auto; justify-content: end; gap: 3mm; align-items: start; padding: 4px 7px; border: 1px solid ${colors.line}; border-radius: 4px; background: ${colors.softSurface}; break-inside: avoid; }
        .codes figure { margin: 0; text-align: center; }
        .codes figcaption { margin-bottom: 2px; color: ${colors.muted}; font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
        .codes .qr img { display: block; width: 22mm; height: 22mm; margin: auto; image-rendering: pixelated; background: #fff; padding: 1mm; border: 1px solid ${colors.strongLine}; border-radius: 2px; }
        .codes p { margin: 4px 0 0; font-size: 8.5px; font-weight: 700; color: ${colors.body}; }
        .codes small { display: block; margin-top: 1px; font-size: 7.5px; color: ${colors.muted}; }
        /* Signatures */
        .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16mm; margin-top: 14mm; padding: 0 8mm; break-inside: avoid; }
        .sign { border-top: 1px solid ${colors.strongLine}; padding-top: 4px; text-align: center; font-size: 8px; font-weight: 600; color: ${colors.muted}; }
        .detail-page { break-before: page; page-break-before: always; }
        .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid ${colors.line}; }
        .detail-document { display: flex; flex-direction: column; align-items: flex-end; color: ${colors.accent}; font-weight: 700; letter-spacing: .08em; }
        .detail-document strong { margin-top: 3px; color: ${colors.heading}; font-family: ui-monospace, monospace; font-size: 17px; }
        .detail-material { flex: 1; }
        .detail-group td { background: ${colors.softSurface}; color: ${colors.heading}; font-weight: 700; }
        .detail-notes { margin-top: 7px; border-top: 1px solid ${colors.line}; padding-top: 6px; }
        .detail-notes strong { font-size: 9px; text-transform: uppercase; }
        .detail-notes p { margin: 3px 0 0; white-space: pre-wrap; }
        .detail-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16mm 22mm; margin-top: 16mm; }
        .detail-signatures div { border-top: 1px solid ${colors.strongLine}; padding-top: 4px; text-align: center; font-size: 8px; font-weight: 600; color: ${colors.muted}; }
        ${thermal ? `
        html, body, .page, .section, .codes, th, td, tbody tr {
          background: #fff !important;
          color: #000 !important;
        }
        body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
        .watermark { display: none; }
        body { width: 72.1mm; font-family: "Courier New", monospace; font-size: 7pt; line-height: 1.15; font-weight: 700; }
        .page { width: 72.1mm; padding: 0; }
        .content { gap: 3px; }
        .top { display: block; border-bottom-color: #000; }
        .company { margin-bottom: 2mm; }
        .wordmark, .doc-title, .doc-number, .muted, .meta span, .meta strong,
        .section-title, .observations, .barcode figcaption, .barcode strong,
        .codes figcaption, .codes p, .codes small { color: #000 !important; }
        .wordmark { font-size: 17px; }
        .brand-logo { width: 52mm; filter: grayscale(1) contrast(1.25); }
        .doc { align-items: flex-start; text-align: left; }
        .doc-number { font-size: 17px; }
        .pill, .pill[class] { background: #fff !important; color: #000 !important; border: 1.5px solid #000 !important; }
        .barcode { width: 52mm; max-width: 100%; margin-top: 2mm; }
        .barcode svg { height: 9mm; background: #fff; color: #000; }
        .meta, .doc-grid { grid-template-columns: 1fr 1fr !important; gap: 1px 3px; }
        .meta div { padding: 1px 0; }
        .section, .codes { border-color: #000; }
        .section { padding: 3px 4px; border-width: 1.25px; border-radius: 0; }
        .section-title { margin-bottom: 2px; }
        table { margin-top: 2px; }
        th, td { padding: 1.5px 2px; font-size: 8px; font-weight: 600; border: 1.25px solid #000; }
        th { font-size: 7px; font-weight: 900; }
        .codes { grid-template-columns: auto auto; justify-content: center; gap: 2mm; padding: 3px 1mm; border-width: 1.25px; }
        .codes .qr img { width: 20mm; height: 20mm; padding: .75mm; background: #fff; border-color: #000; border-radius: 0; }
        .codes figcaption { font-size: 6.5px; }
        .codes p { font-size: 7.5px; }
        .codes small { font-size: 6.5px; }
        .footer { gap: 6mm; margin-top: 8mm; }
        .sign { color: #000; border-top-color: #000; }
        .page::after { content: ""; display: block; height: 9mm; }
        ` : ""}
        @media print {
          html, body { background: #fff; }
          .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <div class="watermark">DISTRICORR</div>
        <div class="content">
          <header class="top">
            <section class="company">
              ${brandLogo}
              <p class="muted">${escapeHtml(brand.subtitle)}</p>
            </section>
            <section class="doc">
              <span class="doc-title">${escapeHtml(documentTitle)}</span>
              <span class="doc-number">${escapeHtml(options.documentNumber)}</span>
              <span class="pill ${stateClass || "draft"}">${escapeHtml(options.state ?? "Borrador")}</span>
              ${options.copyLabel ? `<span class="muted" style="font-size:9px;color:${colors.muted}">${escapeHtml(options.copyLabel)}</span>` : ""}
              ${barcode}
            </section>
          </header>

          <section class="section">
            <div class="meta" style="grid-template-columns: repeat(3, minmax(0, 1fr))">
              ${metaRow("Fecha de emisión", options.issuedAt ?? options.createdAt)}
              ${metaRow("Origen", options.origin)}
              ${metaRow("Copia", options.copyLabel)}
            </div>
          </section>

          ${printCodes}

          <section class="section">
            <p class="section-title">Destino</p>
            <div class="meta">
              ${metaRow("Destinatario", options.destinationName)}
              ${metaRow("Cliente", options.client)}
              ${metaRow("C.U.I.T. / DNI", options.cuitDni)}
              ${metaRow("Domicilio", options.address)}
              ${metaRow("Localidad", location)}
            </div>
          </section>

          ${surgeryBlock}

          <section class="section">
            <p class="section-title">Resumen de material</p>
            <table>
              <thead><tr>${itemColumns}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${itemColspan}">Sin ítems</td></tr>`}</tbody>
            </table>
          </section>

          <section class="section observations">
            <p class="section-title">Observaciones</p>
            ${escapeHtml(dash(options.observations))}
            ${metaFields.length ? `<div class="meta" style="margin-top:6px">${metaFields.map((field) => metaRow(field.label, field.value)).join("")}</div>` : ""}
          </section>

          <footer class="footer">
            <div class="sign">Entregó</div>
            <div class="sign">Recibió conforme</div>
            <div class="sign">Fecha</div>
          </footer>
        </div>
      </main>
      ${detailedPage}
      <script>
        window.addEventListener("load", () => {
          requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
        }, { once: true })
      </script>
    </body>
  </html>`
}
