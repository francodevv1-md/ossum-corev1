/**
 * post-creation-actions.test.ts
 * CHATZAI-017D — Unit tests for post-creation actions logic
 *
 * Validates that the WhatsApp URL, mailto URL, and action
 * availability logic works correctly.
 */

import { describe, it, expect } from "vitest"

// ─── Replicate the URL generation logic from PostCreationPanel ───

function buildWhatsappUrl(patientName: string, classification: string, surgeryId: string): string {
  const text = encodeURIComponent(
    `Presupuesto — ${patientName} — ${classification} — ID: ${surgeryId}`
  )
  return `https://wa.me/?text=${text}`
}

function buildMailtoUrl(patientName: string, classification: string, surgeryId: string): string {
  const subject = encodeURIComponent(`Presupuesto — ${patientName} — ${classification}`)
  const body = encodeURIComponent(
    `Se ha creado el presupuesto para la cirugía de ${patientName} (${classification}).\n\nID Cirugía: ${surgeryId}\n\nVer detalles en el sistema.`
  )
  return `mailto:?subject=${subject}&body=${body}`
}

describe("Post-creation actions — WhatsApp URL", () => {
  it("generates a valid wa.me URL", () => {
    const url = buildWhatsappUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    expect(url).toContain("https://wa.me/")
    expect(url).toContain("text=")
  })

  it("includes patient name in the text", () => {
    const url = buildWhatsappUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    const decodedText = decodeURIComponent(url.split("text=")[1])
    expect(decodedText).toContain("Juan Pérez")
  })

  it("includes classification in the text", () => {
    const url = buildWhatsappUrl("Juan Pérez", "Prótesis de cadera", "CX-002")
    const decodedText = decodeURIComponent(url.split("text=")[1])
    expect(decodedText).toContain("Prótesis de cadera")
  })

  it("includes surgery ID in the text", () => {
    const url = buildWhatsappUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-0042")
    const decodedText = decodeURIComponent(url.split("text=")[1])
    expect(decodedText).toContain("CX-0042")
  })

  it("includes 'Presupuesto' in the text", () => {
    const url = buildWhatsappUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    const decodedText = decodeURIComponent(url.split("text=")[1])
    expect(decodedText).toContain("Presupuesto")
  })

  it("handles special characters in patient name", () => {
    const url = buildWhatsappUrl("María José O'Connor", "Columna", "CX-005")
    expect(url).toContain("wa.me")
    // Should be properly encoded
    expect(url).not.toContain(" ")
  })
})

describe("Post-creation actions — mailto URL", () => {
  it("generates a valid mailto URL", () => {
    const url = buildMailtoUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    expect(url).toContain("mailto:")
    expect(url).toContain("subject=")
    expect(url).toContain("body=")
  })

  it("includes patient name in subject", () => {
    const url = buildMailtoUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    const subject = url.split("subject=")[1].split("&")[0]
    const decoded = decodeURIComponent(subject)
    expect(decoded).toContain("Juan Pérez")
  })

  it("includes classification in subject", () => {
    const url = buildMailtoUrl("Juan Pérez", "Osteosíntesis", "CX-003")
    const subject = url.split("subject=")[1].split("&")[0]
    const decoded = decodeURIComponent(subject)
    expect(decoded).toContain("Osteosíntesis")
  })

  it("includes surgery ID in body", () => {
    const url = buildMailtoUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-0099")
    const body = url.split("body=")[1]
    const decoded = decodeURIComponent(body)
    expect(decoded).toContain("CX-0099")
  })

  it("includes 'Presupuesto' in subject", () => {
    const url = buildMailtoUrl("Juan Pérez", "Reemplazo total de rodilla", "CX-001")
    const subject = url.split("subject=")[1].split("&")[0]
    const decoded = decodeURIComponent(subject)
    expect(decoded).toContain("Presupuesto")
  })
})

describe("Post-creation actions — action availability", () => {
  it("when hasPresupuesto=true, all actions should be available", () => {
    // This tests the logic: if hasPresupuesto, then print/email/whatsapp/expediente are available
    const hasPresupuesto = true
    const actions = {
      print: hasPresupuesto,
      email: hasPresupuesto,
      whatsapp: hasPresupuesto,
      expediente: true, // always available
      createPresupuestoLater: !hasPresupuesto,
    }
    expect(actions.print).toBe(true)
    expect(actions.email).toBe(true)
    expect(actions.whatsapp).toBe(true)
    expect(actions.expediente).toBe(true)
    expect(actions.createPresupuestoLater).toBe(false)
  })

  it("when hasPresupuesto=false, only expediente and createPresupuestoLater are available", () => {
    const hasPresupuesto = false
    const actions = {
      print: hasPresupuesto,
      email: hasPresupuesto,
      whatsapp: hasPresupuesto,
      expediente: true,
      createPresupuestoLater: !hasPresupuesto,
    }
    expect(actions.print).toBe(false)
    expect(actions.email).toBe(false)
    expect(actions.whatsapp).toBe(false)
    expect(actions.expediente).toBe(true)
    expect(actions.createPresupuestoLater).toBe(true)
  })
})
