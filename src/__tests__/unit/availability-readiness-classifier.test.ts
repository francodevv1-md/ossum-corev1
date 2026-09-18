import { describe, expect, it } from "vitest"

// @ts-expect-error -- Vite resolves raw modules during the focused test run.
import classifierSource from "@/lib/services/availability-readiness-classifier.ts?raw"
// @ts-expect-error -- Vite resolves raw modules during the focused test run.
import facadeSource from "../../../scripts/dev/report-availability-readiness.ts?raw"
// @ts-expect-error -- Vite resolves raw modules during the focused test run.
import testSource from "./availability-readiness-classifier.test.ts?raw"

import {
  CREATOR_DIAGNOSTICS,
  DATE_FIELDS,
  DATE_FORMATS,
  PIVOT_DIAGNOSTICS,
  SCHEMA_DIAGNOSTICS,
  SOURCE_KINDS,
  availabilityReadinessClassifierInputSchema,
  availabilityReadinessClassifierResultSchema,
  availabilityReadinessReportOutputSchema,
  availabilityReadinessReportSchema,
  classifyAvailabilityReadiness,
  serializeAvailabilityReadinessReport,
} from "@/lib/services/availability-readiness-classifier"

import { createAvailabilityReadinessReport } from "../../../scripts/dev/report-availability-readiness"

type Source = Parameters<typeof classifyAvailabilityReadiness>[0] extends { sources: infer S }
  ? S
  : never

const user = (pk: string, userId: string, active = true) => ({
  sourceKind: "USER_ROW" as const,
  immutableSourcePrimaryKey: pk,
  payload: { userId, active },
})
const access = (pk: string, userId: string, companyId = "company-1", active = true) => ({
  sourceKind: "USER_COMPANY_ACCESS_ROW" as const,
  immutableSourcePrimaryKey: pk,
  payload: { userId, companyId, active },
})
const event = (
  pk: string,
  overrides: Partial<{
    companyId: string
    entityType: string
    entityId: string
    action: string
    userId: string | null
  }> = {}
) => ({
  sourceKind: "AUDIT_EVENT_SURGERY_CREATED" as const,
  immutableSourcePrimaryKey: pk,
  payload: {
    companyId: "company-1",
    entityType: "SURGERY",
    entityId: "surgery-1",
    action: "CREATED",
    userId: "user-1",
    ...overrides,
  },
})
const pivot = (
  pk: string,
  overrides: Partial<{ userId: string; companyId: string; role: string }> = {}
) => ({
  sourceKind: "PIVOT_DESIGNATION_ROW" as const,
  immutableSourcePrimaryKey: pk,
  payload: { userId: "user-1", companyId: "company-1", role: "COORDINATOR", ...overrides },
})
const baseline = (pk: string, matches = true, malformed = false) => ({
  sourceKind: "SCHEMA_BASELINE_ATTESTATION" as const,
  immutableSourcePrimaryKey: pk,
  payload: { matches, malformed },
})
const cajas = (pk: string, present = true, malformed = false) => ({
  sourceKind: "SCHEMA_CAJAS_ANCHOR_ATTESTATION" as const,
  immutableSourcePrimaryKey: pk,
  payload: { present, malformed },
})
const collision = (pk: string, hasCollision = false, malformed = false) => ({
  sourceKind: "SCHEMA_AVAILABILITY_COLLISION_ATTESTATION" as const,
  immutableSourcePrimaryKey: pk,
  payload: { collision: hasCollision, malformed },
})
const surgery = (
  pk: string,
  overrides: Partial<{
    probableDate: null | string | number | boolean
    scheduledDate: null | string | number | boolean
    surgeryDate: null | string | number | boolean
    performedDate: null | string | number | boolean
    cancelledDate: null | string | number | boolean
  }> = {}
) => ({
  sourceKind: "SURGERY_ROW" as const,
  immutableSourcePrimaryKey: pk,
  payload: {
    probableDate: null,
    scheduledDate: null,
    surgeryDate: null,
    performedDate: null,
    cancelledDate: null,
    ...overrides,
  },
})

const dateFieldProperties = {
  SURGERY_PROBABLE_DATE: "probableDate",
  SURGERY_SCHEDULED_DATE: "scheduledDate",
  SURGERY_SURGERY_DATE: "surgeryDate",
  SURGERY_PERFORMED_DATE: "performedDate",
  SURGERY_CANCELLED_DATE: "cancelledDate",
} as const

const dateFormatValues = {
  NULL: null,
  DATE_YYYY_MM_DD: "2042-11-09",
  UTC_RFC3339_MILLISECONDS: "2042-11-09T08:07:06.005Z",
  OTHER_STRING: "private-unrecognized-date",
  NON_STRING: 424242,
} as const

function input(sources: unknown[]) {
  return {
    expectedCompanyId: "company-1",
    expectedEntityId: "surgery-1",
    expectedCreatorAction: "CREATED",
    expectedPivotRole: "COORDINATOR",
    sources,
  }
}

function typedInput(sources: unknown[]) {
  return availabilityReadinessClassifierInputSchema.parse(input(sources))
}

function readySources() {
  return [
    user("user-pk", "user-1"),
    access("access-pk", "user-1"),
    event("event-pk"),
    pivot("pivot-pk"),
    baseline("baseline-pk"),
    cajas("cajas-pk"),
    collision("collision-pk"),
  ]
}

describe("availability readiness schemas", () => {
  it("exports closed inventories and rejects unknown keys at every input level", () => {
    expect(SOURCE_KINDS).toHaveLength(8)
    expect(CREATOR_DIAGNOSTICS).toHaveLength(7)
    expect(PIVOT_DIAGNOSTICS).toHaveLength(5)
    expect(SCHEMA_DIAGNOSTICS).toHaveLength(4)
    expect(DATE_FIELDS).toHaveLength(5)
    expect(DATE_FORMATS).toEqual([
      "NULL",
      "DATE_YYYY_MM_DD",
      "UTC_RFC3339_MILLISECONDS",
      "OTHER_STRING",
      "NON_STRING",
    ])

    expect(() => availabilityReadinessClassifierInputSchema.parse({ ...input([]), extra: true })).toThrow()
    expect(() =>
      availabilityReadinessClassifierInputSchema.parse(
        input([{ ...user("pk", "user-1"), extra: true }])
      )
    ).toThrow()
    expect(() =>
      availabilityReadinessClassifierInputSchema.parse(
        input([{ ...user("pk", "user-1"), payload: { userId: "user-1", active: true, extra: true } }])
      )
    ).toThrow()
    expect(() =>
      availabilityReadinessClassifierResultSchema.parse({
        ...classifyAvailabilityReadiness(input(readySources())),
        extra: true,
      })
    ).toThrow()
  })
})

describe("creator classification", () => {
  it("classifies zero, exactly one and multiple accepted events by count only", () => {
    const base = readySources()
    expect(classifyAvailabilityReadiness(input(base.filter((source) => source.sourceKind !== "AUDIT_EVENT_SURGERY_CREATED"))).creator.primary).toBe("ZERO_ACCEPTED_EVENTS")
    expect(classifyAvailabilityReadiness(input(base)).creator).toMatchObject({
      primary: "EXACT_ONE_ACCEPTED_EVENT",
      acceptedCount: 1,
      diagnostics: [],
      ready: true,
    })
    expect(classifyAvailabilityReadiness(input([...base, event("event-pk-2")])).creator).toMatchObject({
      primary: "MULTIPLE_ACCEPTED_EVENTS",
      acceptedCount: 2,
      ready: false,
    })
  })

  it("collects overlapping rejected-fact diagnostics, sorted and deduplicated", () => {
    const sources = [
      ...readySources().filter((source) => source.sourceKind !== "AUDIT_EVENT_SURGERY_CREATED"),
      event("bad-1", {
        companyId: "wrong",
        entityType: "CONTACT",
        entityId: "wrong",
        action: "UPDATED",
        userId: null,
      }),
      event("bad-2", { companyId: "wrong", userId: "bad id" }),
      event("bad-3", { userId: "unknown-user" }),
    ]
    expect(classifyAvailabilityReadiness(input(sources)).creator).toEqual({
      primary: "ZERO_ACCEPTED_EVENTS",
      acceptedCount: 0,
      diagnostics: [
        "USER_ID_MALFORMED",
        "USER_ID_MISSING",
        "USER_NOT_FOUND",
        "WRONG_ACTION",
        "WRONG_COMPANY",
        "WRONG_ENTITY_ID",
        "WRONG_ENTITY_TYPE",
      ],
      ready: false,
    })
  })
})

describe("pivot and schema readiness", () => {
  it("classifies all pivot primaries without fallback", () => {
    const base = readySources()
    expect(classifyAvailabilityReadiness(input(base)).pivot.primary).toBe("EXACT_ONE_DESIGNATION")
    expect(classifyAvailabilityReadiness(input(base.filter((source) => source.sourceKind !== "PIVOT_DESIGNATION_ROW"))).pivot.primary).toBe("ZERO_DESIGNATIONS")
    expect(classifyAvailabilityReadiness(input([...base, pivot("pivot-pk-2")])).pivot.primary).toBe("MULTIPLE_DESIGNATIONS")
  })

  it("emits every pivot diagnostic for malformed and overlapping failures", () => {
    const sources = [
      ...readySources().filter((source) => !["PIVOT_DESIGNATION_ROW", "USER_ROW", "USER_COMPANY_ACCESS_ROW"].includes(source.sourceKind)),
      user("inactive-user-pk", "bad id", false),
      access("inactive-access-pk", "bad id", "company-1", false),
      pivot("bad-pivot", { userId: "bad id", companyId: "wrong", role: "VIEWER" }),
    ]
    expect(classifyAvailabilityReadiness(input(sources)).pivot).toEqual({
      primary: "ZERO_DESIGNATIONS",
      acceptedCount: 0,
      diagnostics: ["INACTIVE_ACCESS", "INACTIVE_USER", "MALFORMED", "WRONG_COMPANY", "WRONG_ROLE"],
      ready: false,
    })
  })

  it("classifies exclusive schema primaries and all closed diagnostics", () => {
    const withoutSchema = readySources().filter((source) => !source.sourceKind.startsWith("SCHEMA_"))
    expect(classifyAvailabilityReadiness(input(withoutSchema)).schemaReadiness).toMatchObject({
      primary: "NOT_ATTESTED",
      diagnostics: ["CAJAS_ANCHOR_MISSING"],
    })

    const malformed = [
      ...withoutSchema,
      baseline("baseline-1", false, true),
      baseline("baseline-2", true),
      cajas("cajas-1", false),
      collision("collision-1", true),
    ]
    expect(classifyAvailabilityReadiness(input(malformed)).schemaReadiness).toEqual({
      primary: "ATTESTED_MISMATCH",
      acceptedCount: 0,
      diagnostics: [
        "ATTESTATION_MALFORMED",
        "AVAILABILITY_OBJECT_COLLISION",
        "CAJAS_ANCHOR_MISSING",
        "DEPLOYED_BASELINE_DRIFT",
      ],
      ready: false,
    })
    expect(classifyAvailabilityReadiness(input(readySources())).schemaReadiness.primary).toBe("ATTESTED_MATCH")
  })
})

describe("source identity partitioning", () => {
  it("deduplicates same identity and payload as transport copies", () => {
    const sources = readySources()
    const duplicate = { ...event("event-pk"), payload: { ...event("event-pk").payload } }
    const result = classifyAvailabilityReadiness(input([...sources, duplicate]))
    expect(result.creator.acceptedCount).toBe(1)
    expect(result.sourceIntegrity).toEqual({
      rawInputCount: 8,
      uniqueConsistentFactCount: 7,
      identicalTransportCopyCount: 1,
      conflictingTransportCopyCount: 0,
      sourceIdentityPayloadConflictCount: 0,
      diagnostics: [],
      conflictLabels: [],
      reconciled: true,
    })
  })

  it("fails closed and counts every copy when one identity has multiple payload variants", () => {
    const sources = readySources()
    const conflictCopies = [
      event("event-pk", { action: "UPDATED" }),
      event("event-pk", { action: "DELETED" }),
    ]
    const result = classifyAvailabilityReadiness(input([...sources, ...conflictCopies]))
    expect(result.creator).toMatchObject({ primary: "ZERO_ACCEPTED_EVENTS", acceptedCount: 0, ready: false })
    expect(result.sourceIntegrity).toMatchObject({
      rawInputCount: 9,
      uniqueConsistentFactCount: 6,
      identicalTransportCopyCount: 0,
      conflictingTransportCopyCount: 3,
      sourceIdentityPayloadConflictCount: 1,
      diagnostics: ["SOURCE_IDENTITY_PAYLOAD_CONFLICT"],
      conflictLabels: ["EXC-000001"],
      reconciled: true,
    })
    expect(result.ready).toBe(false)
  })

  it("keeps distinct primary keys as distinct facts even with identical payloads", () => {
    const result = classifyAvailabilityReadiness(input([...readySources(), event("event-pk-2")]))
    expect(result.creator).toMatchObject({
      primary: "MULTIPLE_ACCEPTED_EVENTS",
      acceptedCount: 2,
    })
    expect(result.sourceIntegrity.identicalTransportCopyCount).toBe(0)
  })

  it("produces invariant classifications and stable opaque conflict labels under permutations", () => {
    const sources = [
      ...readySources(),
      event("event-pk", { action: "UPDATED" }),
      user("user-pk", "user-1", false),
    ]
    const forward = classifyAvailabilityReadiness(input(sources))
    const reverse = classifyAvailabilityReadiness(input([...sources].reverse()))
    expect(reverse).toEqual(forward)
    expect(forward.sourceIntegrity).toMatchObject({
      sourceIdentityPayloadConflictCount: 2,
      conflictingTransportCopyCount: 4,
      conflictLabels: ["EXC-000001", "EXC-000002"],
    })
    const serialized = JSON.stringify(forward)
    for (const raw of ["event-pk", "user-pk", "user-1", "UPDATED", "company-1", "surgery-1"]) {
      expect(serialized).not.toContain(raw)
    }
  })

  it("uses one stable global exception sequence for conflicts and date exceptions", () => {
    const sources = [
      ...readySources(),
      event("event-pk", { action: "PRIVATE_UPDATED_ACTION" }),
      user("user-pk", "private-user", false),
      surgery("private-surgery-z", { probableDate: "private-other-date" }),
      surgery("private-surgery-a", { probableDate: 99 }),
    ]
    const forward = classifyAvailabilityReadiness(input(sources))
    const reverse = classifyAvailabilityReadiness(input([...sources].reverse()))

    expect(reverse).toEqual(forward)
    expect(forward.sourceIntegrity.conflictLabels).toEqual(["EXC-000001", "EXC-000002"])
    expect(
      forward.dateInventory.find(
        ({ field, format }) => field === "SURGERY_PROBABLE_DATE" && format === "OTHER_STRING"
      )?.exceptionLabels
    ).toEqual(["EXC-000003"])
    expect(
      forward.dateInventory.find(
        ({ field, format }) => field === "SURGERY_PROBABLE_DATE" && format === "NON_STRING"
      )?.exceptionLabels
    ).toEqual(["EXC-000004"])

    const allLabels = [
      ...forward.sourceIntegrity.conflictLabels,
      ...forward.dateInventory.flatMap(({ exceptionLabels }) => exceptionLabels),
    ]
    expect(allLabels).toEqual([
      "EXC-000001",
      "EXC-000002",
      "EXC-000003",
      "EXC-000004",
    ])
    expect(new Set(allLabels).size).toBe(allLabels.length)

    const serialized = JSON.stringify(forward)
    for (const raw of [
      "event-pk",
      "user-pk",
      "private-user",
      "PRIVATE_UPDATED_ACTION",
      "private-surgery-z",
      "private-surgery-a",
      "private-other-date",
    ]) {
      expect(serialized).not.toContain(raw)
    }
  })
})

describe("date inventory", () => {
  for (const field of DATE_FIELDS) {
    for (const format of DATE_FORMATS) {
      it(`maps ${field} to the closed ${format} label without exposing its value`, () => {
        const property = dateFieldProperties[field]
        const rawValue = dateFormatValues[format]
        const result = classifyAvailabilityReadiness(
          input([surgery(`private-${field}-${format}`, { [property]: rawValue })])
        )
        const entries = result.dateInventory.filter((entry) => entry.field === field)

        expect(entries).toHaveLength(DATE_FORMATS.length)
        expect(entries.find((entry) => entry.format === format)).toMatchObject({ count: 1 })
        expect(entries.filter((entry) => entry.count === 1)).toHaveLength(1)

        const serialized = JSON.stringify(result.dateInventory)
        expect(serialized).not.toContain(`private-${field}-${format}`)
        if (typeof rawValue === "string") expect(serialized).not.toContain(rawValue)
      })
    }
  }

  it("reports the closed field/format matrix with counts and stable labels but no values", () => {
    const sources = [
      ...readySources(),
      surgery("z-private-id", {
        probableDate: "2026-07-22",
        scheduledDate: "2026-07-22T10:11:12.123Z",
        surgeryDate: "22/07/2026",
        performedDate: 7,
      }),
      surgery("a-private-id", { surgeryDate: "bad-value", performedDate: false }),
    ]
    const result = classifyAvailabilityReadiness(input(sources))
    expect(result.dateInventory).toHaveLength(25)
    expect(result.dateInventory).toContainEqual({
      field: "SURGERY_PROBABLE_DATE",
      format: "DATE_YYYY_MM_DD",
      count: 1,
      exceptionLabels: [],
    })
    expect(result.dateInventory).toContainEqual({
      field: "SURGERY_SCHEDULED_DATE",
      format: "UTC_RFC3339_MILLISECONDS",
      count: 1,
      exceptionLabels: [],
    })
    expect(result.dateInventory).toContainEqual({
      field: "SURGERY_SURGERY_DATE",
      format: "OTHER_STRING",
      count: 2,
      exceptionLabels: ["EXC-000001", "EXC-000002"],
    })
    expect(result.dateInventory).toContainEqual({
      field: "SURGERY_PERFORMED_DATE",
      format: "NON_STRING",
      count: 2,
      exceptionLabels: ["EXC-000003", "EXC-000004"],
    })
    const serialized = JSON.stringify(result.dateInventory)
    for (const raw of ["z-private-id", "a-private-id", "2026-07-22", "bad-value", "22/07/2026"]) {
      expect(serialized).not.toContain(raw)
    }
  })
})

describe("report facade and canonical serializer", () => {
  it("returns the same validated report as the direct classifier", () => {
    const value = typedInput([...readySources(), surgery("private-row", { cancelledDate: "private" })])
    const direct = classifyAvailabilityReadiness(value)
    const output = createAvailabilityReadinessReport(value)

    expect(output.report).toEqual(direct)
    expect(output.canonical).toBe(serializeAvailabilityReadinessReport(direct))
    expect(availabilityReadinessReportOutputSchema.parse(output)).toEqual(output)
  })

  it("canonicalizes object and report-array permutations deterministically", () => {
    const report = classifyAvailabilityReadiness(
      input([...readySources(), surgery("private-z", { probableDate: "private" }), surgery("private-a", { probableDate: 1 })])
    )
    const permuted = {
      ready: report.ready,
      sourceIntegrity: {
        reconciled: report.sourceIntegrity.reconciled,
        conflictLabels: [...report.sourceIntegrity.conflictLabels].reverse(),
        diagnostics: [...report.sourceIntegrity.diagnostics].reverse(),
        sourceIdentityPayloadConflictCount: report.sourceIntegrity.sourceIdentityPayloadConflictCount,
        conflictingTransportCopyCount: report.sourceIntegrity.conflictingTransportCopyCount,
        identicalTransportCopyCount: report.sourceIntegrity.identicalTransportCopyCount,
        uniqueConsistentFactCount: report.sourceIntegrity.uniqueConsistentFactCount,
        rawInputCount: report.sourceIntegrity.rawInputCount,
      },
      schemaReadiness: { ...report.schemaReadiness, diagnostics: [...report.schemaReadiness.diagnostics].reverse() },
      pivot: { ...report.pivot, diagnostics: [...report.pivot.diagnostics].reverse() },
      dateInventory: [...report.dateInventory]
        .reverse()
        .map((entry) => ({ ...entry, exceptionLabels: [...entry.exceptionLabels].reverse() })),
      creator: { ...report.creator, diagnostics: [...report.creator.diagnostics].reverse() },
    }

    expect(serializeAvailabilityReadinessReport(permuted)).toBe(
      serializeAvailabilityReadinessReport(report)
    )
  })

  it("rejects unknown report and facade-output keys", () => {
    const report = classifyAvailabilityReadiness(input(readySources()))
    expect(() => serializeAvailabilityReadinessReport({ ...report, unknown: true })).toThrow()
    expect(() =>
      availabilityReadinessReportOutputSchema.parse({
        report,
        canonical: serializeAvailabilityReadinessReport(report),
        unknown: true,
      })
    ).toThrow()
  })

  it("emits stable UTF-8 logical text with LF and exactly one final LF", () => {
    const canonical = createAvailabilityReadinessReport(typedInput(readySources())).canonical
    expect(canonical).not.toContain("\r")
    expect(canonical.match(/\n/g)).toHaveLength(1)
    expect(canonical.endsWith("\n")).toBe(true)
    expect(canonical.endsWith("\n\n")).toBe(false)
    expect([...canonical].every((character) => character.codePointAt(0)! <= 0x7f)).toBe(true)
  })

  it("matches the frozen inline canonical text exactly", () => {
    const report = classifyAvailabilityReadiness(input([]))
    const zeroEntries = [
      ["SURGERY_PROBABLE_DATE", "NULL"], ["SURGERY_PROBABLE_DATE", "DATE_YYYY_MM_DD"],
      ["SURGERY_PROBABLE_DATE", "UTC_RFC3339_MILLISECONDS"], ["SURGERY_PROBABLE_DATE", "OTHER_STRING"],
      ["SURGERY_PROBABLE_DATE", "NON_STRING"], ["SURGERY_SCHEDULED_DATE", "NULL"],
      ["SURGERY_SCHEDULED_DATE", "DATE_YYYY_MM_DD"], ["SURGERY_SCHEDULED_DATE", "UTC_RFC3339_MILLISECONDS"],
      ["SURGERY_SCHEDULED_DATE", "OTHER_STRING"], ["SURGERY_SCHEDULED_DATE", "NON_STRING"],
      ["SURGERY_SURGERY_DATE", "NULL"], ["SURGERY_SURGERY_DATE", "DATE_YYYY_MM_DD"],
      ["SURGERY_SURGERY_DATE", "UTC_RFC3339_MILLISECONDS"], ["SURGERY_SURGERY_DATE", "OTHER_STRING"],
      ["SURGERY_SURGERY_DATE", "NON_STRING"], ["SURGERY_PERFORMED_DATE", "NULL"],
      ["SURGERY_PERFORMED_DATE", "DATE_YYYY_MM_DD"], ["SURGERY_PERFORMED_DATE", "UTC_RFC3339_MILLISECONDS"],
      ["SURGERY_PERFORMED_DATE", "OTHER_STRING"], ["SURGERY_PERFORMED_DATE", "NON_STRING"],
      ["SURGERY_CANCELLED_DATE", "NULL"], ["SURGERY_CANCELLED_DATE", "DATE_YYYY_MM_DD"],
      ["SURGERY_CANCELLED_DATE", "UTC_RFC3339_MILLISECONDS"], ["SURGERY_CANCELLED_DATE", "OTHER_STRING"],
      ["SURGERY_CANCELLED_DATE", "NON_STRING"],
    ]
      .map(([field, format]) => `{"count":0,"exceptionLabels":[],"field":"${field}","format":"${format}"}`)
      .join(",")
    const expected =
      `{"creator":{"acceptedCount":0,"diagnostics":[],"primary":"ZERO_ACCEPTED_EVENTS","ready":false},` +
      `"dateInventory":[${zeroEntries}],` +
      `"pivot":{"acceptedCount":0,"diagnostics":[],"primary":"ZERO_DESIGNATIONS","ready":false},` +
      `"ready":false,"schemaReadiness":{"acceptedCount":0,"diagnostics":["CAJAS_ANCHOR_MISSING"],` +
      `"primary":"NOT_ATTESTED","ready":false},"sourceIntegrity":{"conflictLabels":[],` +
      `"conflictingTransportCopyCount":0,"diagnostics":[],"identicalTransportCopyCount":0,` +
      `"rawInputCount":0,"reconciled":true,"sourceIdentityPayloadConflictCount":0,` +
      `"uniqueConsistentFactCount":0}}\n`

    expect(serializeAvailabilityReadinessReport(report)).toBe(expected)
  })

  it("never serializes raw source identifiers or payload values", () => {
    const output = createAvailabilityReadinessReport(
      typedInput([
        ...readySources(),
        event("private-event", { action: "private-action" }),
        surgery("private-surgery", { cancelledDate: "private-date-value" }),
      ])
    )
    for (const raw of ["private-event", "private-action", "private-surgery", "private-date-value"]) {
      expect(output.canonical).not.toContain(raw)
    }
  })
})

describe("purity boundary", () => {
  it("has an exact dependency boundary and no forbidden side-effect calls", () => {
    const value = input(readySources())
    expect(classifyAvailabilityReadiness(value)).toEqual(classifyAvailabilityReadiness(value))
    expect(Object.keys({ classifyAvailabilityReadiness })).toEqual(["classifyAvailabilityReadiness"])
    expect(classifyAvailabilityReadiness.constructor.name).toBe("Function")

    const imports = (source: string) =>
      [...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1])
    expect(imports(classifierSource)).toEqual(["zod"])
    expect(imports(testSource)).toEqual([
      "vitest",
      "@/lib/services/availability-readiness-classifier.ts?raw",
      "../../../scripts/dev/report-availability-readiness.ts?raw",
      "./availability-readiness-classifier.test.ts?raw",
      "@/lib/services/availability-readiness-classifier",
      "../../../scripts/dev/report-availability-readiness",
    ])
    expect(imports(facadeSource)).toEqual([
      "../../src/lib/services/availability-readiness-classifier",
    ])

    const joined = (...parts: string[]) => parts.join("")
    const forbiddenDependencies = [
      joined("@pris", "ma/client"),
      joined("@supa", "base/"),
      joined("node", ":fs"),
      joined("node", ":child_process"),
      joined("ax", "ios"),
      joined("en", "gram"),
    ]
    const forbiddenCalls = [
      joined("pro", "cess.env"),
      joined("pro", "cess.argv"),
      joined("pro", "cess.stdin"),
      joined("fe", "tch("),
      joined("XMLHttp", "Request"),
      joined("Web", "Socket"),
      joined("$trans", "action("),
    ]
    for (const forbidden of [...forbiddenDependencies, ...forbiddenCalls]) {
      expect(classifierSource).not.toContain(forbidden)
      expect(facadeSource).not.toContain(forbidden)
      expect(testSource).not.toContain(forbidden)
    }

    expect(Object.keys({ createAvailabilityReadinessReport })).toEqual([
      "createAvailabilityReadinessReport",
    ])
    expect(availabilityReadinessReportSchema.parse(classifyAvailabilityReadiness(input([])))).toBeTruthy()
  })
})
