/**
 * surgery-adapter — OSSUM COR
 *
 * Maps raw surgery API payloads into a minimal read-only UI shape.
 * Supports current flat Prisma output and future enriched relation fields.
 */

export type RawSurgeryApiRecord = Record<string, unknown>

export type SurgeryApiRow = {
  id: string
  patientName: string | null
  doctorName: string | null
  institutionName: string | null
  payerName: string | null
  clientName: string | null
  status: string | null
  surgeryDate: string | null
  authorizationNumber: string | null
  expedienteNumber: string | null
  createdAt: string | null
  updatedAt: string | null
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
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
    patientName: pickNestedName(apiSurgery, ["patient", "paciente"], ["patientName", "patient", "paciente"]),
    doctorName: pickNestedName(apiSurgery, ["doctor", "medico"], ["doctorName", "surgeonName", "doctor", "medico"]),
    institutionName: pickNestedName(apiSurgery, ["institution", "institucion"], ["institutionName", "institution", "institucion"]),
    payerName: pickNestedName(apiSurgery, ["payer", "client", "cliente"], ["payerName", "clientName", "payer", "client", "cliente"]),
    clientName: pickNestedName(apiSurgery, ["payer", "client", "cliente"], ["payerName", "clientName", "payer", "client", "cliente"]),
    status: pickString(apiSurgery, ["cxStatus", "status", "estado"]),
    surgeryDate: pickString(apiSurgery, ["surgeryDate", "fechaCirugia", "date"]),
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
  }
}

export function mapApiSurgeryListToRows(
  apiSurgeries: RawSurgeryApiRecord[]
): SurgeryApiRow[] {
  return apiSurgeries.map(mapApiSurgeryToRow)
}
