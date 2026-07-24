import { afterEach, describe, expect, it, vi } from "vitest"
import {
  filterCoordinatorCasesByContactId,
  getCoordinatorCardAlertDisplay,
  getCoordinatorCardMetadata,
  getCoordinatorBucket,
  getCoordinatorLabel,
  getResolvedAssignmentSlaBasis,
  getIncidentReasons,
  getSlaDisplayLabel,
  getSlaMeta,
  getPendingClosureItems,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import type { Box, LogisticsDetail, Surgery } from "@/types"

const surgery = (overrides: Partial<Surgery>): Surgery => ({
  id: "cx-1",
  patient: "Paciente",
  state: "Pendiente",
  preparationState: "Sin preparar",
  autorizado: true,
  ...overrides,
} as Surgery)

describe("getCoordinatorBucket", () => {
  it("derives pending coordination separately from preparation", () => {
    expect(getCoordinatorBucket(surgery({ preparationState: "En preparación" }))).toBe("autorizado")
  })

  it.each(["Entregado", "Enviado"] as const)("does not derive transit from the %s preparation label", (preparationState) => {
    expect(getCoordinatorBucket(surgery({ preparationState }))).toBe("autorizado")
  })

  it("does not derive finalization from the Retirado preparation label", () => {
    expect(getCoordinatorBucket(surgery({ preparationState: "Retirado" }))).toBe("autorizado")
  })

  it.each([
    ["no operational signal", {}, undefined, undefined],
    ["surgery preparation", { preparationState: "Sin preparar" }, undefined, undefined],
    ["logistics preparation", {}, { preparation: "Sin preparar" }, undefined],
    ["logistics outbound status", {}, { ida: "Sin preparar" }, undefined],
    ["logistics box status", {}, { cajaState: "Sin preparar" }, undefined],
    ["box status", {}, undefined, { state: "Sin preparar" }],
  ] as const)("keeps an unauthorised pending CX out of buckets despite %s", (_signal, surgeryOverrides, logistics, box) => {
    expect(
      getCoordinatorBucket(
        surgery({ date: "2026-07-20", autorizado: false, preparationState: undefined, ...surgeryOverrides }),
        logistics as LogisticsDetail | undefined,
        box as Box | undefined,
      ),
    ).toBeNull()
  })

  it("derives transit only from the explicit general CX state", () => {
    expect(getCoordinatorBucket(surgery({ state: "En tránsito", preparationState: "Sin preparar" }))).toBe("transito")
  })

  it("derives finalization only from the Finalizada general CX state", () => {
    expect(getCoordinatorBucket(surgery({ state: "Finalizada", preparationState: "Sin preparar" }))).toBe("finalizado")
  })
})

describe("coordinator contact identity", () => {
  it("filters personal rows by resolved contact id instead of display label", () => {
    const entries = ["contact-1", "contact-2"].map((contactId) => ({
      surgery: surgery({ coordinadorContactId: contactId, coordinadorCx: "Nombre repetido", coordinatorAssignmentState: "resolved" }),
      history: [],
      bucket: "autorizado",
      subgroup: "pendiente-coordinar",
      materialAvailabilityDefined: true,
      materialAvailabilityLabel: "16/07/2026",
      sla: { tone: "ok", label: "<24 hs", hoursElapsed: 2 },
    } as CoordinatorCase))

    expect(filterCoordinatorCasesByContactId(entries, "contact-2").map((entry) => entry.surgery.coordinadorContactId)).toEqual(["contact-2"])
  })

  it("shows ambiguous assignment explicitly without selecting a candidate", () => {
    const ambiguous = surgery({ coordinatorAssignmentState: "ambiguous", coordinadorCx: "Nombre heredado" })
    expect(getCoordinatorLabel(ambiguous)).toBe("Asignación ambigua")
    expect(filterCoordinatorCasesByContactId([{ surgery: ambiguous } as CoordinatorCase], "contact-1")).toEqual([])
  })

  it("associates SLA basis only with the exact resolved subject assignment id", () => {
    const resolved = getResolvedAssignmentSlaBasis(surgery({
      coordinatorAssignments: [
        {
          assignmentId: "other",
          contactId: "contact-2",
          label: "Other",
          isPrimary: true,
          slaBasis: { status: "valid", createdAt: "2026-07-01T10:00:00.000Z", epochMs: 1 },
        },
        {
          assignmentId: "exact",
          contactId: "contact-1",
          label: "Exact",
          isPrimary: false,
          slaBasis: { status: "valid", createdAt: "2026-07-02T10:00:00.000Z", epochMs: 2 },
        },
      ],
    }), "contact-1")

    expect(resolved).toEqual({
      status: "valid",
      assignmentId: "exact",
      contactId: "contact-1",
      createdAt: "2026-07-02T10:00:00.000Z",
      epochMs: 2,
    })
  })

  it("keeps missing, invalid, zero-row, and duplicate-row bases diagnosable", () => {
    const basis = (coordinatorAssignments: Surgery["coordinatorAssignments"]) =>
      getResolvedAssignmentSlaBasis(surgery({ coordinatorAssignments }), "contact-1")

    expect(basis([])).toMatchObject({ status: "missing", diagnosticCode: "resolved_assignment_row_missing" })
    expect(basis([{
      assignmentId: "missing",
      contactId: "contact-1",
      label: "Exact",
      isPrimary: false,
      slaBasis: { status: "missing", diagnosticCode: "assignment_created_at_missing" },
    }])).toMatchObject({ status: "missing", assignmentId: "missing", diagnosticCode: "assignment_created_at_missing" })
    expect(basis([{
      assignmentId: "invalid",
      contactId: "contact-1",
      label: "Exact",
      isPrimary: false,
      slaBasis: { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
    }])).toMatchObject({ status: "invalid", assignmentId: "invalid", diagnosticCode: "assignment_created_at_invalid" })
    expect(basis([
      {
        assignmentId: "first",
        contactId: "contact-1",
        label: "Exact",
        isPrimary: true,
        slaBasis: { status: "valid", createdAt: "2026-07-01T10:00:00.000Z", epochMs: 1 },
      },
      {
        assignmentId: "second",
        contactId: "contact-1",
        label: "Exact",
        isPrimary: false,
        slaBasis: { status: "valid", createdAt: "2026-07-02T10:00:00.000Z", epochMs: 2 },
      },
    ])).toMatchObject({ status: "invalid", diagnosticCode: "multiple_resolved_assignment_rows" })
  })
})

describe("compact coordinator card presentation", () => {
  it("derives concise metadata and prioritizes payer aliases", () => {
    expect(getCoordinatorCardMetadata(surgery({
      date: "2026-07-20",
      time: "08:15",
      surgeon: "Dra. Álvarez",
      institution: "Hospital Central",
      client: "Cliente legado",
      obraSocial: "Obra Social",
      financiador: "Pagador principal",
    }))).toEqual({
      date: "20/07/2026 · 08:15",
      doctor: "Dra. Álvarez",
      place: "Hospital Central",
      client: "Pagador principal",
    })
  })

  it("returns exact fallbacks and omits time when the date is absent", () => {
    expect(getCoordinatorCardMetadata(surgery({ date: "", time: "08:15", surgeon: "", institution: "", client: "", obraSocial: "", financiador: "" }))).toEqual({
      date: "Sin fecha",
      doctor: "Médico sin definir",
      place: "Lugar sin definir",
      client: "Cliente sin definir",
    })
  })

  it("keeps only the highest-priority risk visible", () => {
    const entry = {
      surgery: surgery({ urgente: true, coordinadorCx: "" }),
      materialAvailabilityDefined: false,
      sla: { tone: "overdue", label: ">=48 hs", hoursElapsed: 50 },
    } as CoordinatorCase
    expect(getCoordinatorCardAlertDisplay(entry)).toEqual({
      highestPriorityRisk: "SLA vencido",
      hiddenAlerts: ["Sin asignar", "Sin disponibilidad", "Urgente"],
    })
  })

  it("counts canonical missing closure items without inventing status", () => {
    expect(getPendingClosureItems({ documentationIncomplete: true, consumptionAbsent: false, invoiceAbsent: true })).toEqual(["Documentación", "Facturación"])
  })
})

describe("48-hour presentation labels", () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [23, "ok", "Dentro de las 48 h"],
    [24, "warning", "Quedan menos de 24 h"],
    [47, "warning", "Quedan menos de 24 h"],
    [48, "overdue", "Fuera de las 48 h"],
  ] as const)("maps %i elapsed hours without changing thresholds", (hours, tone, label) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"))
    const baseDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const sla = getSlaMeta(baseDate)
    expect(sla.tone).toBe(tone)
    expect(sla.hoursElapsed).toBe(hours)
    expect(getSlaDisplayLabel(sla.tone)).toBe(label)
  })

  it("presents a concise no-reference state", () => {
    const sla = getSlaMeta(undefined)
    expect(sla.tone).toBe("missing")
    expect(getSlaDisplayLabel(sla.tone)).toBe("Sin referencia de 48 h")
  })

  it("preserves downstream incident reason strings", () => {
    const entry = {
      surgery: surgery({ coordinadorCx: "Nelson" }),
      history: [],
      bucket: "autorizado",
      subgroup: "pendiente-coordinar",
      materialAvailabilityDefined: true,
      materialAvailabilityLabel: "16/07/2026",
      sla: { tone: "overdue", label: ">=48 hs", hoursElapsed: 48 },
    } as CoordinatorCase

    expect(getIncidentReasons(entry)).toContain("SLA vencido")
    expect(getIncidentReasons({ ...entry, sla: { ...entry.sla, tone: "warning" } })).toContain("Próxima a vencer")
  })
})
