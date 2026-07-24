import { describe, expect, it } from "vitest"

import {
  EMPTY_ADVANCED_FILTERS,
  buildAdvancedFilterChips,
  buildClientOptions,
  buildInstitutionOptions,
  coordinated,
  countActiveAdvancedFilters,
  countMetrics,
  filterCoordinationCases,
  hasFilterContradiction,
  inTransit,
  matchesAdvancedFilters,
  normalizeCoordinationBaseSnapshot,
  normalizeDateOnly,
  overdue,
  putDate,
  removeAdvancedFilter,
  validateAdvancedFilters,
  type AdvancedFilters,
  type CoordinationBaseSnapshot,
  type FilterIdentity,
  type MetricKey,
  type ResolvedCoordinatorCase,
} from "@/components/coordinadores/coordination-filtering"
import type { AssignmentSlaBasis, CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import type { Surgery } from "@/types"

const NOW = Date.parse("2026-07-20T12:00:00.000Z")

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "CX-1",
    backendId: "db-1",
    visibleNumber: "CX-1",
    patient: "Paciente",
    patientDni: "",
    surgeon: "Médico",
    institution: "Hospital Central",
    institutionCity: "",
    procedure: "",
    date: "",
    time: "",
    state: "Autorizada",
    client: "Cliente Uno",
    classification: "Otro",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: true,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    coordinadorContactId: "K1",
    coordinatorAssignmentState: "resolved",
    ...overrides,
  }
}

function makeCase(
  surgeryOverrides: Partial<Surgery> = {},
  caseOverrides: Partial<CoordinatorCase> = {},
): CoordinatorCase {
  return {
    surgery: makeSurgery(surgeryOverrides),
    history: [],
    bucket: "autorizado",
    subgroup: "pendiente-coordinar",
    materialAvailabilityDate: "2026-07-22",
    materialAvailabilityLabel: "22/07/2026",
    materialAvailabilityDefined: true,
    sla: { tone: "missing", label: "SLA sin base", hoursElapsed: null },
    ...caseOverrides,
  }
}

function basis(epochMs: number = NOW - 172_800_000): AssignmentSlaBasis {
  return {
    status: "valid",
    assignmentId: "A1",
    contactId: "K1",
    createdAt: new Date(epochMs).toISOString(),
    epochMs,
  }
}

function resolvedCase(
  surgeryOverrides: Partial<Surgery> = {},
  resolvedAssignmentSlaBasis: AssignmentSlaBasis = basis(),
  caseOverrides: Partial<CoordinatorCase> = {},
): ResolvedCoordinatorCase {
  return {
    ...makeCase(surgeryOverrides, caseOverrides),
    resolvedAssignmentSlaBasis,
  }
}

function filters(overrides: Partial<AdvancedFilters> = {}): AdvancedFilters {
  return {
    ...EMPTY_ADVANCED_FILTERS,
    surgeryDate: { ...EMPTY_ADVANCED_FILTERS.surgeryDate },
    availabilityDate: { ...EMPTY_ADVANCED_FILTERS.availabilityDate },
    ...overrides,
  }
}

function snapshot(cases: readonly ResolvedCoordinatorCase[], directMetricMemberships: ReadonlyMap<string, ReadonlySet<MetricKey>> = new Map()): CoordinationBaseSnapshot {
  return {
    contextKey: "ctx",
    evaluationNow: NOW,
    subjectContactId: "K1",
    cases,
    directMetricMemberships,
    counts: countMetrics(cases, NOW, directMetricMemberships),
    institutionOptions: buildInstitutionOptions(cases),
    clientOptions: buildClientOptions(cases),
    diagnostics: { assignmentSlaBasis: { missing: 0, invalid: 0, byCode: {} } },
  }
}

describe("accepted base snapshot", () => {
  it("forms only after a successful exact context and exact personal subject", () => {
    const entry = makeCase({
      coordinatorAssignments: [{
        assignmentId: "A1",
        contactId: "K1",
        label: "Subject",
        isPrimary: false,
        slaBasis: { status: "valid", createdAt: "2026-07-18T12:00:00.000Z", epochMs: NOW - 172_800_000 },
      }],
    })

    expect(normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: false,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "K1",
      cases: [entry],
      evaluationNow: NOW,
    })).toBeNull()
    expect(normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "new",
      acceptedContextKey: "old",
      subjectContactId: "K1",
      cases: [entry],
      evaluationNow: NOW,
    })).toBeNull()

    const accepted = normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "K1",
      cases: [entry],
      evaluationNow: NOW,
    })
    expect(accepted?.cases).toHaveLength(1)
    expect(accepted?.evaluationNow).toBe(NOW)
    expect(accepted?.cases[0].resolvedAssignmentSlaBasis).toMatchObject({ status: "valid", assignmentId: "A1" })
  })

  it("excludes wrong subject/final/ineligible cases and dedupes by backend id before hydrated id", () => {
    const entries = [
      makeCase({ id: "later", backendId: "same", patient: "Zeta" }),
      makeCase({ id: "earlier", backendId: "same", patient: "Alpha" }),
      makeCase({ id: "wrong", backendId: "wrong", coordinadorContactId: "K2" }),
      makeCase({ id: "final", backendId: "final", state: "Finalizada" }, { bucket: "finalizado" }),
      makeCase({ id: "none", backendId: "none", state: "Pendiente", autorizado: false }, { bucket: null }),
    ]

    const accepted = normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "K1",
      cases: entries,
      evaluationNow: NOW,
    })

    expect(accepted?.cases.map((entry) => entry.surgery.id)).toEqual(["earlier"])
  })

  it("excludes every client-representable ineligible lifecycle and assignment variant", () => {
    const entries = [
      makeCase({ id: "active", backendId: "active" }),
      makeCase({ id: "finalized", backendId: "finalized", state: "Finalizada" }),
      makeCase({ id: "performed", backendId: "performed", state: "Realizada" }),
      makeCase({ id: "cancelled", backendId: "cancelled", state: "Cancelada" }),
      makeCase({ id: "suspended", backendId: "suspended", state: "Suspendida" }),
      makeCase({ id: "unresolved", backendId: "unresolved", coordinatorAssignmentState: "none" }),
      makeCase({ id: "ambiguous", backendId: "ambiguous", coordinatorAssignmentState: "ambiguous" }),
      makeCase({ id: "different", backendId: "different", coordinadorContactId: "K2" }),
      makeCase({ id: "non-bucketed", backendId: "non-bucketed", state: "Pendiente", autorizado: false }),
    ]

    const accepted = normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "K1",
      cases: entries,
      evaluationNow: NOW,
    })

    expect(accepted?.cases.map((entry) => entry.surgery.id)).toEqual(["active"])
  })

  it("keeps missing/invalid SLA bases in the base and aggregates exact diagnostics", () => {
    const accepted = normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "K1",
      evaluationNow: NOW,
      cases: [
        makeCase({ id: "zero", backendId: "zero", coordinatorAssignments: [] }),
        makeCase({
          id: "invalid",
          backendId: "invalid",
          coordinatorAssignments: [{
            assignmentId: "A2",
            contactId: "K1",
            label: "Subject",
            isPrimary: false,
            slaBasis: { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
          }],
        }),
        makeCase({
          id: "duplicate",
          backendId: "duplicate",
          coordinatorAssignments: ["A3", "A4"].map((assignmentId) => ({
            assignmentId,
            contactId: "K1",
            label: "Subject",
            isPrimary: false,
            slaBasis: { status: "missing" as const, diagnosticCode: "assignment_created_at_missing" as const },
          })),
        }),
      ],
    })

    expect(accepted?.cases).toHaveLength(3)
    expect(accepted?.diagnostics.assignmentSlaBasis).toEqual({
      missing: 1,
      invalid: 2,
      byCode: {
        resolved_assignment_row_missing: 1,
        assignment_created_at_invalid: 1,
        multiple_resolved_assignment_rows: 1,
      },
    })
  })
})

describe("metric predicates and stable counts", () => {
  it("uses accepted direct A-H memberships without deriving extra E-H metrics", () => {
    const keys = ["A", "B", "C", "D", "E", "F", "G", "H"]
    const cases = keys.map((key) => resolvedCase({ id: key, backendId: key, date: key === "C" || key === "D" ? "2026-07-24" : "", state: key === "D" ? "En tránsito" : "Autorizada" }, basis(), { bucket: key === "D" ? "transito" : "autorizado" }))
    const memberships = new Map<string, ReadonlySet<MetricKey>>([
      ["A", new Set(["put-date", "overdue"])],
      ["B", new Set(["put-date"])],
      ["C", new Set(["coordinated"])],
      ["D", new Set(["coordinated", "in-transit"])],
      ["E", new Set()], ["F", new Set()], ["G", new Set()], ["H", new Set()],
    ])
    const accepted = snapshot(cases, memberships)
    expect(accepted.counts).toEqual({ "put-date": 2, overdue: 1, coordinated: 2, "in-transit": 1 })
    expect(filterCoordinationCases(accepted, new Set(["put-date", "overdue"]), filters()).map((entry) => entry.surgery.id)).toEqual(["A"])
    expect(filterCoordinationCases(accepted, new Set(["coordinated", "in-transit"]), filters()).map((entry) => entry.surgery.id)).toEqual(["D"])
    expect(filterCoordinationCases(accepted, new Set(["put-date", "coordinated"]), filters())).toEqual([])
  })
  it("implements the four exact predicates without generic SLA or logistics fallbacks", () => {
    const noDate = resolvedCase()
    const dated = resolvedCase({ id: "CX-2", backendId: "db-2", date: "2026-07-22" })
    const transit = resolvedCase({ id: "CX-3", backendId: "db-3", state: "En tránsito" }, basis(), { bucket: "transito" })
    const logisticsOnly = resolvedCase({ id: "CX-4", backendId: "db-4", state: "Autorizada", preparationState: "Enviado" })

    expect(putDate(noDate)).toBe(true)
    expect(coordinated(dated)).toBe(true)
    expect(inTransit(transit)).toBe(true)
    expect(inTransit(logisticsOnly)).toBe(false)
    expect(overdue(noDate, NOW)).toBe(true)
  })

  it("enforces future-safe exact 48-hour instant boundaries and valid basis only", () => {
    expect(overdue(resolvedCase({}, basis(NOW - 172_799_999)), NOW)).toBe(false)
    expect(overdue(resolvedCase({}, basis(NOW - 172_800_000)), NOW)).toBe(true)
    expect(overdue(resolvedCase({}, basis(NOW - 172_800_001)), NOW)).toBe(true)
    expect(overdue(resolvedCase({}, basis(NOW + 1)), NOW)).toBe(false)
    expect(overdue(resolvedCase({}, {
      status: "missing",
      contactId: "K1",
      diagnosticCode: "assignment_created_at_missing",
    }), NOW)).toBe(false)
    expect(overdue(resolvedCase({}, {
      status: "invalid",
      contactId: "K1",
      diagnosticCode: "assignment_created_at_invalid",
    }), NOW)).toBe(false)
    expect(overdue(resolvedCase({ date: "2026-07-22" }, basis(NOW - 999_999_999)), NOW)).toBe(false)
    expect(overdue(resolvedCase({}, {
      status: "valid",
      assignmentId: "offset",
      contactId: "K1",
      createdAt: "2026-07-18T09:00:00.000-03:00",
      epochMs: Date.parse("2026-07-18T09:00:00.000-03:00"),
    }), NOW)).toBe(true)
  })

  it("keeps counts stable while zero through four metrics use exact AND", () => {
    const cases = [
      resolvedCase({ id: "A", backendId: "A" }),
      resolvedCase({ id: "B", backendId: "B", date: "2026-07-22" }),
      resolvedCase({ id: "C", backendId: "C", state: "En tránsito" }, basis(NOW - 1), { bucket: "transito" }),
    ]
    const accepted = snapshot(cases)
    const counts = accepted.counts
    const selected = (...keys: MetricKey[]) => new Set<MetricKey>(keys)

    expect(filterCoordinationCases(accepted, selected(), filters())).toHaveLength(3)
    expect(filterCoordinationCases(accepted, selected("put-date"), filters()).map((entry) => entry.surgery.id)).toEqual(["A", "C"])
    expect(filterCoordinationCases(accepted, selected("put-date", "overdue"), filters()).map((entry) => entry.surgery.id)).toEqual(["A"])
    expect(filterCoordinationCases(accepted, selected("put-date", "overdue", "in-transit"), filters())).toEqual([])
    expect(filterCoordinationCases(accepted, selected("put-date", "overdue", "coordinated", "in-transit"), filters())).toEqual([])
    expect(accepted.counts).toBe(counts)
    expect(accepted.counts).toEqual({ "put-date": 2, overdue: 1, coordinated: 1, "in-transit": 1 })
  })
})

describe("advanced predicates, options, contradictions, and chips", () => {
  const id = (value: string, label: string): FilterIdentity => ({ kind: "id", value, label })

  it("validates Gregorian date-only values without Date/time-zone conversion", () => {
    expect(normalizeDateOnly("2024-02-29")).toBe("2024-02-29")
    expect(normalizeDateOnly("2026-02-29")).toBeNull()
    expect(normalizeDateOnly("2026-07-20T00:00:00Z")).toBeNull()
    expect(normalizeDateOnly("2026-13-01")).toBeNull()
  })

  it("matches NFKC CX substring, inclusive ranges, IDs, fallback labels, and exact state", () => {
    const entry = resolvedCase({
      visibleNumber: "ＣＸ-１０４２",
      date: "2026-07-22",
      institutionContactId: "I1",
      institution: "Hospital Central",
      clientContactId: undefined,
      client: "  Cliente   Uno ",
      state: "En tránsito",
    }, basis(), { bucket: "transito", materialAvailabilityDate: "2026-07-25" })

    expect(matchesAdvancedFilters(entry, filters({
      cx: "cx-104",
      surgeryDate: { from: "2026-07-22", to: "2026-07-22" },
      institution: id("I1", "Hospital Central"),
      client: { kind: "label-key", value: "cliente uno", label: "Cliente Uno" },
      availabilityDate: { from: "2026-07-24", to: "2026-07-25" },
      cxState: "En tránsito",
    }))).toBe(true)
    expect(matchesAdvancedFilters(entry, filters({ institution: id("I2", "Otro") }))).toBe(false)
    expect(matchesAdvancedFilters(entry, filters({ cxState: "Autorizada" }))).toBe(false)
  })

  it("excludes missing/invalid case dates from active ranges and validates reversed drafts", () => {
    expect(matchesAdvancedFilters(resolvedCase({ date: "" }), filters({
      surgeryDate: { from: "2026-07-20", to: "" },
    }))).toBe(false)
    expect(matchesAdvancedFilters(resolvedCase({}, basis(), { materialAvailabilityDate: "bad" }), filters({
      availabilityDate: { from: "", to: "2026-07-25" },
    }))).toBe(false)
    expect(validateAdvancedFilters(filters({
      surgeryDate: { from: "2026-07-22", to: "2026-07-20" },
      availabilityDate: { from: "bad", to: "" },
    }))).toEqual({
      surgeryDate: "La fecha desde no puede ser posterior a la fecha hasta.",
      availabilityDate: "Ingresá una fecha válida.",
    })
  })

  it("builds authorized ID-first deterministic deduplicated options without placeholders", () => {
    const cases = [
      resolvedCase({ id: "1", backendId: "1", institutionContactId: "I2", institution: "Zulu", clientContactId: undefined, client: "Beta" }),
      resolvedCase({ id: "2", backendId: "2", institutionContactId: "I1", institution: "Álamo", clientContactId: "C1", client: "Alpha" }),
      resolvedCase({ id: "3", backendId: "3", institutionContactId: "I1", institution: "Álamo", clientContactId: undefined, client: "Beta" }),
      resolvedCase({ id: "4", backendId: "4", institutionContactId: undefined, institution: "—", clientContactId: undefined, client: "Sin definir" }),
    ]

    expect(buildInstitutionOptions(cases)).toEqual([
      { kind: "id", value: "I1", label: "Álamo" },
      { kind: "id", value: "I2", label: "Zulu" },
    ])
    expect(buildClientOptions(cases)).toEqual([
      { kind: "id", value: "C1", label: "Alpha" },
      { kind: "label-key", value: "beta", label: "Beta" },
    ])
  })

  it("selects a canonical duplicate-identity label independently from case permutation", () => {
    const first = resolvedCase({ id: "1", backendId: "1", institutionContactId: "I1", institution: "Zulu Hospital" })
    const second = resolvedCase({ id: "2", backendId: "2", institutionContactId: "I1", institution: "Alpha Hospital" })
    const expected = [{ kind: "id", value: "I1", label: "Alpha Hospital" }]

    expect(buildInstitutionOptions([first, second])).toEqual(expected)
    expect(buildInstitutionOptions([second, first])).toEqual(expected)
  })

  it("matches inclusive one-sided and two-sided surgery and availability ranges", () => {
    const entry = resolvedCase({ date: "2026-07-22" }, basis(), { materialAvailabilityDate: "2026-07-25" })
    const scenarios: Array<[AdvancedFilters, boolean]> = [
      [filters({ surgeryDate: { from: "2026-07-22", to: "" } }), true],
      [filters({ surgeryDate: { from: "2026-07-23", to: "" } }), false],
      [filters({ surgeryDate: { from: "", to: "2026-07-22" } }), true],
      [filters({ surgeryDate: { from: "", to: "2026-07-21" } }), false],
      [filters({ surgeryDate: { from: "2026-07-20", to: "2026-07-22" } }), true],
      [filters({ availabilityDate: { from: "2026-07-25", to: "" } }), true],
      [filters({ availabilityDate: { from: "2026-07-26", to: "" } }), false],
      [filters({ availabilityDate: { from: "", to: "2026-07-25" } }), true],
      [filters({ availabilityDate: { from: "", to: "2026-07-24" } }), false],
      [filters({ availabilityDate: { from: "2026-07-24", to: "2026-07-25" } }), true],
    ]

    for (const [applied, expected] of scenarios) {
      expect(matchesAdvancedFilters(entry, applied)).toBe(expected)
    }
  })

  it("detects definition-level contradictions independently from current rows", () => {
    expect(hasFilterContradiction(new Set(["put-date", "coordinated"]), filters())).toBe(true)
    expect(hasFilterContradiction(new Set(["overdue", "coordinated"]), filters())).toBe(true)
    expect(hasFilterContradiction(new Set(["put-date"]), filters({ surgeryDate: { from: "2026-07-20", to: "" } }))).toBe(true)
    expect(hasFilterContradiction(new Set(["overdue"]), filters({ surgeryDate: { from: "", to: "2026-07-22" } }))).toBe(true)
    expect(hasFilterContradiction(new Set(["coordinated"]), filters({ surgeryDate: { from: "2026-07-20", to: "" } }))).toBe(false)
  })

  it("counts maximum six logical values, emits one chip per field/range, and removes independently", () => {
    const applied = filters({
      cx: "1042",
      surgeryDate: { from: "2026-07-20", to: "2026-07-22" },
      institution: id("I1", "Hospital Central"),
      client: id("C1", "Cliente Uno"),
      availabilityDate: { from: "2026-07-24", to: "" },
      cxState: "En tránsito",
    })

    expect(countActiveAdvancedFilters(applied)).toBe(6)
    expect(buildAdvancedFilterChips(applied)).toHaveLength(6)
    expect(buildAdvancedFilterChips(applied).find((chip) => chip.key === "institution")).toEqual({
      key: "institution",
      label: "Institución: Hospital Central",
      removeLabel: "Quitar filtro Institución: Hospital Central",
    })
    const withoutRange = removeAdvancedFilter(applied, "surgeryDate")
    expect(withoutRange.surgeryDate).toEqual({ from: "", to: "" })
    expect(withoutRange.institution).toEqual(applied.institution)
    expect(countActiveAdvancedFilters(withoutRange)).toBe(5)
  })

  it("removes every logical advanced field independently, including both bounds of each range", () => {
    const applied = filters({
      cx: "1042",
      surgeryDate: { from: "2026-07-20", to: "2026-07-22" },
      institution: id("I1", "Hospital Central"),
      client: id("C1", "Cliente Uno"),
      availabilityDate: { from: "2026-07-24", to: "2026-07-25" },
      cxState: "En tránsito",
    })
    const expectedCleared: Record<string, unknown> = {
      cx: "",
      surgeryDate: { from: "", to: "" },
      institution: null,
      client: null,
      availabilityDate: { from: "", to: "" },
      cxState: "",
    }

    for (const key of ["cx", "surgeryDate", "institution", "client", "availabilityDate", "cxState"] as const) {
      const removed = removeAdvancedFilter(applied, key)
      expect(removed[key]).toEqual(expectedCleared[key])
      expect(countActiveAdvancedFilters(removed)).toBe(5)
      for (const preservedKey of ["cx", "surgeryDate", "institution", "client", "availabilityDate", "cxState"] as const) {
        if (preservedKey !== key) expect(removed[preservedKey]).toEqual(applied[preservedKey])
      }
    }
  })

  it("preserves snapshot metric counts while advanced filters change result membership", () => {
    const cases = [
      resolvedCase({ id: "A", backendId: "A", visibleNumber: "CX-100", institutionContactId: "I1", clientContactId: "C1" }),
      resolvedCase({ id: "B", backendId: "B", visibleNumber: "CX-200", institutionContactId: "I2", clientContactId: "C2" }),
    ]
    const accepted = snapshot(cases)
    const originalCounts = accepted.counts
    const interactions = [
      filters(),
      filters({ cx: "100" }),
      filters({ institution: id("I2", "Hospital Central") }),
      filters({ availabilityDate: { from: "2026-07-23", to: "" } }),
      removeAdvancedFilter(filters({ cx: "100", client: id("C1", "Cliente Uno") }), "cx"),
    ]

    expect(interactions.map((applied) => filterCoordinationCases(accepted, new Set(), applied).length)).toEqual([2, 1, 1, 0, 1])
    expect(accepted.counts).toBe(originalCounts)
    expect(accepted.counts).toEqual({ "put-date": 2, overdue: 2, coordinated: 0, "in-transit": 0 })
  })

  it("applies metrics and every advanced predicate conjunctively without duplicating rows", () => {
    const entry = resolvedCase({
      id: "only",
      backendId: "only",
      visibleNumber: "CX-1042",
      institutionContactId: "I1",
      clientContactId: "C1",
    })
    const accepted = snapshot([entry])
    const applied = filters({ cx: "104", institution: id("I1", "Hospital Central"), client: id("C1", "Cliente Uno") })

    expect(filterCoordinationCases(accepted, new Set(["put-date", "overdue"]), applied)).toEqual([entry])
    expect(filterCoordinationCases(accepted, new Set(["put-date", "overdue"]), { ...applied, cx: "no-match" })).toEqual([])
  })
})
