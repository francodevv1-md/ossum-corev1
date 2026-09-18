import type {
  AssignmentSlaBasis,
  CoordinatorBucketKey,
  CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import type { Surgery } from "@/types"
import type { CoordinationEzequielDevDiagnostic } from "@/lib/api/surgery-adapter"

export type MetricKey = "put-date" | "overdue" | "coordinated" | "in-transit"
export type AcceptedCoordinationDevFacts = NonNullable<CoordinationEzequielDevDiagnostic["facts"]> & { stableKey: string }

export function acceptCoordinationEzequielDevFacts(input: {
  diagnostic: CoordinationEzequielDevDiagnostic | null
  isAuthenticated: boolean
  activeCompany: { id: string; name: string } | null
  mode: "production" | "dev-preview"
  surface: "personal" | "global"
  readOnly: boolean
  hasSuccessfulData: boolean
  contextAccepted: boolean
  subject: { contactId: string; label: string } | null
  entry: CoordinatorCase
}): { accepted: true; facts: AcceptedCoordinationDevFacts } | { accepted: false; stableKey: string | null; code: string } {
  if (process.env.NODE_ENV !== "development") return { accepted: false, stableKey: null, code: "dev_overlay_inert" }
  const stableKey = input.diagnostic?.stableKey ?? null
  const reject = (code: string) => ({ accepted: false as const, stableKey, code })
  const facts = input.diagnostic?.facts
  if (input.diagnostic?.code !== "accepted" || !facts) return reject("dev_overlay_envelope_rejected")
  if (!input.isAuthenticated || !input.hasSuccessfulData || !input.contextAccepted) return reject("dev_overlay_context_rejected")
  if (input.mode !== "production" || input.surface !== "personal" || input.readOnly) return reject("dev_overlay_surface_rejected")
  if (!input.activeCompany || input.activeCompany.id !== facts.companyId || input.activeCompany.name !== facts.companyMarker || facts.organizationMarker !== "ossum-dev") return reject("dev_overlay_company_rejected")
  if (!input.subject || input.subject.contactId !== facts.targetContactId || input.subject.label !== facts.targetLabel || facts.targetRole !== "coordinator") return reject("dev_overlay_subject_rejected")
  const surgery = input.entry.surgery
  const assignments = surgery.coordinatorAssignments?.filter((assignment) => assignment.contactId === facts.targetContactId) ?? []
  if (surgery.backendId !== facts.surgeryId || surgery.coordinatorAssignmentState !== "resolved" || surgery.coordinadorContactId !== facts.targetContactId || assignments.length !== 1) return reject("dev_overlay_assignment_rejected")
  if (input.entry.bucket === null || input.entry.bucket === "finalizado") return reject("dev_overlay_eligibility_rejected")
  return { accepted: true, facts: { ...facts, stableKey: input.diagnostic.stableKey } }
}

export type DateOnlyRange = { from: string; to: string }

export type FilterIdentity = {
  kind: "id" | "label-key"
  value: string
  label: string
}

export type AdvancedFilters = {
  cx: string
  surgeryDate: DateOnlyRange
  institution: FilterIdentity | null
  client: FilterIdentity | null
  availabilityDate: DateOnlyRange
  cxState: string
}

export type AdvancedFilterKey =
  | "cx"
  | "surgeryDate"
  | "institution"
  | "client"
  | "availabilityDate"
  | "cxState"

export type AdvancedFilterErrors = Partial<Record<"surgeryDate" | "availabilityDate", string>>

export type AdvancedFilterChip = {
  key: AdvancedFilterKey
  label: string
  removeLabel: string
}

export type ResolvedCoordinatorCase = CoordinatorCase & {
  resolvedAssignmentSlaBasis: AssignmentSlaBasis
}

export type MetricCounts = Readonly<Record<MetricKey, number>>

export type CoordinationBaseSnapshot = {
  contextKey: string
  evaluationNow: number
  subjectContactId: string
  cases: readonly ResolvedCoordinatorCase[]
  directMetricMemberships: ReadonlyMap<string, ReadonlySet<MetricKey>>
  counts: MetricCounts
  institutionOptions: readonly FilterIdentity[]
  clientOptions: readonly FilterIdentity[]
  diagnostics: {
    assignmentSlaBasis: {
      missing: number
      invalid: number
      byCode: Readonly<Record<string, number>>
    }
  }
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  cx: "",
  surgeryDate: { from: "", to: "" },
  institution: null,
  client: null,
  availabilityDate: { from: "", to: "" },
  cxState: "",
}

const OVERDUE_MS = 172_800_000
const PLACEHOLDER_LABELS = new Set(["—", "sin definir", "lugar sin definir", "cliente sin definir"])

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("es")
}

function normalizeIdentityLabel(value: string): string {
  return normalizeText(value).replace(/\s+/g, " ")
}

function getScheduleSortValue(value?: string): string {
  return value?.trim() || "9999-12-31"
}

export function compareCoordinationSurgeriesBySchedule(left: Surgery, right: Surgery): number {
  return getScheduleSortValue(left.date).localeCompare(getScheduleSortValue(right.date)) ||
    (left.time || "").localeCompare(right.time || "") ||
    left.patient.localeCompare(right.patient)
}

export function deriveCoordinatorBucket(surgery: Surgery): CoordinatorBucketKey | null {
  if (surgery.state === "Finalizada") return "finalizado"
  if (surgery.state === "En tránsito") return "transito"
  if (surgery.state === "Realizada" || surgery.state === "Suspendida" || surgery.state === "Cancelada") return null
  return surgery.state === "Autorizada" || surgery.autorizado ? "autorizado" : null
}

export function filterPersonalCoordinatorCases(
  entries: readonly CoordinatorCase[],
  contactId: string | null | undefined,
): CoordinatorCase[] {
  const normalizedContactId = contactId?.trim()
  if (!normalizedContactId) return []
  return entries.filter((entry) =>
    entry.surgery.coordinatorAssignmentState === "resolved" &&
    entry.surgery.coordinadorContactId === normalizedContactId,
  )
}

export function resolveSubjectAssignmentSlaBasis(
  surgery: Surgery,
  subjectContactId: string,
): AssignmentSlaBasis {
  const contactId = subjectContactId.trim()
  const matchingRows = surgery.coordinatorAssignments?.filter((assignment) => assignment.contactId === contactId) ?? []

  if (matchingRows.length === 0) {
    return { status: "missing", contactId, diagnosticCode: "resolved_assignment_row_missing" }
  }
  if (matchingRows.length > 1) {
    return { status: "invalid", contactId, diagnosticCode: "multiple_resolved_assignment_rows" }
  }

  const [assignment] = matchingRows
  if (assignment.slaBasis.status === "valid") {
    return {
      status: "valid",
      assignmentId: assignment.assignmentId,
      contactId,
      createdAt: assignment.slaBasis.createdAt,
      epochMs: assignment.slaBasis.epochMs,
    }
  }
  if (assignment.slaBasis.status === "missing") {
    return {
      status: "missing",
      assignmentId: assignment.assignmentId,
      contactId,
      diagnosticCode: assignment.slaBasis.diagnosticCode,
    }
  }
  return {
    status: "invalid",
    assignmentId: assignment.assignmentId,
    contactId,
    diagnosticCode: assignment.slaBasis.diagnosticCode,
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function normalizeDateOnly(value: string | null | undefined): string | null {
  const candidate = value?.trim()
  const match = candidate?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!candidate || !match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1) return null

  const daysByMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysByMonth[month - 1] ? candidate : null
}

function isActiveResolvedCase(entry: CoordinatorCase): boolean {
  return entry.surgery.coordinatorAssignmentState === "resolved" &&
    Boolean(entry.surgery.coordinadorContactId?.trim()) &&
    entry.bucket !== null &&
    entry.bucket !== "finalizado"
}

export function putDate(entry: CoordinatorCase): boolean {
  return isActiveResolvedCase(entry) && normalizeDateOnly(entry.surgery.date) === null
}

export function overdue(entry: ResolvedCoordinatorCase, now: number): boolean {
  const basis = entry.resolvedAssignmentSlaBasis
  return putDate(entry) &&
    basis.status === "valid" &&
    now >= basis.epochMs &&
    now - basis.epochMs >= OVERDUE_MS
}

export function coordinated(entry: CoordinatorCase): boolean {
  return normalizeDateOnly(entry.surgery.date) !== null
}

export function inTransit(entry: CoordinatorCase): boolean {
  return entry.surgery.state === "En tránsito"
}

export function matchesMetric(entry: ResolvedCoordinatorCase, metric: MetricKey, now: number, directMetricMemberships: ReadonlyMap<string, ReadonlySet<MetricKey>> = new Map()): boolean {
  const direct = directMetricMemberships.get(getCaseIdentity(entry))
  if (direct) return direct.has(metric)
  if (metric === "put-date") return putDate(entry)
  if (metric === "overdue") return overdue(entry, now)
  if (metric === "coordinated") return coordinated(entry)
  return inTransit(entry)
}

export function countMetrics(cases: readonly ResolvedCoordinatorCase[], now: number, directMetricMemberships: ReadonlyMap<string, ReadonlySet<MetricKey>> = new Map()): MetricCounts {
  return {
    "put-date": cases.filter((entry) => matchesMetric(entry, "put-date", now, directMetricMemberships)).length,
    overdue: cases.filter((entry) => matchesMetric(entry, "overdue", now, directMetricMemberships)).length,
    coordinated: cases.filter((entry) => matchesMetric(entry, "coordinated", now, directMetricMemberships)).length,
    "in-transit": cases.filter((entry) => matchesMetric(entry, "in-transit", now, directMetricMemberships)).length,
  }
}

function getCaseIdentity(entry: CoordinatorCase): string {
  return entry.surgery.backendId?.trim() || entry.surgery.id
}

function getCaseFilterIdentity(id: string | undefined, label: string): FilterIdentity | null {
  const stableId = id?.trim()
  const normalizedLabel = normalizeIdentityLabel(label)
  if (!normalizedLabel || PLACEHOLDER_LABELS.has(normalizedLabel)) return null
  if (stableId) return { kind: "id", value: stableId, label: label.trim() }
  return { kind: "label-key", value: normalizedLabel, label: label.trim() }
}

function buildOptions(
  cases: readonly CoordinatorCase[],
  readIdentity: (entry: CoordinatorCase) => FilterIdentity | null,
): FilterIdentity[] {
  const unique = new Map<string, FilterIdentity>()
  for (const entry of cases) {
    const option = readIdentity(entry)
    if (!option) continue
    const key = `${option.kind}:${option.value}`
    const current = unique.get(key)
    if (!current || compareCanonicalOptionLabels(option.label, current.label) < 0) unique.set(key, option)
  }
  return [...unique.values()].sort((left, right) =>
    normalizeIdentityLabel(left.label).localeCompare(normalizeIdentityLabel(right.label), "es") ||
    compareCodePoints(left.label.normalize("NFKC").trim(), right.label.normalize("NFKC").trim()) ||
    `${left.kind}:${left.value}`.localeCompare(`${right.kind}:${right.value}`),
  )
}

function compareCodePoints(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function compareCanonicalOptionLabels(left: string, right: string): number {
  return compareCodePoints(normalizeIdentityLabel(left), normalizeIdentityLabel(right)) ||
    compareCodePoints(left.normalize("NFKC").trim(), right.normalize("NFKC").trim())
}

export function buildInstitutionOptions(cases: readonly CoordinatorCase[]): FilterIdentity[] {
  return buildOptions(cases, (entry) =>
    getCaseFilterIdentity(entry.surgery.institutionContactId, entry.surgery.institution),
  )
}

export function buildClientOptions(cases: readonly CoordinatorCase[]): FilterIdentity[] {
  return buildOptions(cases, (entry) =>
    getCaseFilterIdentity(entry.surgery.clientContactId, entry.surgery.client),
  )
}

function assignmentDiagnostics(cases: readonly ResolvedCoordinatorCase[]) {
  const byCode: Record<string, number> = {}
  let missing = 0
  let invalid = 0

  for (const entry of cases) {
    const basis = entry.resolvedAssignmentSlaBasis
    if (basis.status === "valid") continue
    if (basis.status === "missing") missing += 1
    else invalid += 1
    byCode[basis.diagnosticCode] = (byCode[basis.diagnosticCode] ?? 0) + 1
  }

  return { missing, invalid, byCode }
}

export function normalizeCoordinationBaseSnapshot(input: {
  hasSuccessfulData: boolean
  contextKey: string
  acceptedContextKey: string
  subjectContactId: string | null | undefined
  cases: readonly CoordinatorCase[]
  directMetricMemberships?: ReadonlyMap<string, ReadonlySet<MetricKey>>
  evaluationNow: number
}): CoordinationBaseSnapshot | null {
  const subjectContactId = input.subjectContactId?.trim()
  if (!input.hasSuccessfulData || !subjectContactId || input.contextKey !== input.acceptedContextKey) return null

  const personalCases = filterPersonalCoordinatorCases(input.cases, subjectContactId)
    .map((entry) => ({
      entry,
      bucket: deriveCoordinatorBucket(entry.surgery),
    }))
    .filter(({ bucket }) => bucket !== null && bucket !== "finalizado")
    .map(({ entry, bucket }): ResolvedCoordinatorCase => ({
      ...entry,
      bucket,
      resolvedAssignmentSlaBasis: resolveSubjectAssignmentSlaBasis(entry.surgery, subjectContactId),
    }))
    .sort((left, right) =>
      compareCoordinationSurgeriesBySchedule(left.surgery, right.surgery) ||
      getCaseIdentity(left).localeCompare(getCaseIdentity(right)),
    )

  const seen = new Set<string>()
  const cases = personalCases.filter((entry) => {
    const identity = getCaseIdentity(entry)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
  const directMetricMemberships = new Map([...(input.directMetricMemberships ?? new Map())].filter(([identity]) => seen.has(identity)))

  return {
    contextKey: input.contextKey,
    evaluationNow: input.evaluationNow,
    subjectContactId,
    cases,
    directMetricMemberships,
    counts: countMetrics(cases, input.evaluationNow, directMetricMemberships),
    institutionOptions: buildInstitutionOptions(cases),
    clientOptions: buildClientOptions(cases),
    diagnostics: { assignmentSlaBasis: assignmentDiagnostics(cases) },
  }
}

export function normalizeAdvancedFilters(filters: AdvancedFilters): AdvancedFilters {
  const normalizeIdentity = (identity: FilterIdentity | null): FilterIdentity | null => identity
    ? {
        ...identity,
        value: identity.kind === "label-key" ? normalizeIdentityLabel(identity.value) : identity.value.trim(),
        label: identity.label.trim(),
      }
    : null

  return {
    cx: filters.cx.normalize("NFKC").trim(),
    surgeryDate: { from: filters.surgeryDate.from.trim(), to: filters.surgeryDate.to.trim() },
    institution: normalizeIdentity(filters.institution),
    client: normalizeIdentity(filters.client),
    availabilityDate: { from: filters.availabilityDate.from.trim(), to: filters.availabilityDate.to.trim() },
    cxState: filters.cxState.trim(),
  }
}

function validateRange(range: DateOnlyRange): string | null {
  const from = range.from ? normalizeDateOnly(range.from) : null
  const to = range.to ? normalizeDateOnly(range.to) : null
  if ((range.from && !from) || (range.to && !to)) return "Ingresá una fecha válida."
  if (from && to && from > to) return "La fecha desde no puede ser posterior a la fecha hasta."
  return null
}

export function validateAdvancedFilters(filters: AdvancedFilters): AdvancedFilterErrors {
  const errors: AdvancedFilterErrors = {}
  const surgeryDate = validateRange(filters.surgeryDate)
  const availabilityDate = validateRange(filters.availabilityDate)
  if (surgeryDate) errors.surgeryDate = surgeryDate
  if (availabilityDate) errors.availabilityDate = availabilityDate
  return errors
}

function matchesRange(value: string | undefined, range: DateOnlyRange): boolean {
  if (!range.from && !range.to) return true
  const date = normalizeDateOnly(value)
  if (!date) return false
  const from = range.from ? normalizeDateOnly(range.from) : null
  const to = range.to ? normalizeDateOnly(range.to) : null
  if (range.from && !from) return false
  if (range.to && !to) return false
  return (!from || date >= from) && (!to || date <= to)
}

function sameIdentity(caseIdentity: FilterIdentity | null, selected: FilterIdentity | null): boolean {
  if (!selected) return true
  return Boolean(caseIdentity && caseIdentity.kind === selected.kind && caseIdentity.value === selected.value)
}

export function matchesAdvancedFilters(entry: CoordinatorCase, filters: AdvancedFilters): boolean {
  const normalized = normalizeAdvancedFilters(filters)
  const query = normalizeText(normalized.cx)
  if (query && !normalizeText(entry.surgery.visibleNumber ?? "").includes(query)) return false
  if (!matchesRange(entry.surgery.date, normalized.surgeryDate)) return false
  if (!sameIdentity(
    getCaseFilterIdentity(entry.surgery.institutionContactId, entry.surgery.institution),
    normalized.institution,
  )) return false
  if (!sameIdentity(
    getCaseFilterIdentity(entry.surgery.clientContactId, entry.surgery.client),
    normalized.client,
  )) return false
  if (!matchesRange(entry.materialAvailabilityDate, normalized.availabilityDate)) return false
  if (normalized.cxState && entry.surgery.state !== normalized.cxState) return false
  return true
}

export function filterCoordinationCases(
  snapshot: CoordinationBaseSnapshot,
  selectedMetrics: ReadonlySet<MetricKey>,
  advancedFilters: AdvancedFilters,
): readonly ResolvedCoordinatorCase[] {
  const metrics = [...selectedMetrics]
  return snapshot.cases.filter((entry) =>
    metrics.every((metric) => matchesMetric(entry, metric, snapshot.evaluationNow, snapshot.directMetricMemberships)) &&
    matchesAdvancedFilters(entry, advancedFilters),
  )
}

export function hasFilterContradiction(
  selectedMetrics: ReadonlySet<MetricKey>,
  advancedFilters: AdvancedFilters,
): boolean {
  const normalized = normalizeAdvancedFilters(advancedFilters)
  const requiresMissingDate = selectedMetrics.has("put-date") || selectedMetrics.has("overdue")
  return (requiresMissingDate && selectedMetrics.has("coordinated")) ||
    (requiresMissingDate && Boolean(normalized.surgeryDate.from || normalized.surgeryDate.to))
}

export function countActiveAdvancedFilters(filters: AdvancedFilters): number {
  const normalized = normalizeAdvancedFilters(filters)
  return [
    Boolean(normalized.cx),
    Boolean(normalized.surgeryDate.from || normalized.surgeryDate.to),
    Boolean(normalized.institution),
    Boolean(normalized.client),
    Boolean(normalized.availabilityDate.from || normalized.availabilityDate.to),
    Boolean(normalized.cxState),
  ].filter(Boolean).length
}

function rangeLabel(prefix: string, range: DateOnlyRange): string {
  if (range.from && range.to) return `${prefix}: ${range.from}–${range.to}`
  if (range.from) return `${prefix}: desde ${range.from}`
  return `${prefix}: hasta ${range.to}`
}

export function buildAdvancedFilterChips(filters: AdvancedFilters): AdvancedFilterChip[] {
  const normalized = normalizeAdvancedFilters(filters)
  const chips: AdvancedFilterChip[] = []
  const add = (key: AdvancedFilterKey, label: string) => chips.push({
    key,
    label,
    removeLabel: `Quitar filtro ${label}`,
  })

  if (normalized.cx) add("cx", `CX: ${normalized.cx}`)
  if (normalized.surgeryDate.from || normalized.surgeryDate.to) add("surgeryDate", rangeLabel("Cirugía", normalized.surgeryDate))
  if (normalized.institution) add("institution", `Institución: ${normalized.institution.label}`)
  if (normalized.client) add("client", `Cliente: ${normalized.client.label}`)
  if (normalized.availabilityDate.from || normalized.availabilityDate.to) add("availabilityDate", rangeLabel("Disponibilidad", normalized.availabilityDate))
  if (normalized.cxState) add("cxState", `Estado: ${normalized.cxState}`)
  return chips
}

export function removeAdvancedFilter(filters: AdvancedFilters, key: AdvancedFilterKey): AdvancedFilters {
  const normalized = normalizeAdvancedFilters(filters)
  if (key === "cx") return { ...normalized, cx: "" }
  if (key === "surgeryDate") return { ...normalized, surgeryDate: { from: "", to: "" } }
  if (key === "institution") return { ...normalized, institution: null }
  if (key === "client") return { ...normalized, client: null }
  if (key === "availabilityDate") return { ...normalized, availabilityDate: { from: "", to: "" } }
  return { ...normalized, cxState: "" }
}
