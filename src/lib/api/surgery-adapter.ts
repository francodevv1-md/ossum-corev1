/**
 * surgery-adapter — OSSUM COR
 *
 * Maps raw surgery API payloads into UI-friendly read models.
 * Supports current flat Prisma output and future enriched relation fields.
 */

import type {
  CoordinatorAssignmentSlaBasis,
  PreparationState,
  Surgery,
  SurgeryCoordinatorAssignment,
  SurgeryClassification,
  SurgeryState,
} from "@/types"
import {
  resolveCoordinatorAssignment,
  type CoordinatorAssignmentResolutionDto,
} from "@/lib/services/surgery-coordinator-read-model"

const SURGERY_CLASSIFICATIONS: SurgeryClassification[] = [
  "Reemplazo total de rodilla",
  "Prótesis de cadera",
  "Osteosíntesis",
  "Artroscopía",
  "Columna",
  "Tobillo",
  "Hombro",
  "Descartable",
  "Otro",
]

export type RawSurgeryApiRecord = Record<string, unknown>

export type SurgeryApiRow = {
  id: string
  companyId: string | null
  source: string | null
  notes: string | null
  visibleNumber: string | null
  patientName: string | null
  doctorName: string | null
  institutionName: string | null
  institutionId: string | null
  payerName: string | null
  payerContactId: string | null
  clientName: string | null
  classification: string | null
  description: string | null
  cxStatus: string | null
  prepStatus: string | null
  status: string | null
  surgeryDate: string | null
  probableDate: string | null
  authorizationNumber: string | null
  expedienteNumber: string | null
  createdAt: string | null
  updatedAt: string | null
  legacyCoordinatorContactId: string | null
  legacyCoordinatorLabel: string | null
  coordinatorAssignments: SurgeryCoordinatorAssignment[]
  coordinatorAssignment: CoordinatorAssignmentResolutionDto | null
}

type CoordinationDevMetric = "Poner fecha" | "Fuera de plazo" | "Coordinadas" | "En tránsito"
type CoordinationDevPending = "Documentación" | "Consumo" | "Facturación"
type CoordinationDevKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

export type CoordinationEzequielDevDiagnostic = {
  code: "accepted" | "envelope_rejected"
  stableKey: CoordinationDevKey
  facts: null | {
    surgeryId: string
    companyId: string
    companyMarker: string
    organizationMarker: string
    targetContactId: string
    targetLabel: string
    targetRole: string
    cxName: string
    cxDate: string | null
    institution: "X" | "Y" | null
    client: "X" | "Y" | null
    state: "Autorizada" | "En tránsito"
    metrics: readonly CoordinationDevMetric[]
    availabilityDate: string | null
    pending: readonly CoordinationDevPending[]
    matrixDigest: string
    idAuthorityDigest: string
  }
}

const COORDINATION_DEV_PACKAGE = "coordination-ezequiel-dev-qa-002"
const COORDINATION_DEV_BASELINE_DIGEST = "c2221aa29cafa0cb0594da5b2a0638a892fc20ac9a9f50db9ff0929ec7d51782"
const COORDINATION_DEV_ID_AUTHORITY_DIGEST = "e742282463489eaaa3035be3a63a1b0c929b9b26916658e249f777cd94ae2e52"
const COORDINATION_DEV_MATRIX = [
  { stableKey: "A", surgeryId: "c9590681-82d3-5430-833a-325739743862", source: "coord-ezequiel-qa-002:A", cxName: "SYN-A", assignmentAt: "2026-07-19T12:00:00.000Z", cxDate: null, institution: "X", client: "X", availabilityDate: "2026-07-22", state: "Autorizada", metrics: ["Poner fecha", "Fuera de plazo"], pending: [] },
  { stableKey: "B", surgeryId: "48b74ece-07b2-549a-941a-8d1fce013449", source: "coord-ezequiel-qa-002:B", cxName: "SYN-B", assignmentAt: "2026-07-19T12:00:00.001Z", cxDate: null, institution: "Y", client: "X", availabilityDate: "2026-07-23", state: "Autorizada", metrics: ["Poner fecha"], pending: [] },
  { stableKey: "C", surgeryId: "9f408eac-a9d5-5153-b604-f8e29f51b32a", source: "coord-ezequiel-qa-002:C", cxName: "SYN-C", assignmentAt: null, cxDate: "2026-07-24", institution: "X", client: "Y", availabilityDate: "2026-07-25", state: "Autorizada", metrics: ["Coordinadas"], pending: [] },
  { stableKey: "D", surgeryId: "7d243a45-c030-5b07-a28f-7d9b271cd6a5", source: "coord-ezequiel-qa-002:D", cxName: "SYN-D", assignmentAt: null, cxDate: "2026-07-24", institution: "X", client: "X", availabilityDate: "2026-07-25", state: "En tránsito", metrics: ["Coordinadas", "En tránsito"], pending: [] },
  { stableKey: "E", surgeryId: "f6a783a6-2b26-5568-b9f7-949e7c42e515", source: "coord-ezequiel-qa-002:E", cxName: "SYN-E", assignmentAt: null, cxDate: null, institution: null, client: null, availabilityDate: null, state: "Autorizada", metrics: [], pending: ["Documentación"] },
  { stableKey: "F", surgeryId: "78173716-30b2-5367-b027-d87685f80c9d", source: "coord-ezequiel-qa-002:F", cxName: "SYN-F", assignmentAt: null, cxDate: null, institution: null, client: null, availabilityDate: null, state: "Autorizada", metrics: [], pending: ["Consumo"] },
  { stableKey: "G", surgeryId: "b318570e-2007-545c-9dd6-75182343c88f", source: "coord-ezequiel-qa-002:G", cxName: "SYN-G", assignmentAt: null, cxDate: null, institution: null, client: null, availabilityDate: null, state: "Autorizada", metrics: [], pending: ["Documentación", "Consumo", "Facturación"] },
  { stableKey: "H", surgeryId: "0d2ad460-cba6-540e-9ca3-521af69a21b6", source: "coord-ezequiel-qa-002:H", cxName: "SYN-H", assignmentAt: null, cxDate: null, institution: null, client: null, availabilityDate: null, state: "Autorizada", metrics: [], pending: [] },
] as const

function canonicalDevJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalDevJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalDevJson(item)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function sha256Dev(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const bitLength = bytes.length * 8
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes); padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 4, bitLength >>> 0)
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000))
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]
  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i += 1) { const s0 = rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3); const s1 = rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10); w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0 }
    let [a,b,c,d,e,f,g,hh] = h
    for (let i = 0; i < 64; i += 1) { const s1=rotr(e,6)^rotr(e,11)^rotr(e,25); const ch=(e&f)^(~e&g); const t1=(hh+s1+ch+k[i]+w[i])>>>0; const s0=rotr(a,2)^rotr(a,13)^rotr(a,22); const maj=(a&b)^(a&c)^(b&c); const t2=(s0+maj)>>>0; hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0 }
    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+hh)>>>0
  }
  return h.map((part) => part.toString(16).padStart(8,"0")).join("")
}

const coordinationDiagnostics = new WeakMap<Surgery, CoordinationEzequielDevDiagnostic>()

export function parseCoordinationEzequielDevEnvelope(row: Pick<SurgeryApiRow, "id" | "companyId" | "source" | "notes" | "visibleNumber">): CoordinationEzequielDevDiagnostic | null {
  if (process.env.NODE_ENV !== "development") return null
  const matrixDigest = sha256Dev(canonicalDevJson(COORDINATION_DEV_MATRIX))
  const matrix = COORDINATION_DEV_MATRIX.find((item) => item.surgeryId === row.id && item.source === row.source)
  if (!matrix) return null
  const rejected = (): CoordinationEzequielDevDiagnostic => ({ code: "envelope_rejected", stableKey: matrix.stableKey, facts: null })
  if (!row.notes || !row.companyId || row.visibleNumber !== matrix.cxName) return rejected()
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(row.notes) as Record<string, unknown> } catch { return rejected() }
  const company = readRecord(parsed.company)
  const target = readRecord(parsed.target)
  if (!company || !target || company.id !== row.companyId || typeof target.contactId !== "string" || !target.contactId) return rejected()
  const unsigned = {
    schemaVersion: "1.0.0", package: COORDINATION_DEV_PACKAGE, stableKey: matrix.stableKey, surgeryId: matrix.surgeryId, cxName: matrix.cxName,
    company: { id: row.companyId, marker: "Districorr DEV", organizationMarker: "ossum-dev" },
    target: { contactId: target.contactId, label: "Ezequiel DEV", role: "coordinator" },
    baselineDigest: COORDINATION_DEV_BASELINE_DIGEST, idAuthorityDigest: COORDINATION_DEV_ID_AUTHORITY_DIGEST, matrixDigest,
    metrics: matrix.metrics, availabilityDate: matrix.availabilityDate, pending: matrix.pending,
  }
  const expected = { ...unsigned, checksum: sha256Dev(JSON.stringify(unsigned)) }
  if (row.notes !== JSON.stringify(expected) || parsed.checksum !== expected.checksum) return rejected()
  return { code: "accepted", stableKey: matrix.stableKey, facts: { surgeryId: matrix.surgeryId, companyId: row.companyId, companyMarker: "Districorr DEV", organizationMarker: "ossum-dev", targetContactId: target.contactId, targetLabel: "Ezequiel DEV", targetRole: "coordinator", cxName: matrix.cxName, cxDate: matrix.cxDate, institution: matrix.institution, client: matrix.client, state: matrix.state, metrics: matrix.metrics, availabilityDate: matrix.availabilityDate, pending: matrix.pending, matrixDigest, idAuthorityDigest: COORDINATION_DEV_ID_AUTHORITY_DIGEST } }
}

export function coordinationEzequielDevDiagnostic(surgery: Surgery): CoordinationEzequielDevDiagnostic | null {
  if (process.env.NODE_ENV !== "development") return null
  return coordinationDiagnostics.get(surgery) ?? null
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readAssignmentSlaBasis(value: unknown): CoordinatorAssignmentSlaBasis {
  if (value == null) {
    return { status: "missing", diagnosticCode: "assignment_created_at_missing" }
  }

  if (typeof value !== "string" || !value.trim()) {
    return { status: "invalid", diagnosticCode: "assignment_created_at_invalid" }
  }

  const createdAt = value.trim()
  const hasExplicitOffset = /T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt)
  const epochMs = hasExplicitOffset ? Date.parse(createdAt) : Number.NaN

  if (!Number.isFinite(epochMs)) {
    return { status: "invalid", diagnosticCode: "assignment_created_at_invalid" }
  }

  return { status: "valid", createdAt, epochMs }
}

function readCoordinatorAssignments(value: unknown): SurgeryCoordinatorAssignment[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    const record = readRecord(candidate)
    if (!record) return []

    const assignmentId = readString(record.assignmentId)
    const contactId = readString(record.contactId)
    if (!assignmentId || !contactId) return []

    return [{
      assignmentId,
      contactId,
      label: readString(record.label) ?? "",
      isPrimary: record.isPrimary === true,
      slaBasis: readAssignmentSlaBasis(record.createdAt),
    }]
  })
}

function readCoordinatorAssignmentResolution(value: unknown): CoordinatorAssignmentResolutionDto | null {
  const record = readRecord(value)
  const status = readString(record?.status)
  if (!record || !status) return null

  if (status === "none" || status === "ambiguous") {
    return { status, resolved: null }
  }

  if (status !== "resolved") return null
  const resolved = readRecord(record.resolved)
  const contactId = readString(resolved?.contactId)
  if (!resolved || !contactId) return null

  return {
    status: "resolved",
    resolved: {
      contactId,
      label: readString(resolved.label) ?? "",
    },
  }
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(record[key])
    if (value) return value
  }
  return null
}

function buildPersonName(record: Record<string, unknown> | null): string | null {
  if (!record) return null

  const direct = pickString(record, ["name", "displayName", "fullName", "legalName"])
  if (direct) return direct

  const firstName = readString(record.firstName)
  const lastName = readString(record.lastName)

  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  if (lastName) return lastName

  return null
}

function pickNestedName(
  record: Record<string, unknown>,
  objectKeys: string[],
  flatKeys: string[]
): string | null {
  for (const objectKey of objectKeys) {
    const nestedName = buildPersonName(readRecord(record[objectKey]))
    if (nestedName) return nestedName
  }

  return pickString(record, flatKeys)
}

function pickAdministrativeReference(record: Record<string, unknown>, keys: string[]): string | null {
  const direct = pickString(record, keys)
  if (direct) return direct

  const references = Array.isArray(record.referenciasAdministrativas)
    ? record.referenciasAdministrativas
    : Array.isArray(record.administrativeReferences)
      ? record.administrativeReferences
      : null

  if (!references) return null

  for (const item of references) {
    const reference = readRecord(item)
    if (!reference) continue

    const tipo = readString(reference.tipo)?.toLowerCase()
    const type = readString(reference.type)?.toLowerCase()
    const value = pickString(reference, ["valor", "value", "numero", "number"])
    if (!value) continue

    if (keys.some((key) => key.toLowerCase().includes("autoriz"))) {
      if (tipo?.includes("autoriz") || type?.includes("autoriz")) return value
    }

    if (keys.some((key) => key.toLowerCase().includes("exped"))) {
      if (tipo?.includes("exped") || type?.includes("exped")) return value
    }
  }

  return null
}

export function mapApiSurgeryToRow(apiSurgery: RawSurgeryApiRecord): SurgeryApiRow {
  return {
    id: pickString(apiSurgery, ["id"]) ?? "—",
    companyId: pickString(apiSurgery, ["companyId"]),
    source: pickString(apiSurgery, ["source"]),
    notes: typeof apiSurgery.notes === "string" ? apiSurgery.notes : null,
    visibleNumber: pickString(apiSurgery, ["visibleNumber"]),
    patientName: pickNestedName(apiSurgery, ["patient", "paciente"], ["patientName", "patient", "paciente"]),
    doctorName: pickNestedName(apiSurgery, ["doctor", "medico"], ["doctorName", "surgeonName", "doctor", "medico"]),
    institutionName: pickNestedName(apiSurgery, ["institution", "institucion"], ["institutionName", "institution", "institucion"]),
    institutionId: pickString(apiSurgery, ["institutionId"]),
    payerName: pickNestedName(apiSurgery, ["payer"], ["payerName", "payer"]),
    payerContactId: pickString(apiSurgery, ["payerContactId"]),
    clientName: pickNestedName(apiSurgery, ["payer", "client", "cliente"], ["payerName", "clientName", "payer", "client", "cliente"]),
    classification: pickString(apiSurgery, ["classification"]),
    description: pickString(apiSurgery, ["description"]),
    cxStatus: pickString(apiSurgery, ["cxStatus"]),
    prepStatus: pickString(apiSurgery, ["prepStatus"]),
    status: pickString(apiSurgery, ["cxStatus", "status", "estado"]),
    surgeryDate: pickString(apiSurgery, ["surgeryDate", "fechaCirugia", "date"]),
    probableDate: pickString(apiSurgery, ["probableDate"]),
    authorizationNumber: pickAdministrativeReference(apiSurgery, [
      "authorizationNumber",
      "autorizacion",
      "authorization",
    ]),
    expedienteNumber: pickAdministrativeReference(apiSurgery, [
      "expedienteNumber",
      "expediente",
      "expedienteId",
    ]),
    createdAt: pickString(apiSurgery, ["createdAt"]),
    updatedAt: pickString(apiSurgery, ["updatedAt"]),
    legacyCoordinatorContactId: pickString(apiSurgery, ["coordinatorContactId", "coordinadorContactId"]),
    legacyCoordinatorLabel: pickString(apiSurgery, ["coordinatorLabel", "coordinadorCx"]),
    coordinatorAssignments: readCoordinatorAssignments(apiSurgery.coordinatorAssignments),
    coordinatorAssignment: readCoordinatorAssignmentResolution(apiSurgery.coordinatorAssignment),
  }
}

export function mapApiSurgeryListToRows(
  apiSurgeries: RawSurgeryApiRecord[]
): SurgeryApiRow[] {
  return apiSurgeries.map(mapApiSurgeryToRow)
}

function normalizeDate(value: string | null, fallback = ""): string {
  if (!value) return fallback
  return value.includes("T") ? value.slice(0, 10) : value
}

function normalizeSurgeryState(status: string | null): SurgeryState {
  switch (status?.trim().toLowerCase()) {
    case "draft":
    case "pending":
    case "pendiente":
    case "scheduled":
    case "preparing":
    case "en preparación":
      return "Pendiente"
    case "sin autorizar":
      return "Sin autorizar"
    case "authorized":
    case "autorizada":
      return "Autorizada"
    case "in transit":
    case "en tránsito":
      return "En tránsito"
    case "performed":
    case "realizada":
      return "Realizada"
    case "finalized":
    case "finalizada":
      return "Finalizada"
    case "suspendida":
      return "Suspendida"
    case "cancelada":
      return "Cancelada"
    default:
      return "Pendiente"
  }
}

function normalizePreparationState(status: string | null): PreparationState {
  switch (status?.trim().toLowerCase()) {
    case "sin preparar":
      return "Sin preparar"
    case "preparing":
    case "en preparación":
      return "En preparación"
    case "entregado":
      return "Entregado"
    case "shipped":
    case "enviado":
      return "Enviado"
    case "frozen":
    case "congelado":
      return "Congelado"
    case "retirado":
      return "Retirado"
    case "con faltantes":
    case "congelado con faltantes":
      return "Congelado con faltantes"
    default:
      return "Sin preparar"
  }
}

function normalizeClassification(value: string | null, fallback: SurgeryClassification = "Otro"): SurgeryClassification {
  if (!value) return fallback
  return SURGERY_CLASSIFICATIONS.includes(value as SurgeryClassification)
    ? (value as SurgeryClassification)
    : fallback
}

function buildAdministrativeReferences(row: SurgeryApiRow, existing?: Surgery) {
  const references = existing?.referenciasAdministrativas ? [...existing.referenciasAdministrativas] : []
  const pushUniqueReference = (tipo: string, valor: string | null) => {
    const trimmed = valor?.trim()
    if (!trimmed) return
    if (references.some((reference) => reference.tipo === tipo && reference.valor === trimmed)) return
    references.push({ id: `${tipo}-${trimmed}`, tipo: tipo as "Autorización" | "HC" | "DNI" | "Afiliado", valor: trimmed })
  }

  pushUniqueReference("Autorización", row.authorizationNumber)
  pushUniqueReference("HC", row.expedienteNumber)

  return references
}

export function mapApiSurgeryRowToSurgery(
  row: SurgeryApiRow,
  existing?: Surgery,
  resolvedUiId?: string
): Surgery {
  const uiId = resolvedUiId ?? (row.visibleNumber?.trim() || row.id)
  const visibleNumber = row.visibleNumber?.trim() || undefined
  const normalizedState = normalizeSurgeryState(row.status ?? row.cxStatus)
  const coordinatorAssignment = row.coordinatorAssignment ?? resolveCoordinatorAssignment(
    row.coordinatorAssignments,
    row.legacyCoordinatorContactId,
    row.legacyCoordinatorLabel,
  )
  const resolvedCoordinator = coordinatorAssignment.status === "resolved"
    ? coordinatorAssignment.resolved
    : null

  const surgery: Surgery = {
    ...existing,
    id: uiId,
    backendId: row.id,
    backendCxStatus: row.cxStatus ?? row.status ?? undefined,
    visibleNumber,
    patient: row.patientName ?? existing?.patient ?? "Paciente sin nombre",
    patientDni: existing?.patientDni ?? "",
    surgeon: row.doctorName ?? existing?.surgeon ?? "—",
    institution: row.institutionName ?? existing?.institution ?? "—",
    institutionContactId: row.institutionId ?? undefined,
    institutionCity: existing?.institutionCity ?? "",
    procedure: row.description ?? existing?.procedure ?? "",
    date: normalizeDate(row.surgeryDate, existing?.date ?? ""),
    probableDate: normalizeDate(row.probableDate, existing?.probableDate ?? "") || undefined,
    time: existing?.time ?? "",
    state: normalizedState,
    client: row.clientName ?? row.payerName ?? existing?.client ?? "—",
    clientContactId: row.payerContactId ?? undefined,
    classification: normalizeClassification(row.classification, existing?.classification ?? "Otro"),
    expedienteNumber: row.expedienteNumber ?? existing?.expedienteNumber,
    preparationState: normalizePreparationState(row.prepStatus),
    facturado: existing?.facturado ?? false,
    autorizado: existing?.autorizado ?? normalizedState === "Autorizada",
    urgente: existing?.urgente ?? false,
    leyendaDestacada: existing?.leyendaDestacada ?? false,
    referenciasAdministrativas: buildAdministrativeReferences(row, existing),
    coordinadorContactId: resolvedCoordinator?.contactId,
    coordinadorCx: resolvedCoordinator?.label || undefined,
    coordinatorAssignmentState: coordinatorAssignment.status,
    coordinatorAssignments: row.coordinatorAssignments,
  }
  const diagnostic = parseCoordinationEzequielDevEnvelope(row)
  if (diagnostic) coordinationDiagnostics.set(surgery, diagnostic)
  return surgery
}

function resolveUniqueSurgeryUiIds(rows: SurgeryApiRow[]): string[] {
  const usedIds = new Set<string>()

  return rows.map((row, index) => {
    const visibleNumberId = row.visibleNumber?.trim()
    const backendId = row.id.trim()
    const fallbackId = `backend-surgery-${index + 1}`
    const preferredId = visibleNumberId || backendId || fallbackId

    if (!usedIds.has(preferredId)) {
      usedIds.add(preferredId)
      return preferredId
    }

    const uniquenessFallbacks = [backendId, fallbackId]

    for (const candidate of uniquenessFallbacks) {
      if (candidate && !usedIds.has(candidate)) {
        usedIds.add(candidate)
        return candidate
      }
    }

    let duplicateIndex = 2
    let candidate = `${preferredId}-${duplicateIndex}`
    while (usedIds.has(candidate)) {
      duplicateIndex += 1
      candidate = `${preferredId}-${duplicateIndex}`
    }

    usedIds.add(candidate)
    return candidate
  })
}

export function mapApiSurgeryListToSurgeries(
  apiSurgeries: RawSurgeryApiRecord[],
  existingSurgeries: Surgery[] = []
): Surgery[] {
  const existingById = new Map(existingSurgeries.map((surgery) => [surgery.id, surgery]))
  const rows = mapApiSurgeryListToRows(apiSurgeries)
  const uniqueUiIds = resolveUniqueSurgeryUiIds(rows)

  return rows.map((row, index) => {
    const uiId = uniqueUiIds[index]
    const existing = existingById.get(uiId) ?? existingById.get(row.visibleNumber?.trim() || row.id)
    return mapApiSurgeryRowToSurgery(row, existing, uiId)
  })
}
