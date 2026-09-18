import { z } from "zod"

export const SOURCE_KINDS = [
  "SURGERY_ROW",
  "AUDIT_EVENT_SURGERY_CREATED",
  "USER_ROW",
  "USER_COMPANY_ACCESS_ROW",
  "PIVOT_DESIGNATION_ROW",
  "SCHEMA_BASELINE_ATTESTATION",
  "SCHEMA_CAJAS_ANCHOR_ATTESTATION",
  "SCHEMA_AVAILABILITY_COLLISION_ATTESTATION",
] as const

export const CREATOR_PRIMARIES = [
  "EXACT_ONE_ACCEPTED_EVENT",
  "ZERO_ACCEPTED_EVENTS",
  "MULTIPLE_ACCEPTED_EVENTS",
] as const
export const CREATOR_DIAGNOSTICS = [
  "USER_ID_MALFORMED",
  "USER_ID_MISSING",
  "USER_NOT_FOUND",
  "WRONG_ACTION",
  "WRONG_COMPANY",
  "WRONG_ENTITY_ID",
  "WRONG_ENTITY_TYPE",
] as const
export const PIVOT_PRIMARIES = [
  "EXACT_ONE_DESIGNATION",
  "ZERO_DESIGNATIONS",
  "MULTIPLE_DESIGNATIONS",
] as const
export const PIVOT_DIAGNOSTICS = [
  "INACTIVE_ACCESS",
  "INACTIVE_USER",
  "MALFORMED",
  "WRONG_COMPANY",
  "WRONG_ROLE",
] as const
export const SCHEMA_PRIMARIES = [
  "ATTESTED_MATCH",
  "ATTESTED_MISMATCH",
  "NOT_ATTESTED",
] as const
export const SCHEMA_DIAGNOSTICS = [
  "ATTESTATION_MALFORMED",
  "AVAILABILITY_OBJECT_COLLISION",
  "CAJAS_ANCHOR_MISSING",
  "DEPLOYED_BASELINE_DRIFT",
] as const
export const SOURCE_INTEGRITY_DIAGNOSTICS = [
  "SOURCE_IDENTITY_PAYLOAD_CONFLICT",
] as const
export const DATE_FIELDS = [
  "SURGERY_PROBABLE_DATE",
  "SURGERY_SCHEDULED_DATE",
  "SURGERY_SURGERY_DATE",
  "SURGERY_PERFORMED_DATE",
  "SURGERY_CANCELLED_DATE",
] as const
export const DATE_FORMATS = [
  "NULL",
  "DATE_YYYY_MM_DD",
  "UTC_RFC3339_MILLISECONDS",
  "OTHER_STRING",
  "NON_STRING",
] as const

export const sourceKindSchema = z.enum(SOURCE_KINDS)
export const creatorPrimarySchema = z.enum(CREATOR_PRIMARIES)
export const creatorDiagnosticSchema = z.enum(CREATOR_DIAGNOSTICS)
export const pivotPrimarySchema = z.enum(PIVOT_PRIMARIES)
export const pivotDiagnosticSchema = z.enum(PIVOT_DIAGNOSTICS)
export const schemaPrimarySchema = z.enum(SCHEMA_PRIMARIES)
export const schemaDiagnosticSchema = z.enum(SCHEMA_DIAGNOSTICS)
export const sourceIntegrityDiagnosticSchema = z.enum(SOURCE_INTEGRITY_DIAGNOSTICS)
export const dateFieldSchema = z.enum(DATE_FIELDS)
export const dateFormatSchema = z.enum(DATE_FORMATS)

const identitySchema = z.string().min(1).max(256)
const nullableIdentifierSchema = z.string().max(256).nullable()
const dateValueSchema = z.union([z.null(), z.string(), z.number().finite(), z.boolean()])

const surgeryPayloadSchema = z
  .object({
    probableDate: dateValueSchema,
    scheduledDate: dateValueSchema,
    surgeryDate: dateValueSchema,
    performedDate: dateValueSchema,
    cancelledDate: dateValueSchema,
  })
  .strict()
const auditEventPayloadSchema = z
  .object({
    companyId: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    action: z.string(),
    userId: nullableIdentifierSchema,
  })
  .strict()
const userPayloadSchema = z
  .object({ userId: z.string(), active: z.boolean() })
  .strict()
const accessPayloadSchema = z
  .object({ userId: z.string(), companyId: z.string(), active: z.boolean() })
  .strict()
const pivotPayloadSchema = z
  .object({ userId: z.string(), companyId: z.string(), role: z.string() })
  .strict()
const baselinePayloadSchema = z
  .object({ matches: z.boolean(), malformed: z.boolean() })
  .strict()
const cajasPayloadSchema = z
  .object({ present: z.boolean(), malformed: z.boolean() })
  .strict()
const collisionPayloadSchema = z
  .object({ collision: z.boolean(), malformed: z.boolean() })
  .strict()

function sourceRecordSchema<const K extends (typeof SOURCE_KINDS)[number], S extends z.ZodType>(
  sourceKind: K,
  payload: S
) {
  return z
    .object({
      sourceKind: z.literal(sourceKind),
      immutableSourcePrimaryKey: identitySchema,
      payload,
    })
    .strict()
}

export const surgerySourceRecordSchema = sourceRecordSchema("SURGERY_ROW", surgeryPayloadSchema)
export const auditEventSourceRecordSchema = sourceRecordSchema(
  "AUDIT_EVENT_SURGERY_CREATED",
  auditEventPayloadSchema
)
export const userSourceRecordSchema = sourceRecordSchema("USER_ROW", userPayloadSchema)
export const accessSourceRecordSchema = sourceRecordSchema(
  "USER_COMPANY_ACCESS_ROW",
  accessPayloadSchema
)
export const pivotSourceRecordSchema = sourceRecordSchema(
  "PIVOT_DESIGNATION_ROW",
  pivotPayloadSchema
)
export const baselineSourceRecordSchema = sourceRecordSchema(
  "SCHEMA_BASELINE_ATTESTATION",
  baselinePayloadSchema
)
export const cajasSourceRecordSchema = sourceRecordSchema(
  "SCHEMA_CAJAS_ANCHOR_ATTESTATION",
  cajasPayloadSchema
)
export const collisionSourceRecordSchema = sourceRecordSchema(
  "SCHEMA_AVAILABILITY_COLLISION_ATTESTATION",
  collisionPayloadSchema
)

export const availabilitySourceRecordSchema = z.discriminatedUnion("sourceKind", [
  surgerySourceRecordSchema,
  auditEventSourceRecordSchema,
  userSourceRecordSchema,
  accessSourceRecordSchema,
  pivotSourceRecordSchema,
  baselineSourceRecordSchema,
  cajasSourceRecordSchema,
  collisionSourceRecordSchema,
])

export const availabilityReadinessClassifierInputSchema = z
  .object({
    expectedCompanyId: identitySchema,
    expectedEntityId: identitySchema,
    expectedCreatorAction: identitySchema,
    expectedPivotRole: identitySchema,
    sources: z.array(availabilitySourceRecordSchema),
  })
  .strict()

const exceptionLabelSchema = z.string().regex(/^EXC-[0-9]{6}$/)
const nonnegativeSafeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, "Expected a safe integer")
const classificationSchema = <P extends z.ZodType, D extends z.ZodType>(primary: P, diagnostic: D) =>
  z
    .object({
      primary,
      acceptedCount: nonnegativeSafeIntegerSchema,
      diagnostics: z.array(diagnostic),
      ready: z.boolean(),
    })
    .strict()

export const sourceIntegrityResultSchema = z
  .object({
    rawInputCount: nonnegativeSafeIntegerSchema,
    uniqueConsistentFactCount: nonnegativeSafeIntegerSchema,
    identicalTransportCopyCount: nonnegativeSafeIntegerSchema,
    conflictingTransportCopyCount: nonnegativeSafeIntegerSchema,
    sourceIdentityPayloadConflictCount: nonnegativeSafeIntegerSchema,
    diagnostics: z.array(sourceIntegrityDiagnosticSchema),
    conflictLabels: z.array(exceptionLabelSchema),
    reconciled: z.boolean(),
  })
  .strict()
export const dateInventoryEntrySchema = z
  .object({
    field: dateFieldSchema,
    format: dateFormatSchema,
    count: nonnegativeSafeIntegerSchema,
    exceptionLabels: z.array(exceptionLabelSchema),
  })
  .strict()
export const availabilityReadinessClassifierResultSchema = z
  .object({
    creator: classificationSchema(creatorPrimarySchema, creatorDiagnosticSchema),
    pivot: classificationSchema(pivotPrimarySchema, pivotDiagnosticSchema),
    schemaReadiness: classificationSchema(schemaPrimarySchema, schemaDiagnosticSchema),
    sourceIntegrity: sourceIntegrityResultSchema,
    dateInventory: z.array(dateInventoryEntrySchema).length(DATE_FIELDS.length * DATE_FORMATS.length),
    ready: z.boolean(),
  })
  .strict()

export const availabilityReadinessReportSchema = availabilityReadinessClassifierResultSchema
export const canonicalAvailabilityReadinessReportSchema = z
  .string()
  .regex(/^[^\r\n]*\n$/, "Expected canonical single-line text with one final LF")
export const availabilityReadinessReportOutputSchema = z
  .object({
    report: availabilityReadinessReportSchema,
    canonical: canonicalAvailabilityReadinessReportSchema,
  })
  .strict()

export type AvailabilitySourceRecord = z.infer<typeof availabilitySourceRecordSchema>
export type AvailabilityReadinessClassifierInput = z.infer<
  typeof availabilityReadinessClassifierInputSchema
>
export type AvailabilityReadinessClassifierResult = z.infer<
  typeof availabilityReadinessClassifierResultSchema
>
export type AvailabilityReadinessReport = z.infer<typeof availabilityReadinessReportSchema>
export type CanonicalAvailabilityReadinessReport = z.infer<
  typeof canonicalAvailabilityReadinessReportSchema
>
export type AvailabilityReadinessReportOutput = z.infer<
  typeof availabilityReadinessReportOutputSchema
>
export type SourceKind = z.infer<typeof sourceKindSchema>
export type CreatorPrimary = z.infer<typeof creatorPrimarySchema>
export type CreatorDiagnostic = z.infer<typeof creatorDiagnosticSchema>
export type PivotPrimary = z.infer<typeof pivotPrimarySchema>
export type PivotDiagnostic = z.infer<typeof pivotDiagnosticSchema>
export type SchemaPrimary = z.infer<typeof schemaPrimarySchema>
export type SchemaDiagnostic = z.infer<typeof schemaDiagnosticSchema>
export type DateField = z.infer<typeof dateFieldSchema>
export type DateFormat = z.infer<typeof dateFormatSchema>

type CanonicalValue = null | string | number | boolean | CanonicalValue[] | CanonicalObject
type CanonicalObject = { readonly [key: string]: CanonicalValue }

function canonicalPayload(value: CanonicalValue): string {
  if (value === null) return "n"
  if (typeof value === "string") return `s${value.length}:${value}`
  if (typeof value === "boolean") return value ? "b1" : "b0"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical payload numbers must be finite")
    return `d${Object.is(value, -0) ? "-0" : String(value)}`
  }
  if (Array.isArray(value)) return `a${value.length}[${value.map(canonicalPayload).join("")}]`

  const keys = Object.keys(value).sort(compareText)
  return `o${keys.length}{${keys
    .map((key) => `${canonicalPayload(key)}${canonicalPayload(value[key])}`)
    .join("")}}`
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function compareByClosedOrder<T extends string>(order: readonly T[], left: T, right: T): number {
  return order.indexOf(left) - order.indexOf(right)
}

type CanonicalReportValue =
  | null
  | string
  | boolean
  | number
  | CanonicalReportValue[]
  | { readonly [key: string]: CanonicalReportValue }

function serializeCanonicalReportValue(value: CanonicalReportValue): string {
  if (value === null) return "null"
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TypeError("Canonical report numbers must be safe integers")
    return String(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) return `[${value.map(serializeCanonicalReportValue).join(",")}]`

  return `{${Object.keys(value)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${serializeCanonicalReportValue(value[key])}`)
    .join(",")}}`
}

function normalizeReportOrdering(report: AvailabilityReadinessReport): AvailabilityReadinessReport {
  const sortLabels = (labels: string[]) => [...labels].sort(compareText)
  return {
    ...report,
    creator: { ...report.creator, diagnostics: [...report.creator.diagnostics].sort(compareText) },
    pivot: { ...report.pivot, diagnostics: [...report.pivot.diagnostics].sort(compareText) },
    schemaReadiness: {
      ...report.schemaReadiness,
      diagnostics: [...report.schemaReadiness.diagnostics].sort(compareText),
    },
    sourceIntegrity: {
      ...report.sourceIntegrity,
      diagnostics: [...report.sourceIntegrity.diagnostics].sort(compareText),
      conflictLabels: sortLabels(report.sourceIntegrity.conflictLabels),
    },
    dateInventory: report.dateInventory
      .map((entry) => ({ ...entry, exceptionLabels: sortLabels(entry.exceptionLabels) }))
      .sort(
        (left, right) =>
          compareByClosedOrder(DATE_FIELDS, left.field, right.field) ||
          compareByClosedOrder(DATE_FORMATS, left.format, right.format)
      ),
  }
}

export function serializeAvailabilityReadinessReport(value: unknown): string {
  const report = availabilityReadinessReportSchema.parse(value)
  const normalized = normalizeReportOrdering(report)
  return canonicalAvailabilityReadinessReportSchema.parse(
    `${serializeCanonicalReportValue(normalized as CanonicalReportValue)}\n`
  )
}

function sourceIdentity(record: AvailabilitySourceRecord): string {
  return `${record.sourceKind}\u0000${record.immutableSourcePrimaryKey}`
}

type PartitionedSources = {
  facts: AvailabilitySourceRecord[]
  integrity: Omit<z.infer<typeof sourceIntegrityResultSchema>, "conflictLabels">
  conflictExceptionKeys: string[]
}

function partitionSources(sources: AvailabilitySourceRecord[]): PartitionedSources {
  const groups = new Map<string, AvailabilitySourceRecord[]>()
  for (const source of sources) {
    const key = sourceIdentity(source)
    groups.set(key, [...(groups.get(key) ?? []), source])
  }

  const facts: AvailabilitySourceRecord[] = []
  let identicalTransportCopyCount = 0
  let conflictingTransportCopyCount = 0
  let sourceIdentityPayloadConflictCount = 0
  const conflictExceptionKeys: string[] = []

  for (const [, group] of [...groups.entries()].sort(([left], [right]) => compareText(left, right))) {
    const variants = new Map<string, AvailabilitySourceRecord>()
    for (const source of group) {
      variants.set(canonicalPayload(source.payload as CanonicalObject), source)
    }

    if (variants.size === 1) {
      facts.push(group[0])
      identicalTransportCopyCount += group.length - 1
    } else {
      sourceIdentityPayloadConflictCount += 1
      conflictingTransportCopyCount += group.length
      conflictExceptionKeys.push(`CONFLICT\u0000${sourceIdentity(group[0])}`)
    }
  }

  const rawInputCount = sources.length
  const reconciled =
    rawInputCount ===
    facts.length + identicalTransportCopyCount + conflictingTransportCopyCount

  return {
    facts,
    integrity: {
      rawInputCount,
      uniqueConsistentFactCount: facts.length,
      identicalTransportCopyCount,
      conflictingTransportCopyCount,
      sourceIdentityPayloadConflictCount,
      diagnostics:
        sourceIdentityPayloadConflictCount === 0
          ? []
          : ["SOURCE_IDENTITY_PAYLOAD_CONFLICT"],
      reconciled,
    },
    conflictExceptionKeys,
  }
}

function formatExceptionLabel(sequence: number): string {
  return `EXC-${String(sequence).padStart(6, "0")}`
}

function uniqueSorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort(compareText)
}

function isIdentifierMissing(value: string | null): value is null | "" {
  return value === null || value.length === 0
}

function isIdentifierMalformed(value: string): boolean {
  return !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
}

function selectSources<K extends SourceKind>(
  facts: AvailabilitySourceRecord[],
  sourceKind: K
): Extract<AvailabilitySourceRecord, { sourceKind: K }>[] {
  return facts.filter(
    (fact): fact is Extract<AvailabilitySourceRecord, { sourceKind: K }> =>
      fact.sourceKind === sourceKind
  )
}

function classifyCreator(
  input: AvailabilityReadinessClassifierInput,
  facts: AvailabilitySourceRecord[],
  integrityReady: boolean
) {
  const knownUsers = new Set(selectSources(facts, "USER_ROW").map(({ payload }) => payload.userId))
  const diagnostics: CreatorDiagnostic[] = []
  let acceptedCount = 0

  for (const { payload } of selectSources(facts, "AUDIT_EVENT_SURGERY_CREATED")) {
    const rejected: CreatorDiagnostic[] = []
    if (payload.companyId !== input.expectedCompanyId) rejected.push("WRONG_COMPANY")
    if (payload.entityType !== "SURGERY") rejected.push("WRONG_ENTITY_TYPE")
    if (payload.entityId !== input.expectedEntityId) rejected.push("WRONG_ENTITY_ID")
    if (payload.action !== input.expectedCreatorAction) rejected.push("WRONG_ACTION")
    if (isIdentifierMissing(payload.userId)) {
      rejected.push("USER_ID_MISSING")
    } else if (isIdentifierMalformed(payload.userId)) {
      rejected.push("USER_ID_MALFORMED")
    } else if (!knownUsers.has(payload.userId)) {
      rejected.push("USER_NOT_FOUND")
    }

    if (rejected.length === 0) acceptedCount += 1
    else diagnostics.push(...rejected)
  }

  const primary: CreatorPrimary =
    acceptedCount === 0
      ? "ZERO_ACCEPTED_EVENTS"
      : acceptedCount === 1
        ? "EXACT_ONE_ACCEPTED_EVENT"
        : "MULTIPLE_ACCEPTED_EVENTS"
  return {
    primary,
    acceptedCount,
    diagnostics: uniqueSorted(diagnostics),
    ready: integrityReady && primary === "EXACT_ONE_ACCEPTED_EVENT",
  }
}

function classifyPivot(
  input: AvailabilityReadinessClassifierInput,
  facts: AvailabilitySourceRecord[],
  integrityReady: boolean
) {
  const users = selectSources(facts, "USER_ROW").map(({ payload }) => payload)
  const accesses = selectSources(facts, "USER_COMPANY_ACCESS_ROW").map(({ payload }) => payload)
  const diagnostics: PivotDiagnostic[] = []
  let acceptedCount = 0

  for (const { payload } of selectSources(facts, "PIVOT_DESIGNATION_ROW")) {
    const rejected: PivotDiagnostic[] = []
    const malformed = isIdentifierMalformed(payload.userId)
    if (malformed) rejected.push("MALFORMED")
    if (payload.companyId !== input.expectedCompanyId) rejected.push("WRONG_COMPANY")
    if (payload.role !== input.expectedPivotRole) rejected.push("WRONG_ROLE")

    const matchingUsers = users.filter((user) => user.userId === payload.userId)
    if (matchingUsers.length !== 1 || !matchingUsers[0].active) rejected.push("INACTIVE_USER")

    const matchingAccesses = accesses.filter(
      (access) =>
        access.userId === payload.userId && access.companyId === input.expectedCompanyId
    )
    if (matchingAccesses.length !== 1 || !matchingAccesses[0].active) {
      rejected.push("INACTIVE_ACCESS")
    }

    if (rejected.length === 0) acceptedCount += 1
    else diagnostics.push(...rejected)
  }

  const primary: PivotPrimary =
    acceptedCount === 0
      ? "ZERO_DESIGNATIONS"
      : acceptedCount === 1
        ? "EXACT_ONE_DESIGNATION"
        : "MULTIPLE_DESIGNATIONS"
  return {
    primary,
    acceptedCount,
    diagnostics: uniqueSorted(diagnostics),
    ready: integrityReady && primary === "EXACT_ONE_DESIGNATION",
  }
}

function classifySchema(facts: AvailabilitySourceRecord[], integrityReady: boolean) {
  const baselines = selectSources(facts, "SCHEMA_BASELINE_ATTESTATION")
  const cajas = selectSources(facts, "SCHEMA_CAJAS_ANCHOR_ATTESTATION")
  const collisions = selectSources(facts, "SCHEMA_AVAILABILITY_COLLISION_ATTESTATION")
  const diagnostics: SchemaDiagnostic[] = []

  if (baselines.some(({ payload }) => !payload.matches)) {
    diagnostics.push("DEPLOYED_BASELINE_DRIFT")
  }
  if (cajas.length !== 1 || cajas.some(({ payload }) => !payload.present)) {
    diagnostics.push("CAJAS_ANCHOR_MISSING")
  }
  if (collisions.some(({ payload }) => payload.collision)) {
    diagnostics.push("AVAILABILITY_OBJECT_COLLISION")
  }
  if (
    baselines.length > 1 ||
    cajas.length > 1 ||
    collisions.length > 1 ||
    [...baselines, ...cajas, ...collisions].some(({ payload }) => payload.malformed)
  ) {
    diagnostics.push("ATTESTATION_MALFORMED")
  }

  const primary: SchemaPrimary =
    baselines.length === 0
      ? "NOT_ATTESTED"
      : baselines.length === 1 && baselines[0].payload.matches && diagnostics.length === 0
        ? "ATTESTED_MATCH"
        : "ATTESTED_MISMATCH"
  const acceptedCount = primary === "ATTESTED_MATCH" ? 1 : 0
  return {
    primary,
    acceptedCount,
    diagnostics: uniqueSorted(diagnostics),
    ready: integrityReady && primary === "ATTESTED_MATCH",
  }
}

const DATE_FIELD_ACCESSORS: ReadonlyArray<
  readonly [DateField, keyof z.infer<typeof surgeryPayloadSchema>]
> = [
  ["SURGERY_PROBABLE_DATE", "probableDate"],
  ["SURGERY_SCHEDULED_DATE", "scheduledDate"],
  ["SURGERY_SURGERY_DATE", "surgeryDate"],
  ["SURGERY_PERFORMED_DATE", "performedDate"],
  ["SURGERY_CANCELLED_DATE", "cancelledDate"],
]

function dateFormat(value: z.infer<typeof dateValueSchema>): DateFormat {
  if (value === null) return "NULL"
  if (typeof value !== "string") return "NON_STRING"
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return "DATE_YYYY_MM_DD"
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value)) {
    return "UTC_RFC3339_MILLISECONDS"
  }
  return "OTHER_STRING"
}

type PendingDateInventoryEntry = {
  field: DateField
  format: DateFormat
  count: number
  exceptionKeys: string[]
}

function classifyDateInventory(facts: AvailabilitySourceRecord[]): PendingDateInventoryEntry[] {
  const surgeries = selectSources(facts, "SURGERY_ROW").sort((left, right) =>
    compareText(sourceIdentity(left), sourceIdentity(right))
  )
  const inventory = new Map<string, { count: number; exceptionKeys: string[] }>()

  for (const [field, property] of DATE_FIELD_ACCESSORS) {
    for (const surgery of surgeries) {
      const format = dateFormat(surgery.payload[property])
      const key = `${field}\u0000${format}`
      const entry = inventory.get(key) ?? { count: 0, exceptionKeys: [] }
      entry.count += 1
      if (format === "OTHER_STRING" || format === "NON_STRING") {
        entry.exceptionKeys.push(`DATE\u0000${field}\u0000${format}\u0000${sourceIdentity(surgery)}`)
      }
      inventory.set(key, entry)
    }
  }

  return DATE_FIELD_ACCESSORS.flatMap(([field]) =>
    DATE_FORMATS.map((format) => {
      const entry = inventory.get(`${field}\u0000${format}`) ?? {
        count: 0,
        exceptionKeys: [],
      }
      return { field, format, ...entry }
    })
  )
}

function assignGlobalExceptionLabels(
  conflictExceptionKeys: string[],
  dateInventory: PendingDateInventoryEntry[]
) {
  const orderedKeys = [
    ...conflictExceptionKeys.sort(compareText),
    ...dateInventory.flatMap(({ exceptionKeys }) => exceptionKeys.sort(compareText)),
  ]
  const labels = new Map(
    orderedKeys.map((key, index) => [key, formatExceptionLabel(index + 1)] as const)
  )

  return {
    conflictLabels: conflictExceptionKeys.map((key) => labels.get(key)!),
    dateInventory: dateInventory.map(({ exceptionKeys, ...entry }) => ({
      ...entry,
      exceptionLabels: exceptionKeys.map((key) => labels.get(key)!),
    })),
  }
}

export function classifyAvailabilityReadiness(
  value: unknown
): AvailabilityReadinessClassifierResult {
  const input = availabilityReadinessClassifierInputSchema.parse(value)
  const { facts, integrity, conflictExceptionKeys } = partitionSources(input.sources)
  const integrityReady = integrity.sourceIdentityPayloadConflictCount === 0 && integrity.reconciled
  const creator = classifyCreator(input, facts, integrityReady)
  const pivot = classifyPivot(input, facts, integrityReady)
  const schemaReadiness = classifySchema(facts, integrityReady)
  const labelledExceptions = assignGlobalExceptionLabels(
    conflictExceptionKeys,
    classifyDateInventory(facts)
  )
  const result = {
    creator,
    pivot,
    schemaReadiness,
    sourceIntegrity: { ...integrity, conflictLabels: labelledExceptions.conflictLabels },
    dateInventory: labelledExceptions.dateInventory,
    ready: integrityReady && creator.ready && pivot.ready && schemaReadiness.ready,
  }

  return availabilityReadinessClassifierResultSchema.parse(result)
}
