import { renderToBuffer } from "@react-pdf/renderer"
import { describe, expect, it } from "vitest"

import SurgeryReportPDFDocument, { type SurgeryReportPDFData } from "@/components/coordinadores/SurgeryReportPDFDocument"

const DATA: SurgeryReportPDFData = {
  surgeryNumber: "CX-0012",
  patient: "Paciente de prueba",
  doctor: "Profesional de prueba",
  institution: "Institución de prueba",
  payer: "Cobertura de prueba",
  date: "30/08/2026, 10:00",
  status: "Programada",
  preparationStatus: "Preparada",
  coordinator: "Coordinación",
  classification: "Traumatología",
  description: "Procedimiento de prueba",
  observations: "Observación operativa",
  generatedAt: "30/08/2026, 09:00",
}

describe("SurgeryReportPDFDocument", () => {
  it("renders a valid operational report PDF", async () => {
    const buffer = await renderToBuffer(<SurgeryReportPDFDocument data={DATA} />)
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(1_000)
  })
})
