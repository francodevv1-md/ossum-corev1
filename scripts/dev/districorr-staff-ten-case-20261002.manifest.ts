import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { validateCxStatus, type CxStatus } from "../../src/lib/validators/surgery.validator"

const yaml = createRequire(import.meta.url)("js-yaml") as {
  load(text: string, options: { schema: unknown }): unknown
  JSON_SCHEMA: unknown
}
export const MANIFEST_SURGERY_COUNT = 10
export const NELSON_DEFAULT_ALLOCATION = 8
export const COMPANY_ID = "codevdistricorr1000000000"
export const TASK_ID = "DISTRICORR-STAFF-TEN-CASE-DEV-001"

export type MockContact = {
  id: string; nombre: string; tipoPersona: string; tipoContacto: string; grupo: string
  email?: string | null; telefono?: string | null; dni?: string | null; cuit?: string | null
  [key: string]: unknown
}
export type MockItem = { description: string; quantity: number; unit: string | null; unitPrice: number | null }
export type MockPresupuesto = {
  id: string; surgeryId: string; currency: string; total: number
  authorizationNumber: string | null; items: MockItem[]
}
export type MockSurgery = {
  id: string; sourceExpediente: string; visibleNumber: string
  patientContactId: string; doctorContactId: string; payerContactId: string
  institutionContactId: string | null; surgeryDate: string; surgeryTime: string | null
  cxStatus: string; estadoFuente: string; classification: string | null; description: string | null
  authorizationNumber: string | null; totalPR: number; totalFV: number
  [key: string]: unknown
}
export type MockManifest = {
  payers: MockContact[]; patients: MockContact[]; doctors: MockContact[]
  surgeries: MockSurgery[]; presupuestos: MockPresupuesto[]
  relations: Record<string, { patient: string; doctor: string; payer: string; presupuesto: string }>
  facturacion: Array<{ surgeryId: string; totalFV: number; [key: string]: unknown }>
}
export class ManifestParseError extends Error {}

export function parseManifest(text: string): MockManifest {
  const blocks = [...text.matchAll(/^```ya?ml[^\r\n]*\r?\n([\s\S]*?)^```\s*$/gm)]
  if (!blocks.length) throw new ManifestParseError("FENCED_YAML_REQUIRED")
  let value: unknown
  try { value = yaml.load(blocks.map(m => m[1]).join("\n"), { schema: yaml.JSON_SCHEMA }) }
  catch { throw new ManifestParseError("INVALID_YAML") }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ManifestParseError("INVALID_ROOT")
  const record = value as Record<string, unknown>
  for (const key of ["payers", "patients", "doctors", "surgeries", "presupuestos", "facturacion"]) {
    if (!Array.isArray(record[key])) throw new ManifestParseError("MISSING_SECTION")
  }
  if (!record.relations || typeof record.relations !== "object" || Array.isArray(record.relations)) throw new ManifestParseError("MISSING_RELATIONS")
  return value as MockManifest
}

function validMoney(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false
  const cents = value * 100
  return Math.abs(cents - Math.round(cents)) <= Number.EPSILON * Math.max(1, cents) * 4
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function sourceDate(date: string, time: string | null): Date {
  if (!validDate(date) || (time !== null && !/^\d{2}:\d{2}$/.test(time))) throw new Error("INVALID_SOURCE_DATE")
  // Date-only values use local calendar midnight, not an asserted clinical time.
  return new Date(`${date}T${time ?? "00:00"}:00-03:00`)
}

export function validateManifest(manifest: MockManifest) {
  const issues: Array<{ code: string; message: string }> = []
  const add = (code: string) => issues.push({ code, message: code })
  if (manifest.surgeries.length !== MANIFEST_SURGERY_COUNT) add("wrong_surgery_count")
  const contacts = [...manifest.payers, ...manifest.patients, ...manifest.doctors]
  const contactIds = new Set(contacts.map(c => c.id))
  const surgeryIds = new Set(manifest.surgeries.map(s => s.id))
  const budgetIds = new Set(manifest.presupuestos.map(p => p.id))
  if (contactIds.size !== contacts.length || surgeryIds.size !== manifest.surgeries.length || budgetIds.size !== manifest.presupuestos.length) add("duplicate_id")
  for (const c of contacts) if (!c.id || typeof c.nombre !== "string" || !c.nombre.trim()) add("invalid_contact")
  for (const s of manifest.surgeries) {
    if (!s.id || !s.visibleNumber || !s.sourceExpediente) add("missing_id")
    if (![s.patientContactId, s.doctorContactId, s.payerContactId].every(id => contactIds.has(id))) add("unresolved_link")
    if (s.institutionContactId !== null && !contactIds.has(s.institutionContactId)) add("unresolved_link")
    if (!validDate(s.surgeryDate)) add("invalid_date")
    if (!validMoney(s.totalPR) || !validMoney(s.totalFV)) add("invalid_money")
    try { validateCxStatus(s.cxStatus) } catch { add("invalid_status") }
  }
  for (const p of manifest.presupuestos) {
    if (!surgeryIds.has(p.surgeryId) || !validMoney(p.total) || p.currency !== "ARS" || !Array.isArray(p.items)) add("invalid_budget")
    for (const i of p.items ?? []) {
      if (!i.description || !Number.isFinite(i.quantity) || i.quantity <= 0 || (i.unitPrice !== null && !validMoney(i.unitPrice))) add("invalid_item")
    }
  }
  for (const [id, relation] of Object.entries(manifest.relations)) {
    const s = manifest.surgeries.find(row => row.id === id)
    if (!s || relation.patient !== s.patientContactId || relation.doctor !== s.doctorContactId || relation.payer !== s.payerContactId || !budgetIds.has(relation.presupuesto)) add("unresolved_link")
  }
  return issues.length ? { ok: false as const, issues } : { ok: true as const }
}
export function assertCompleteSource(manifest: MockManifest): void {
  if (!validateManifest(manifest).ok || manifest.presupuestos.length !== 10 || manifest.facturacion.length !== 10 || Object.keys(manifest.relations).length !== 10) throw new Error("SOURCE_INCOMPLETE")
  for (const s of manifest.surgeries) {
    const p = manifest.presupuestos.filter(row => row.surgeryId === s.id)
    if (p.length !== 1 || p[0].total !== s.totalPR || manifest.relations[s.id]?.presupuesto !== p[0].id || s.totalFV !== 0) throw new Error("SOURCE_INCOMPLETE")
  }
}
export function manifestSourceHash(manifest: MockManifest): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex")
}
export function ownedId(kind: string, sourceId: string): string {
  return `dsc_${kind}_${createHash("sha256").update(`${COMPANY_ID}:${TASK_ID}:${kind}:${sourceId}`).digest("hex").slice(0, 24)}`
}
export function redactedManifestSummary(manifest: MockManifest) {
  return {
    surgeryCount: manifest.surgeries.length, payerCount: manifest.payers.length,
    patientCount: manifest.patients.length, doctorCount: manifest.doctors.length,
    presupuestoCount: manifest.presupuestos.length, sourceHash: manifestSourceHash(manifest),
  }
}
export function mapCxStatusLabels(manifest: MockManifest) {
  return manifest.surgeries.map(s => ({ sourceLabel: s.cxStatus, mapped: validateCxStatus(s.cxStatus) }))
}
export function allocateDefaultCoordinators(manifest: MockManifest, nelson: string, cristian: string) {
  if (manifest.surgeries.length !== 10) throw new Error("MANIFEST_LENGTH_MISMATCH")
  return manifest.surgeries.map((s, index) => ({ surgeryId: s.id, contactId: index < 8 ? nelson : cristian, coordinatorKey: index < 8 ? "nelson" as const : "cristian" as const }))
}
export type ProvenanceEvaluation = { provenanceGate: "PASS" | "FAIL"; statusCodes: string[] }
export function evaluateDistricorrProvenance(env: Record<string, string | undefined>): ProvenanceEvaluation {
  const statusCodes: string[] = []
  if (env.OSSUM_DEPLOYMENT_TIER !== "development") statusCodes.push("PROVENANCE_TIER_REJECTED")
  if (env.OSSUM_CODEV_DISTRICORR_COMPANY_ID !== COMPANY_ID) statusCodes.push("PROVENANCE_COMPANY_ID_MISMATCH")
  if (!(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) || !env.SUPABASE_SERVICE_ROLE_KEY) statusCodes.push("PROVENANCE_SUPABASE_CREDENTIAL_MISSING")
  if (!env.DATABASE_URL) statusCodes.push("PROVENANCE_DATABASE_CREDENTIAL_MISSING")
  return { provenanceGate: statusCodes.length ? "FAIL" : "PASS", statusCodes: statusCodes.length ? statusCodes : ["PROVENANCE_OK"] }
}
