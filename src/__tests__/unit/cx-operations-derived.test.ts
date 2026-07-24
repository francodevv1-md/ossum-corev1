import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  deriveCxOperationsDisplay,
  type CxOperationsClosureSignals,
} from "@/lib/cx-operations-derived"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"

const noClosure: CxOperationsClosureSignals = {
  documentationIncomplete: false,
  consumptionAbsent: false,
  invoiceAbsent: false,
}

function buildCase(overrides: Partial<CoordinatorCase> = {}): CoordinatorCase {
  return {
    surgery: { coordinadorCx: "Coordinación", urgente: false } as CoordinatorCase["surgery"],
    history: [],
    bucket: null,
    subgroup: null,
    materialAvailabilityLabel: "Disponible",
    materialAvailabilityDefined: true,
    sla: { tone: "ok", label: "<24 hs", hoursElapsed: 1 },
    ...overrides,
  }
}

describe("deriveCxOperationsDisplay", () => {
  it("returns the exact unavailable fallbacks without an entry", () => {
    expect(deriveCxOperationsDisplay(null, noClosure)).toEqual({
      attentionReasons: [],
      nextActionLabel: "Acción derivada no disponible",
      responsibleAreaLabel: "Área derivada no disponible",
    })
  })

  it("prioritizes coordination incidents before material availability", () => {
    const entry = buildCase({
      materialAvailabilityDefined: false,
      sla: { tone: "overdue", label: ">=48 hs", hoursElapsed: 48 },
    })

    expect(deriveCxOperationsDisplay(entry, noClosure)).toMatchObject({
      attentionReasons: ["SLA vencido", "Sin disponibilidad"],
      nextActionLabel: "Resolver coordinación y fecha",
      responsibleAreaLabel: "Coordinación",
    })
  })

  it("maps material availability as rule 2", () => {
    expect(deriveCxOperationsDisplay(buildCase({ materialAvailabilityDefined: false }), noClosure)).toMatchObject({
      nextActionLabel: "Definir disponibilidad material",
      responsibleAreaLabel: "Preparación/Logística",
    })
  })

  it.each([
    [null, "Tomar y coordinar caso"],
    ["nueva-asignacion", "Tomar y coordinar caso"],
    ["pendiente-coordinar", "Coordinar fecha y material"],
    ["programada-sin-preparar", "Preparar y confirmar material"],
    ["congelada", "Preparar y confirmar material"],
    ["congelada-con-faltantes", "Preparar y confirmar material"],
  ] as const)("maps authorized subgroup %s", (subgroup, nextActionLabel) => {
    expect(deriveCxOperationsDisplay(buildCase({ bucket: "autorizado", subgroup }), noClosure)).toMatchObject({
      nextActionLabel,
      responsibleAreaLabel: nextActionLabel === "Preparar y confirmar material" ? "Preparación/Logística" : "Coordinación",
    })
  })

  it("lets urgency alone fall through to the applicable bucket action", () => {
    const entry = buildCase({
      surgery: { coordinadorCx: "Coordinación", urgente: true } as CoordinatorCase["surgery"],
      bucket: "autorizado",
      subgroup: "pendiente-coordinar",
    })

    expect(deriveCxOperationsDisplay(entry, noClosure)).toMatchObject({
      attentionReasons: ["Urgente"],
      nextActionLabel: "Coordinar fecha y material",
    })
  })

  it("maps transit as rule 6", () => {
    expect(deriveCxOperationsDisplay(buildCase({ bucket: "transito" }), noClosure)).toMatchObject({
      nextActionLabel: "Verificar logística y entrega",
      responsibleAreaLabel: "Preparación/Logística",
    })
  })

  it.each(["documentationIncomplete", "consumptionAbsent", "invoiceAbsent"] as const)(
    "uses the administrative closure action for finalized %s",
    (signal) => {
      expect(
        deriveCxOperationsDisplay(buildCase({ bucket: "finalizado" }), { ...noClosure, [signal]: true }),
      ).toMatchObject({
        nextActionLabel: "Completar cierre administrativo",
        responsibleAreaLabel: "Administración",
      })
    },
  )

  it("maps finalized complete cases as rule 8", () => {
    expect(deriveCxOperationsDisplay(buildCase({ bucket: "finalizado" }), noClosure)).toMatchObject({
      nextActionLabel: "Revisar cierre y documentación",
      responsibleAreaLabel: "Administración",
    })
  })

  it("uses the general follow-up action for a resolvable unmatched case", () => {
    expect(deriveCxOperationsDisplay(buildCase(), noClosure)).toMatchObject({
      nextActionLabel: "Revisar seguimiento del caso",
      responsibleAreaLabel: "Coordinación",
    })
  })

  it("contains no store, API, or persistence imports", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/cx-operations-derived.ts"), "utf8")
    expect(source).not.toMatch(/(?:@\/lib\/store|zustand|\/api\/|localStorage|fetch\()/)
  })
})
