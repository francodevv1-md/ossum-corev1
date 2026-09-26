import { describe, expect, it } from "vitest"

import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"

describe("buildOperationalRemitoPrintHtml", () => {
  it("does not emit raw internal IDs into printable artifacts", () => {
    const html = buildOperationalRemitoPrintHtml({
      documentNumber: "R-0001",
      boxId: "raw-box-id",
      presupuestoId: "raw-presupuesto-id",
      items: [{ description: "Resumen seguro", boxId: "raw-item-id" }],
      detailItems: [{ description: "Detalle seguro", groupLabel: "raw-assignment-id" }],
    })

    expect(html).not.toContain("raw-remito-database-id")
    expect(html).not.toContain("ID interno")
    expect(html).not.toMatch(/raw-(box|presupuesto|item|assignment)-id/)
    expect(html).toContain("R-0001")
  })

  it("keeps the A4 print theme aligned with the emailed PDF", () => {
    const html = buildOperationalRemitoPrintHtml({
      documentNumber: "R-0001",
      observations: "Entregar en quirófano",
      items: [{ code: "SKU-1", description: "Instrumental", quantity: 1 }],
    })

    expect(html).toContain("Distribuidora Quirúrgica · OSSUM COR")
    expect(html).toContain("Remito de salida")
    expect(html.match(/districorr-document-logo\.png/g)).toHaveLength(2)
    expect(html).toContain('alt="Districorr"')
    expect(html).toContain("border-bottom: 2px solid #e2e8f0")
    expect(html).toContain("background: #f8fafc")
    expect(html).toContain("background: #fffbeb; border-color: #fde68a")
    expect(html).toContain('<div class="sign">Recibió conforme</div>')
    expect(html).toContain('<div class="sign">Fecha</div>')
  })

  it("renders the three labelled issued-remito codes without token or database fields", () => {
    const html = buildOperationalRemitoPrintHtml({
      documentNumber: "R-0001",
      items: [],
      printCodes: {
        remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
        internalQrDataUrl: "data:image/png;base64,INTERNAL",
        publicQrDataUrl: "data:image/png;base64,PUBLIC",
        code128Svg: '<svg aria-label="Code 128"></svg>',
        labels: { internal: "Internal OSSUM access", public: "Public verification" },
      },
    })

    expect(html).toContain("Uso interno OSSUM")
    expect(html).toContain("Verificar documento")
    expect(html).toContain("Identificación del remito")
    expect(html).toContain("RM1-04HM-ASW9-NF6Y-ZZPW-M")
    expect(html).toContain("width: 22mm; height: 22mm")
    expect(html).toContain("width: 54mm")
    expect(html).not.toMatch(/token|companyId|internalId/i)
  })

  it("prints linked surgery data and a consecutive detailed snapshot page in A4", () => {
    const html = buildOperationalRemitoPrintHtml({
      documentNumber: "R-0001",
      issuedAt: "13/08/2026 10:30",
      destinationName: "Hospital Perrando",
      client: "Cliente OS",
      surgeryLabel: "CX-0521",
      patient: "Paciente Prueba",
      doctor: "Dra. García",
      institution: "Hospital Perrando",
      surgeryDate: "14/08/2026 08:00",
      createdBy: "Admin DEV",
      metaFields: [{ label: "Depósito", value: "Central" }],
      items: [{ code: "RES-1", description: "Caja traumatología", quantity: 1, unit: "caja" }],
      detailItems: [{ code: "SKU-1", description: "Tornillo cortical 3.5", quantity: 2, unit: "un", lotNumber: "L-1", serialNumber: "S-1", expirationDate: "01/01/2028", identifiedCode: "UNIT-001", groupLabel: "Caja / Fórmula 1" }],
    })

    expect(html).toContain("Referencia quirúrgica")
    expect(html).toContain("Paciente Prueba")
    expect(html).toContain("Dra. García")
    expect(html).toContain('class="page detail-page"')
    expect(html).toContain("Resumen de material")
    expect(html).toContain("Componentes emitidos · snapshot original")
    expect(html).toContain("Caja traumatología")
    expect(html).toContain("Tornillo cortical 3.5")
    expect(html).toContain("L-1")
    expect(html).toContain("UNIT-001")
    expect(html).toContain("Caja / Fórmula 1")
  })

  it("renders an 80 mm thermal layout without dropping the three codes", () => {
    const html = buildOperationalRemitoPrintHtml({
      format: "thermal80",
      documentNumber: "R-0001",
      items: [],
      detailItems: [{ description: "SHOULD-NOT-PRINT-ON-THERMAL" }],
      printCodes: {
        remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
        internalQrDataUrl: "data:image/png;base64,INTERNAL",
        publicQrDataUrl: "data:image/png;base64,PUBLIC",
        code128Svg: '<svg aria-label="Code 128"></svg>',
        labels: { internal: "Internal OSSUM access", public: "Public verification" },
      },
    })

    expect(html).toContain("@page { size: 80mm auto; margin: 0 3.95mm")
    expect(html).toContain("Uso interno OSSUM")
    expect(html).toContain("Verificar documento")
    expect(html).toContain("RM1-04HM-ASW9-NF6Y-ZZPW-M")
    expect(html).toContain("width: 20mm; height: 20mm")
    expect(html).toContain("width: 52mm")
    expect(html).toContain("filter: grayscale(1) contrast(1.25)")
    expect(html).toContain("background: #fff !important")
    expect(html).toContain("color: #000 !important")
    expect(html).toContain("print-color-adjust: economy")
    expect(html).toContain("border-color: #000")
    expect(html).toContain("padding: 1.5px 2px")
    expect(html).toContain("body { width: 72.1mm")
    expect(html).toContain('font-family: "Courier New", monospace')
    expect(html).toContain('.page { width: 72.1mm; padding: 0; }')
    expect(html).toContain('.page::after { content: ""; display: block; height: 9mm; }')
    expect(html).toContain('window.addEventListener("load"')
    expect(html).toContain("requestAnimationFrame(() => requestAnimationFrame(() => window.print()))")
    expect(html).not.toContain('class="page detail-page"')
    expect(html).not.toContain("SHOULD-NOT-PRINT-ON-THERMAL")
  })
})
