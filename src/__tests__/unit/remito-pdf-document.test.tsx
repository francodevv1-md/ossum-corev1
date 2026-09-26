import { describe, expect, it } from "vitest"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import { readFileSync } from "node:fs"
import path from "node:path"

import RemitoPDFDocument, { type RemitoPDFData } from "@/components/remitos/RemitoPDFDocument"
import { REMITO_DOCUMENT_THEME } from "@/lib/remito-document-theme"

const logoBuffer = readFileSync(path.join(process.cwd(), "public", "logos", REMITO_DOCUMENT_THEME.brand.logoFileName))
const LOGO_DATA_URL = `data:image/png;base64,${(logoBuffer as { toString(encoding: "base64"): string }).toString("base64")}`

const DATA: RemitoPDFData = {
  documentNumber: "R-0001",
  state: "Emitido",
  origin: "Manual",
  salidaReason: "Cirugía",
  branchLabel: "Casa central",
  surgeryLabel: "CX-0001",
  surgeryDate: "01/09/2026, 09:00",
  patient: "Paciente Prueba",
  doctor: "Dra. Médica",
  institution: "Hospital de prueba",
  client: "Cobertura",
  issuedAt: "11/08/2026, 10:00",
  deliveredAt: "—",
  returnedAt: "—",
  createdAt: "11/08/2026, 09:00",
  destinatario: { nombre: "Hospital de prueba", codigo: "H-01", cuitDni: "30-00000000-0" },
  direccion: { domicilio: "Calle 123", localidad: "Corrientes", provincia: "Corrientes" },
  transporte: { nombre: "Transporte propio" },
  packageCount: 2,
  declaredValue: "1000",
  items: [{
    sku: "SKU-01",
    description: "Instrumental quirúrgico",
    quantity: "2",
    unit: "unidad",
    lotNumber: "L-01",
    serialNumber: "S-01",
    returnedQuantity: "0",
  }],
  detailItems: [{
    groupLabel: "Caja / Fórmula 1",
    sku: "SKU-DETAIL",
    description: "Componente snapshot",
    quantity: "2",
    unit: "unidad",
    lotNumber: "L-DETAIL",
    serialNumber: "S-DETAIL",
    expirationDate: "01/01/2028",
    identifiedCode: "UNIT-001",
  }],
  observations: "Documento de prueba",
  qrDataUrl: null,
  logoDataUrl: LOGO_DATA_URL,
}

function collectText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(" ")
  if (React.isValidElement(node)) return collectText((node.props as { children?: React.ReactNode }).children)
  return ""
}

describe("RemitoPDFDocument", () => {
  it("renders a valid PDF buffer", async () => {
    const qrDataUrl = await QRCode.toDataURL("remito-test", { width: 240, margin: 1 })
    const buffer = await renderToBuffer(<RemitoPDFDocument data={{ ...DATA, qrDataUrl }} />)

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(1_000)
    expect(buffer.toString().match(/\/Type \/Page\b/g)).toHaveLength(2)
  })

  it("renders without an address using only registered font variants", async () => {
    const buffer = await renderToBuffer(<RemitoPDFDocument data={{ ...DATA, direccion: null }} />)
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
  })

  it("keeps summary and authoritative detail semantics on separate pages", () => {
    const document = RemitoPDFDocument({ data: { ...DATA, qrDataUrl: "data:image/png;base64,AA==" } })
    const pages = React.Children.toArray((document.props as { children: React.ReactNode }).children)
    const text = collectText(document)

    expect(pages).toHaveLength(2)
    expect(text).toMatch(/Ítems enviados \(\s*1\s*\)/)
    expect(text).toMatch(/Componentes emitidos · snapshot original \(\s*1\s*\)/)
    expect(text).toContain("01/01/2028")
    expect(text).toContain("UNIT-001")
    expect(text.match(/R-0001/g)?.length).toBeGreaterThanOrEqual(2)
    expect(text.match(/Verificar documento/g)).toHaveLength(2)
  })
})
