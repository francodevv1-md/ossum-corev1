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
}

type BuildOperationalRemitoPrintHtmlOptions = {
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
  institution?: string | null
  boxId?: string | null
  presupuestoId?: string | null
  internalId?: string | null
  observations?: string | null
  metaFields?: PrintMetaField[]
  items: PrintItem[]
  includeReturned?: boolean
  includeConsumedOpen?: boolean
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
  const location = [options.locality, options.province].map((part) => part?.trim()).filter(Boolean).join(" · ")
  const itemColumns = [
    "<th>Código</th>",
    "<th>Descripción</th>",
    '<th class="num">Cantidad</th>',
    "<th>Unidad</th>",
    options.includeReturned ? '<th class="num">Devuelto</th>' : "",
    options.includeConsumedOpen ? '<th class="num">Consumido</th><th class="num">Abierto</th>' : "",
  ].join("")
  const itemColspan = 4 + (options.includeReturned ? 1 : 0) + (options.includeConsumedOpen ? 2 : 0)
  const rows = options.items.map((item) => `
    <tr>
      <td>${escapeHtml(dash(item.code))}</td>
      <td>${escapeHtml(item.description)}</td>
      <td class="num">${escapeHtml(dash(item.quantity))}</td>
      <td>${escapeHtml(dash(item.unit))}</td>
      ${options.includeReturned ? `<td class="num">${escapeHtml(dash(item.returnedQuantity))}</td>` : ""}
      ${options.includeConsumedOpen ? `<td class="num">${escapeHtml(dash(item.consumedQuantity))}</td><td class="num strong">${escapeHtml(dash(item.openQuantity))}</td>` : ""}
    </tr>
  `).join("")

  const title = options.title ?? `Remito ${options.documentNumber}`
  const metaFields = options.metaFields ?? []

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        html { background: #d8dde2; }
        body { margin: 0; color: #111827; font-family: "Arial Narrow", Arial, sans-serif; font-size: 11px; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 18px auto; background: #fff; padding: 12mm; box-shadow: 0 18px 42px rgba(15, 23, 42, .22); overflow: hidden; }
        .watermark { position: absolute; inset: 36% 0 auto; z-index: 0; text-align: center; font-size: 62px; font-weight: 900; letter-spacing: .18em; color: rgba(0, 87, 255, .055); transform: rotate(-14deg); pointer-events: none; }
        .content { position: relative; z-index: 1; }
        .top { display: grid; grid-template-columns: 1fr 30px 78mm; gap: 8px; align-items: stretch; }
        .box { border: 1.4px solid #0057ff; background: #fff; }
        .company { padding: 9px 10px 8px; min-height: 78px; }
        .wordmark { color: #0057ff; font-size: 27px; line-height: 1; font-weight: 900; letter-spacing: .08em; }
        .company p, .doc p { margin: 2px 0; }
        .muted { color: #475569; }
        .r-box { display: grid; place-items: center; color: #0057ff; font-size: 22px; font-weight: 900; }
        .doc { padding: 7px 9px; }
        .doc-title { display: flex; justify-content: space-between; gap: 10px; color: #0057ff; font-size: 20px; font-weight: 900; letter-spacing: .08em; }
        .doc-number { font-size: 14px; color: #111827; font-weight: 800; }
        .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 12px; margin-top: 6px; }
        .doc-grid span, .meta span { color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: .04em; }
        .doc-grid strong, .meta strong { display: block; color: #0f172a; font-size: 11px; }
        .section { margin-top: 8px; padding: 7px 8px; }
        .section-title { margin: 0 0 5px; color: #0057ff; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #0057ff; padding: 4px 5px; font-size: 10.5px; vertical-align: top; }
        th { background: #eaf4ff; color: #0f3d8f; font-weight: 800; text-align: left; text-transform: uppercase; letter-spacing: .03em; }
        td { height: 21px; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .strong { font-weight: 800; }
        .observations { min-height: 42px; white-space: pre-wrap; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 22mm; margin-top: 22mm; }
        .sign { border-top: 1.2px solid #0057ff; padding-top: 6px; text-align: center; font-size: 10px; font-weight: 800; }
        @media print {
          html, body { background: #fff; }
          .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
          th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <div class="watermark">DISTRICORR</div>
        <div class="content">
          <header class="top">
            <section class="box company">
              <div class="wordmark">DISTRICORR</div>
              <p class="muted">OSSUM COR · circuito quirúrgico operativo</p>
              <p>Razón social: —</p>
              <p>Domicilio comercial: —</p>
            </section>
            <section class="box r-box">R</section>
            <section class="box doc">
              <div class="doc-title"><span>REMITO</span><span>${escapeHtml(options.copyLabel ?? "Original")}</span></div>
              <p class="doc-number">Nº ${escapeHtml(options.documentNumber)}</p>
              <div class="doc-grid">
                ${metaRow("Fecha", options.issuedAt ?? options.createdAt)}
                ${metaRow("Estado", options.state)}
                ${metaRow("CUIT", "—")}
                ${metaRow("IIBB", "—")}
                ${metaRow("Inicio Act.", "—")}
                ${metaRow("Origen", options.origin)}
              </div>
            </section>
          </header>

          <section class="box section">
            <p class="section-title">Destinatario / Paciente / Expediente</p>
            <div class="meta">
              ${metaRow("Destinatario", options.destinationName)}
              ${metaRow("C.U.I.T. / DNI", options.cuitDni)}
              ${metaRow("Domicilio", options.address)}
              ${metaRow("Localidad", location)}
              ${metaRow("Cirugía", options.surgeryLabel)}
              ${metaRow("Paciente", options.patient)}
              ${metaRow("Institución", options.institution)}
              ${metaRow("Caja", options.boxId)}
              ${metaRow("Presupuesto", options.presupuestoId)}
              ${metaRow("ID interno", options.internalId)}
            </div>
          </section>

          <section class="section">
            <p class="section-title">Detalle de ítems</p>
            <table>
              <thead><tr>${itemColumns}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${itemColspan}">Sin ítems</td></tr>`}</tbody>
            </table>
          </section>

          <section class="box section observations">
            <p class="section-title">Observaciones</p>
            ${escapeHtml(dash(options.observations))}
            ${metaFields.length ? `<div class="meta" style="margin-top:8px">${metaFields.map((field) => metaRow(field.label, field.value)).join("")}</div>` : ""}
          </section>

          <footer class="footer">
            <div class="sign">ENTREGÓ</div>
            <div class="sign">FIRMA CONFORME:</div>
          </footer>
        </div>
      </main>
    </body>
  </html>`
}
