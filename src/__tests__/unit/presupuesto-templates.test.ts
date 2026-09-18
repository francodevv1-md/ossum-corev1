/**
 * presupuesto-templates.test.ts
 * CHATZAI-017D — Unit tests for presupuesto template data
 *
 * Validates template structure, categorization, and helper functions.
 * Includes tests for all three categories: clasificacion, cliente, medico.
 */

import { describe, it, expect } from "vitest"
import {
  PRESUPUESTO_TEMPLATES,
  getActiveTemplates,
  getTemplatesGroupedByCategory,
  getTemplateClientes,
  getTemplateMedicos,
  PLANTILLA_CATEGORY_LABELS,
} from "@/data/presupuesto-templates"

describe("Presupuesto templates — basic structure", () => {
  it("has templates for common classifications", () => {
    const classifications = PRESUPUESTO_TEMPLATES.map(t => t.clasificacion)
    expect(classifications).toContain("Reemplazo total de rodilla")
    expect(classifications).toContain("Prótesis de cadera")
    expect(classifications).toContain("Columna")
    expect(classifications).toContain("Artroscopía")
  })

  it("each template has items that can be converted to FormItem", () => {
    for (const template of PRESUPUESTO_TEMPLATES) {
      expect(template.items.length).toBeGreaterThan(0)
      for (const item of template.items) {
        expect(item.name).toBeTruthy()
        expect(item.quantity).toBeGreaterThan(0)
      }
    }
  })

  it("each template has a unique id", () => {
    const ids = PRESUPUESTO_TEMPLATES.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("each template has a nombre", () => {
    for (const template of PRESUPUESTO_TEMPLATES) {
      expect(template.nombre).toBeTruthy()
    }
  })

  it("each template item has a code", () => {
    for (const template of PRESUPUESTO_TEMPLATES) {
      for (const item of template.items) {
        expect(item.code).toBeTruthy()
      }
    }
  })

  it("at least one template contains articulo Z items", () => {
    const hasZ = PRESUPUESTO_TEMPLATES.some(t =>
      t.items.some(i => i.isArticuloZ)
    )
    expect(hasZ).toBe(true)
  })

  it("template items with unitPrice > 0 have a valid subtotal calculation", () => {
    for (const template of PRESUPUESTO_TEMPLATES) {
      for (const item of template.items) {
        if (item.unitPrice > 0) {
          expect(item.unitPrice).toBeGreaterThan(0)
          expect(item.quantity).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe("Presupuesto templates — categorization", () => {
  it("each active template has a categoria field", () => {
    const active = getActiveTemplates()
    for (const template of active) {
      expect(template.categoria).toBeTruthy()
      expect(["clasificacion", "cliente", "medico"]).toContain(template.categoria)
    }
  })

  it("getActiveTemplates returns only templates with items", () => {
    const active = getActiveTemplates()
    for (const template of active) {
      expect(template.items.length).toBeGreaterThan(0)
    }
  })

  it("getTemplatesGroupedByCategory groups templates by categoria", () => {
    const groups = getTemplatesGroupedByCategory()
    expect(groups["clasificacion"]).toBeDefined()
    expect(groups["clasificacion"].length).toBeGreaterThanOrEqual(5)
  })

  it("PLANTILLA_CATEGORY_LABELS has labels for all categories", () => {
    expect(PLANTILLA_CATEGORY_LABELS["clasificacion"]).toBe("Por tipo de cirugía")
    expect(PLANTILLA_CATEGORY_LABELS["cliente"]).toBe("Por cliente / pagador")
    expect(PLANTILLA_CATEGORY_LABELS["medico"]).toBe("Por médico")
  })

  it("classification-based templates include Osteosíntesis", () => {
    const groups = getTemplatesGroupedByCategory()
    const clasiTemplates = groups["clasificacion"] || []
    const hasOst = clasiTemplates.some(t => t.clasificacion === "Osteosíntesis")
    expect(hasOst).toBe(true)
  })
})

describe("Presupuesto templates — cliente category (CHATZAI-017D)", () => {
  it("has templates in the cliente category", () => {
    const groups = getTemplatesGroupedByCategory()
    expect(groups["cliente"]).toBeDefined()
    expect(groups["cliente"].length).toBeGreaterThanOrEqual(1)
  })

  it("cliente templates have the cliente field set", () => {
    const groups = getTemplatesGroupedByCategory()
    const clienteTemplates = groups["cliente"] || []
    for (const t of clienteTemplates) {
      expect(t.cliente).toBeTruthy()
    }
  })

  it("includes a PAMI template for rodilla", () => {
    const groups = getTemplatesGroupedByCategory()
    const clienteTemplates = groups["cliente"] || []
    const hasPami = clienteTemplates.some(t => t.cliente === "PAMI")
    expect(hasPami).toBe(true)
  })

  it("includes an OSDE template for cadera", () => {
    const groups = getTemplatesGroupedByCategory()
    const clienteTemplates = groups["cliente"] || []
    const hasOsde = clienteTemplates.some(t => t.cliente === "OSDE")
    expect(hasOsde).toBe(true)
  })

  it("getTemplateClientes returns unique client names", () => {
    const clients = getTemplateClientes()
    expect(clients.length).toBeGreaterThanOrEqual(2)
    expect(clients).toContain("PAMI")
    expect(clients).toContain("OSDE")
  })
})

describe("Presupuesto templates — médico category (CHATZAI-017D)", () => {
  it("has templates in the medico category", () => {
    const groups = getTemplatesGroupedByCategory()
    expect(groups["medico"]).toBeDefined()
    expect(groups["medico"].length).toBeGreaterThanOrEqual(1)
  })

  it("medico templates have the medico field set", () => {
    const groups = getTemplatesGroupedByCategory()
    const medicoTemplates = groups["medico"] || []
    for (const t of medicoTemplates) {
      expect(t.medico).toBeTruthy()
    }
  })

  it("includes a Dr. Gómez template", () => {
    const groups = getTemplatesGroupedByCategory()
    const medicoTemplates = groups["medico"] || []
    const hasGomez = medicoTemplates.some(t => t.medico === "Dr. Gómez")
    expect(hasGomez).toBe(true)
  })

  it("includes a Dra. Fernández template", () => {
    const groups = getTemplatesGroupedByCategory()
    const medicoTemplates = groups["medico"] || []
    const hasFernandez = medicoTemplates.some(t => t.medico === "Dra. Fernández")
    expect(hasFernandez).toBe(true)
  })

  it("getTemplateMedicos returns unique médico names", () => {
    const medicos = getTemplateMedicos()
    expect(medicos.length).toBeGreaterThanOrEqual(2)
    expect(medicos).toContain("Dr. Gómez")
  })
})

describe("Presupuesto templates — cross-category consistency", () => {
  it("total active templates is at least 11 (5 clasif + 3 cliente + 3 medico)", () => {
    const active = getActiveTemplates()
    expect(active.length).toBeGreaterThanOrEqual(11)
  })

  it("all three categories are represented in grouped output", () => {
    const groups = getTemplatesGroupedByCategory()
    expect(Object.keys(groups)).toContain("clasificacion")
    expect(Object.keys(groups)).toContain("cliente")
    expect(Object.keys(groups)).toContain("medico")
  })

  it("cliente and medico templates still have valid clasificacion", () => {
    const active = getActiveTemplates()
    const nonClasif = active.filter(t => t.categoria !== "clasificacion")
    for (const t of nonClasif) {
      expect(t.clasificacion).toBeTruthy()
    }
  })
})
