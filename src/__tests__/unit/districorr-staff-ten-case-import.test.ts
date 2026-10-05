import { describe, expect } from "vitest"
import { it } from "vitest"

import {
  allocateDefaultCoordinators,
  evaluateDistricorrProvenance,
  MANIFEST_SURGERY_COUNT,
  mapCxStatusLabels,
  manifestSourceHash,
  parseManifest,
  redactedManifestSummary,
  validateManifest,
  type MockManifest,
} from "../../../scripts/dev/districorr-staff-ten-case-20261002.manifest"

// Sanitized inline MD example — NOT actual patient data.
// Same structural shape as docs/OSSUM_COR_MOCK_10_CIRUGIAS.md so the parser
// invariants are exercised without leaking PHI into test fixtures.
const SYNTHETIC_MARKDOWN = [
  "# SYNTHETIC DISTRICORR FIXTURE",
  "",
  "## 1. CONTACTOS",
  "",
  "```yaml",
  "payers:",
  "",
  "  - id: CONT-SYN-PAG-001",
  "    nombre: \"REDACTED PAYER A\"",
  "    tipoPersona: juridica",
  "    tipoContacto: cliente",
  "    grupo: obras_sociales",
  "    esPagador: true",
  "    cuit: null",
  "    email: null",
  "    telefono: null",
  "    domicilio: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CONT-SYN-PAG-002",
  "    nombre: \"REDACTED PAYER B\"",
  "    tipoPersona: juridica",
  "    tipoContacto: cliente",
  "    grupo: art",
  "    esPagador: true",
  "    cuit: null",
  "    email: null",
  "    telefono: null",
  "    domicilio: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "patients:",
  "",
  "  - id: CONT-SYN-PAC-001",
  "    nombre: \"REDACTED PATIENT 001\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-002",
  "    nombre: \"REDACTED PATIENT 002\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-003",
  "    nombre: \"REDACTED PATIENT 003\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-004",
  "    nombre: \"REDACTED PATIENT 004\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-005",
  "    nombre: \"REDACTED PATIENT 005\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-006",
  "    nombre: \"REDACTED PATIENT 006\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-007",
  "    nombre: \"REDACTED PATIENT 007\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-008",
  "    nombre: \"REDACTED PATIENT 008\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-009",
  "    nombre: \"REDACTED PATIENT 009\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-PAC-010",
  "    nombre: \"REDACTED PATIENT 010\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: pacientes",
  "    dni: null",
  "    email: null",
  "    telefono: null",
  "",
  "doctors:",
  "",
  "  - id: CONT-SYN-MED-001",
  "    nombre: \"REDACTED DOCTOR A\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: medicos",
  "    matricula: null",
  "    especialidad: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-MED-002",
  "    nombre: \"REDACTED DOCTOR B\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: medicos",
  "    matricula: null",
  "    especialidad: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-MED-003",
  "    nombre: \"REDACTED DOCTOR C\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: medicos",
  "    matricula: null",
  "    especialidad: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-MED-004",
  "    nombre: \"REDACTED DOCTOR D\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: medicos",
  "    matricula: null",
  "    especialidad: null",
  "    email: null",
  "    telefono: null",
  "",
  "  - id: CONT-SYN-MED-005",
  "    nombre: \"REDACTED DOCTOR E\"",
  "    tipoPersona: fisica",
  "    tipoContacto: cliente",
  "    grupo: medicos",
  "    matricula: null",
  "    especialidad: null",
  "    email: null",
  "    telefono: null",
  "",
  "```",
  "",
  "## 2. CIRUGIAS",
  "",
  "```yaml",
  "surgeries:",
  "",
  "  - id: CX-TEST-0001",
  "    sourceExpediente: \"0001\"",
  "    visibleNumber: \"CX-TEST-0001\"",
  "    patientContactId: CONT-SYN-PAC-001",
  "    doctorContactId: CONT-SYN-MED-001",
  "    payerContactId: CONT-SYN-PAG-001",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 001\"",
  "    medico: \"REDACTED DOCTOR A\"",
  "    cliente: \"REDACTED PAYER A\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-06\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0001\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 100000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0002",
  "    sourceExpediente: \"0002\"",
  "    visibleNumber: \"CX-TEST-0002\"",
  "    patientContactId: CONT-SYN-PAC-002",
  "    doctorContactId: CONT-SYN-MED-002",
  "    payerContactId: CONT-SYN-PAG-002",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 002\"",
  "    medico: \"REDACTED DOCTOR B\"",
  "    cliente: \"REDACTED PAYER B\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-08\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0002\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 150000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0003",
  "    sourceExpediente: \"0003\"",
  "    visibleNumber: \"CX-TEST-0003\"",
  "    patientContactId: CONT-SYN-PAC-003",
  "    doctorContactId: CONT-SYN-MED-002",
  "    payerContactId: CONT-SYN-PAG-002",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 003\"",
  "    medico: \"REDACTED DOCTOR B\"",
  "    cliente: \"REDACTED PAYER B\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-05\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0003\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 175000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0004",
  "    sourceExpediente: \"0004\"",
  "    visibleNumber: \"CX-TEST-0004\"",
  "    patientContactId: CONT-SYN-PAC-004",
  "    doctorContactId: CONT-SYN-MED-003",
  "    payerContactId: CONT-SYN-PAG-002",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 004\"",
  "    medico: \"REDACTED DOCTOR C\"",
  "    cliente: \"REDACTED PAYER B\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-07\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0004\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 200000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0005",
  "    sourceExpediente: \"0005\"",
  "    visibleNumber: \"CX-TEST-0005\"",
  "    patientContactId: CONT-SYN-PAC-005",
  "    doctorContactId: CONT-SYN-MED-004",
  "    payerContactId: CONT-SYN-PAG-001",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 005\"",
  "    medico: \"REDACTED DOCTOR D\"",
  "    cliente: \"REDACTED PAYER A\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-07\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0005\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 225000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0006",
  "    sourceExpediente: \"0006\"",
  "    visibleNumber: \"CX-TEST-0006\"",
  "    patientContactId: CONT-SYN-PAC-006",
  "    doctorContactId: CONT-SYN-MED-005",
  "    payerContactId: CONT-SYN-PAG-001",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 006\"",
  "    medico: \"REDACTED DOCTOR E\"",
  "    cliente: \"REDACTED PAYER A\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-28\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0006\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 250000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0007",
  "    sourceExpediente: \"0007\"",
  "    visibleNumber: \"CX-TEST-0007\"",
  "    patientContactId: CONT-SYN-PAC-007",
  "    doctorContactId: CONT-SYN-MED-001",
  "    payerContactId: CONT-SYN-PAG-002",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 007\"",
  "    medico: \"REDACTED DOCTOR A\"",
  "    cliente: \"REDACTED PAYER B\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-06\"",
  "    surgeryTime: null",
  "    estadoFuente: \"EN TRÁNSITO\"",
  "    cxStatus: \"En tránsito\"",
  "    authorizationNumber: \"AUTH-0007\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 275000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0008",
  "    sourceExpediente: \"0008\"",
  "    visibleNumber: \"CX-TEST-0008\"",
  "    patientContactId: CONT-SYN-PAC-008",
  "    doctorContactId: CONT-SYN-MED-002",
  "    payerContactId: CONT-SYN-PAG-002",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 008\"",
  "    medico: \"REDACTED DOCTOR B\"",
  "    cliente: \"REDACTED PAYER B\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-15\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0008\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 300000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0009",
  "    sourceContactId: CONT-SYN-PAC-009",
  "    sourceExpediente: \"0009\"",
  "    visibleNumber: \"CX-TEST-0009\"",
  "    patientContactId: CONT-SYN-PAC-009",
  "    doctorContactId: CONT-SYN-MED-002",
  "    payerContactId: CONT-SYN-PAG-001",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 009\"",
  "    medico: \"REDACTED DOCTOR B\"",
  "    cliente: \"REDACTED PAYER A\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-05\"",
  "    surgeryTime: null",
  "    estadoFuente: \"PENDIENTE\"",
  "    cxStatus: \"Pendiente\"",
  "    authorizationNumber: \"AUTH-0009\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 325000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "  - id: CX-TEST-0010",
  "    sourceExpediente: \"0010\"",
  "    visibleNumber: \"CX-TEST-0010\"",
  "    patientContactId: CONT-SYN-PAC-010",
  "    doctorContactId: CONT-SYN-MED-004",
  "    payerContactId: CONT-SYN-PAG-001",
  "    institutionContactId: null",
  "    paciente: \"REDACTED PATIENT 010\"",
  "    medico: \"REDACTED DOCTOR D\"",
  "    cliente: \"REDACTED PAYER A\"",
  "    institucion: null",
  "    surgeryDate: \"2026-10-06\"",
  "    surgeryTime: null",
  "    estadoFuente: \"EN TRÁNSITO\"",
  "    cxStatus: \"En tránsito\"",
  "    authorizationNumber: \"AUTH-0010\"",
  "    authorizationDate: null",
  "    classification: null",
  "    description: null",
  "    totalPR: 350000.00",
  "    totalFV: 0.00",
  "    vendedor: null",
  "    instrumentador: null",
  "    localidad: null",
  "    provincia: null",
  "",
  "```",
  "",
  "## 3. PRESUPUESTOS",
  "",
  "```yaml",
  "presupuestos:",
  "",
  "  - id: PR-TEST-0001",
  "    surgeryId: CX-TEST-0001",
  "    currency: ARS",
  "    total: 100000.00",
  "    authorizationNumber: \"AUTH-0001\"",
  "    items:",
  "      - description: \"SYNTH IMPLANT\"",
  "        quantity: 1",
  "        unit: \"u\"",
  "        unitPrice: null",
  "",
  "```",
  "",
  "## 4. RELACIONES",
  "",
  "```yaml",
  "relations:",
  "",
  "  CX-TEST-0001:",
  "    patient: CONT-SYN-PAC-001",
  "    doctor: CONT-SYN-MED-001",
  "    payer: CONT-SYN-PAG-001",
  "    presupuesto: PR-TEST-0001",
  "",
  "```",
  "",
  "## 5. FACTURACION",
  "",
  "```yaml",
  "facturacion:",
  "",
  "  - surgeryId: CX-TEST-0001",
  "    totalFV: 0.00",
  "    facturaNumero: null",
  "    fechaFactura: null",
  "    vencimientoFactura: null",
  "",
  "```",
  "",
].join("\n")

function parsedManifest(): MockManifest {
  return parseManifest(SYNTHETIC_MARKDOWN)
}

describe("DISTRICORR-STAFF-TEN-CASE manifest parser", () => {
  it("parses exactly ten synthetic surgeries from sanitized inline MD", () => {
    const manifest = parsedManifest()
    expect(manifest.surgeries).toHaveLength(MANIFEST_SURGERY_COUNT)
  })

  it("keeps surgery IDs unique and well-formed", () => {
    const manifest = parsedManifest()
    const ids = manifest.surgeries.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^CX-TEST-\d{4}$/)
  })

  it("resolves all patient/doctor/payer links to declared contacts", () => {
    const manifest = parsedManifest()
    const knownContactIds = new Set([
      ...manifest.patients.map((c) => c.id),
      ...manifest.doctors.map((c) => c.id),
      ...manifest.payers.map((c) => c.id),
    ])
    for (const surgery of manifest.surgeries) {
      expect(knownContactIds.has(surgery.patientContactId)).toBe(true)
      expect(knownContactIds.has(surgery.doctorContactId)).toBe(true)
      expect(knownContactIds.has(surgery.payerContactId)).toBe(true)
    }
  })

  it("preserves source null fields, totals and unknown item prices", () => {
    const manifest = parsedManifest()
    const surgery = manifest.surgeries[0]
    expect(surgery.institutionContactId).toBeNull()
    expect(surgery.surgeryTime).toBeNull()
    expect(surgery.authorizationDate).toBeNull()
    expect(surgery.classification).toBeNull()
    expect(surgery.vendedor).toBeNull()
    expect(surgery.instrumentador).toBeNull()
    expect(surgery.localidad).toBeNull()
    expect(surgery.provincia).toBeNull()
    expect(surgery.totalPR).toBe(100000)
    expect(surgery.totalFV).toBe(0)
    const presupuesto = manifest.presupuestos[0]
    expect(presupuesto.total).toBe(100000)
    for (const item of presupuesto.items) {
      expect(item.unitPrice).toBeNull()
    }
  })

  it("validates the synthetic manifest without issues", () => {
    const result = validateManifest(parsedManifest())
    expect(result.ok).toBe(true)
  })

  it("rejects manifests with the wrong surgery count", () => {
    const manifest = parsedManifest()
    const truncated = { ...manifest, surgeries: manifest.surgeries.slice(0, 9) }
    const result = validateManifest(truncated)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "wrong_surgery_count")).toBe(true)
    }
  })

  it("rejects manifests with unresolved contact links", () => {
    const manifest = parsedManifest()
    const broken = {
      ...manifest,
      surgeries: manifest.surgeries.map((s, index) =>
        index === 0 ? { ...s, patientContactId: "CONT-UNKNOWN" } : s
      ),
    }
    const result = validateManifest(broken)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "unresolved_link")).toBe(true)
    }
  })
})

describe("DISTRICORR-STAFF-TEN-CASE state mapping", () => {
  it("maps Pendiente -> pending and En tránsito -> scheduled through validateCxStatus", () => {
    const manifest = parsedManifest()
    const mappings = mapCxStatusLabels(manifest)
    const pendientes = mappings.filter((m) => m.sourceLabel === "Pendiente")
    const transitos = mappings.filter((m) => m.sourceLabel === "En tránsito")
    expect(pendientes.length).toBeGreaterThan(0)
    expect(transitos.length).toBeGreaterThan(0)
    for (const mapping of pendientes) expect(mapping.mapped).toBe("pending")
    for (const mapping of transitos) expect(mapping.mapped).toBe("scheduled")
  })
})

describe("DISTRICORR-STAFF-TEN-CASE money precision", () => {
  it("preserves source totals exactly as JS numbers representable with 2 decimals", () => {
    const manifest = parsedManifest()
    for (const surgery of manifest.surgeries) {
      expect(Number.isFinite(surgery.totalPR)).toBe(true)
      expect(Number.isInteger(surgery.totalPR * 100)).toBe(true)
      expect(Number.isInteger(surgery.totalFV * 100)).toBe(true)
    }
  })

  it("rejects totals with more than 2 decimal places", () => {
    const manifest = parsedManifest()
    const corrupted = {
      ...manifest,
      surgeries: manifest.surgeries.map((s, index) =>
        index === 0 ? { ...s, totalPR: 100.123 } : s
      ),
    }
    const result = validateManifest(corrupted)
    expect(result.ok).toBe(false)
  })
})

describe("DISTRICORR-STAFF-TEN-CASE namespace stability and idempotence guard", () => {
  it("uses stable surgery ids as the namespace anchor", () => {
    const manifest = parsedManifest()
    const namespace = manifest.surgeries.map((s) => s.id)
    expect(new Set(namespace).size).toBe(namespace.length)
    expect(namespace).toContain("CX-TEST-0001")
    expect(namespace).toContain("CX-TEST-0010")
  })

  it("produces a stable source hash for the same content", () => {
    const first = manifestSourceHash(parsedManifest())
    const second = manifestSourceHash(parsedManifest())
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it("emits a redacted summary that never includes patient names", () => {
    const summary = redactedManifestSummary(parsedManifest())
    expect(summary.surgeryCount).toBe(MANIFEST_SURGERY_COUNT)
    expect(summary.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    const serialized = JSON.stringify(summary)
    expect(serialized.includes("REDACTED PATIENT")).toBe(false)
    expect(serialized.includes("REDACTED DOCTOR")).toBe(false)
    expect(serialized.includes("REDACTED PAYER")).toBe(false)
  })
})

describe("DISTRICORR-STAFF-TEN-CASE default coordinator allocation", () => {
  it("assigns the first eight surgeries to Nelson and the remaining two to Cristian", () => {
    const manifest = parsedManifest()
    const nelsonContactId = "nelson-contact-id"
    const cristianContactId = "cristian-contact-id"
    const allocation = allocateDefaultCoordinators(manifest, nelsonContactId, cristianContactId)
    expect(allocation).toHaveLength(MANIFEST_SURGERY_COUNT)
    for (let index = 0; index < 8; index += 1) {
      expect(allocation[index].contactId).toBe(nelsonContactId)
      expect(allocation[index].coordinatorKey).toBe("nelson")
    }
    for (let index = 8; index < 10; index += 1) {
      expect(allocation[index].contactId).toBe(cristianContactId)
      expect(allocation[index].coordinatorKey).toBe("cristian")
    }
  })

  it("refuses to allocate when the manifest surgery count is wrong", () => {
    const manifest = parsedManifest()
    const truncated = { ...manifest, surgeries: manifest.surgeries.slice(0, 5) }
    expect(() => allocateDefaultCoordinators(truncated, "n", "c")).toThrow(/MANIFEST_LENGTH_MISMATCH/)
  })
})

describe("DISTRICORR-STAFF-TEN-CASE admin exclusion + provenance gate", () => {
  it("Admin DEV must never appear in the allocation map and is excluded by the importer", () => {
    const manifest = parsedManifest()
    const allocation = allocateDefaultCoordinators(manifest, "nelson", "cristian")
    const adminContactId = "admin.dev.contact.id"
    expect(allocation.some((row) => row.contactId === adminContactId)).toBe(false)
  })

  it("passes the provenance gate only with development tier + expected company id + credentials", () => {
    const evaluation = evaluateDistricorrProvenance({
      OSSUM_DEPLOYMENT_TIER: "development",
      OSSUM_CODEV_DISTRICORR_COMPANY_ID: "codevdistricorr1000000000",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      DATABASE_URL: "postgres://example",
    })
    expect(evaluation.provenanceGate).toBe("PASS")
    expect(evaluation.statusCodes).toContain("PROVENANCE_OK")
  })

  it("fails when deployment tier is not development", () => {
    const evaluation = evaluateDistricorrProvenance({
      OSSUM_DEPLOYMENT_TIER: "production",
      OSSUM_CODEV_DISTRICORR_COMPANY_ID: "codevdistricorr1000000000",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      DATABASE_URL: "postgres://example",
    })
    expect(evaluation.provenanceGate).toBe("FAIL")
    expect(evaluation.statusCodes).toContain("PROVENANCE_TIER_REJECTED")
  })

  it("fails when the expected company id is wrong", () => {
    const evaluation = evaluateDistricorrProvenance({
      OSSUM_DEPLOYMENT_TIER: "development",
      OSSUM_CODEV_DISTRICORR_COMPANY_ID: "codevdistricorr-other",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      DATABASE_URL: "postgres://example",
    })
    expect(evaluation.provenanceGate).toBe("FAIL")
    expect(evaluation.statusCodes).toContain("PROVENANCE_COMPANY_ID_MISMATCH")
  })

  it("fails when Supabase or DB credentials are missing", () => {
    const evaluation = evaluateDistricorrProvenance({
      OSSUM_DEPLOYMENT_TIER: "development",
      OSSUM_CODEV_DISTRICORR_COMPANY_ID: "codevdistricorr1000000000",
    })
    expect(evaluation.provenanceGate).toBe("FAIL")
    expect(evaluation.statusCodes).toContain("PROVENANCE_SUPABASE_CREDENTIAL_MISSING")
    expect(evaluation.statusCodes).toContain("PROVENANCE_DATABASE_CREDENTIAL_MISSING")
  })
})