import { afterEach, describe, expect, it, vi } from "vitest"

import { coordinationEzequielDevDiagnostic, mapApiSurgeryListToSurgeries, parseCoordinationEzequielDevEnvelope } from "@/lib/api/surgery-adapter"
import { OVERLAY_FIXTURES, OVERLAY_ID_AUTHORITY_DIGEST, OVERLAY_MATRIX_DIGEST, buildOverlayEnvelope } from "@/lib/services/coordination-ezequiel-dev-overlay.service"
import type { Surgery } from "@/types"

const existingLocalSurgery: Surgery = {
  id: "CX-0006",
  patient: "Paciente Local",
  patientDni: "30111222",
  surgeon: "Dr. Local",
  institution: "Institución Local",
  institutionCity: "Córdoba",
  procedure: "Procedimiento local",
  date: "2026-05-20",
  time: "08:00",
  state: "Sin autorizar",
  client: "Cliente Local",
  classification: "Prótesis de cadera",
  preparationState: "Congelado",
  facturado: false,
  autorizado: false,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [{ id: "existing-ref", tipo: "Autorización", valor: "AUT-LOCAL" }],
}

afterEach(() => vi.unstubAllEnvs())

describe("mapApiSurgeryListToSurgeries", () => {
  it("accepts only canonical DEV envelope bytes bound to the frozen UUID/source/matrix", () => {
    vi.stubEnv("NODE_ENV", "development")
    const fixture = OVERLAY_FIXTURES[0]
    const envelope = buildOverlayEnvelope(fixture, "company-dev", "target-dev")
    const [surgery] = mapApiSurgeryListToSurgeries([{
      id: fixture.surgeryId,
      companyId: "company-dev",
      source: fixture.externalKey,
      notes: envelope.bytes,
      visibleNumber: fixture.cxName,
      cxStatus: "authorized",
      coordinatorAssignment: { status: "resolved", resolved: { contactId: "target-dev", label: "Ezequiel DEV" } },
      coordinatorAssignments: [{ assignmentId: "assignment-dev", contactId: "target-dev", label: "Ezequiel DEV", createdAt: fixture.assignmentAt }],
    }])

    expect(coordinationEzequielDevDiagnostic(surgery)).toMatchObject({
      code: "accepted",
      stableKey: "A",
      facts: { surgeryId: fixture.surgeryId, idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST, matrixDigest: OVERLAY_MATRIX_DIGEST },
    })
  })

  it.each(["bytes", "id", "source", "digest"])("rejects %s tamper without inferring synthetic facts", (variant) => {
    vi.stubEnv("NODE_ENV", "development")
    const fixture = OVERLAY_FIXTURES[0]
    const envelope = buildOverlayEnvelope(fixture, "company-dev", "target-dev")
    const parsed = JSON.parse(envelope.bytes) as Record<string, unknown>
    if (variant === "digest") parsed.matrixDigest = "tampered"
    const row = {
      id: variant === "id" ? OVERLAY_FIXTURES[1].surgeryId : fixture.surgeryId,
      companyId: "company-dev",
      source: variant === "source" ? "coord-ezequiel-qa-002:B" : fixture.externalKey,
      notes: variant === "bytes" ? `${envelope.bytes} ` : variant === "digest" ? JSON.stringify(parsed) : envelope.bytes,
      visibleNumber: fixture.cxName,
    }
    const diagnostic = parseCoordinationEzequielDevEnvelope(row)
    expect(diagnostic?.facts ?? null).toBeNull()
  })

  it("is inert when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production")
    const fixture = OVERLAY_FIXTURES[0]
    const envelope = buildOverlayEnvelope(fixture, "company-dev", "target-dev")
    expect(parseCoordinationEzequielDevEnvelope({ id: fixture.surgeryId, companyId: "company-dev", source: fixture.externalKey, notes: envelope.bytes, visibleNumber: fixture.cxName })).toBeNull()
  })
  it("keeps backend technical id separately and exposes visibleNumber", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "db-surgery-1",
        visibleNumber: "CX-0006",
        patient: { firstName: "Ana", lastName: "Pérez" },
        doctor: { legalName: "Dr. Backend" },
        institution: { legalName: "Hospital Backend" },
        payer: { legalName: "OSDE" },
        classification: "Prótesis de cadera",
        description: "Artroplastía",
        cxStatus: "Autorizada",
        prepStatus: "frozen",
        surgeryDate: "2026-07-01T10:00:00.000Z",
        expedienteNumber: "EXP-900",
        authorizationNumber: "AUT-900",
      },
    ], [existingLocalSurgery])

    expect(surgeries).toHaveLength(1)
    expect(surgeries[0].id).toBe("CX-0006")
    expect(surgeries[0].backendId).toBe("db-surgery-1")
    expect(surgeries[0].visibleNumber).toBe("CX-0006")
    expect(surgeries[0].patient).toBe("Ana Pérez")
    expect(surgeries[0].surgeon).toBe("Dr. Backend")
    expect(surgeries[0].institution).toBe("Hospital Backend")
    expect(surgeries[0].state).toBe("Autorizada")
    expect(surgeries[0].preparationState).toBe("Congelado")
    expect(surgeries[0].time).toBe(new Date("2026-07-01T10:00:00.000Z").toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }))
    expect(surgeries[0].referenciasAdministrativas.some((reference) => reference.valor === "AUT-900")).toBe(true)
  })

  it("creates a minimal surgery shape for backend-only records without reviving local mocks", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "db-surgery-2",
        patient: { legalName: "Paciente Backend" },
        payer: { legalName: "Swiss Medical" },
        cxStatus: "Pendiente",
        prepStatus: "Sin preparar",
      },
    ], [existingLocalSurgery])

    expect(surgeries).toHaveLength(1)
    expect(surgeries[0].id).toBe("db-surgery-2")
    expect(surgeries[0].backendId).toBe("db-surgery-2")
    expect(surgeries[0].visibleNumber).toBeUndefined()
    expect(surgeries[0].patient).toBe("Paciente Backend")
    expect(surgeries[0].client).toBe("Swiss Medical")
    expect(surgeries[0].classification).toBe("Otro")
  })

  it("maps the persisted performed status to Realizada while retaining its backend value", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      { id: "db-surgery-performed", cxStatus: "performed" },
    ])

    expect(surgeries[0].state).toBe("Realizada")
    expect(surgeries[0].backendCxStatus).toBe("performed")
  })

  it("hydrates canonical availability and urgency instead of shipping-derived local state", () => {
    const [surgery] = mapApiSurgeryListToSurgeries([{
      id: "db-surgery-canonical-management",
      materialAvailabilityDate: "2026-07-25T00:00:00.000Z",
      materialShippingDate: "2026-07-24T00:00:00.000Z",
      materialTransport: "Logística Sur",
      priority: "urgent",
    }])

    expect(surgery.materialAvailabilityDate).toBe("2026-07-25")
    expect(surgery.fechaEnvioMaterial).toBe("2026-07-24")
    expect(surgery.materialTransport).toBe("Logística Sur")
    expect(surgery.urgente).toBe(true)
  })

  it("clears stale local shipping and transport when canonical backend values are null", () => {
    const [surgery] = mapApiSurgeryListToSurgeries([{
      id: "db-surgery-clear-logistics",
      visibleNumber: "CX-0006",
      materialShippingDate: null,
      materialTransport: null,
      priority: null,
    }], [{
      ...existingLocalSurgery,
      fechaEnvioMaterial: "2026-07-24",
      materialTransport: "Transporte anterior",
      urgente: true,
    }])

    expect(surgery.fechaEnvioMaterial).toBeUndefined()
    expect(surgery.materialTransport).toBeUndefined()
    expect(surgery.urgente).toBe(false)
  })

  it("hydrates surgery date and time in the same local timezone across midnight", () => {
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires")
    const [surgery] = mapApiSurgeryListToSurgeries([{
      id: "db-surgery-late",
      surgeryDate: "2026-08-21T02:30:00.000Z",
    }])

    expect(surgery.date).toBe("2026-08-20")
    expect(surgery.time).toBe("23:30")
  })

  it("falls back to backend id when visibleNumber collides so UI ids stay unique", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "db-surgery-5",
        visibleNumber: "CX-0005",
        patient: { legalName: "Paciente Uno" },
      },
      {
        id: "db-surgery-5-duplicate",
        visibleNumber: "CX-0005",
        patient: { legalName: "Paciente Dos" },
      },
    ])

    expect(surgeries).toHaveLength(2)
    expect(surgeries.map((surgery) => surgery.id)).toEqual(["CX-0005", "db-surgery-5-duplicate"])
    expect(surgeries.map((surgery) => surgery.backendId)).toEqual(["db-surgery-5", "db-surgery-5-duplicate"])
    expect(surgeries.map((surgery) => surgery.visibleNumber)).toEqual(["CX-0005", "CX-0005"])
    expect(new Set(surgeries.map((surgery) => surgery.id)).size).toBe(2)
  })

  it("maps relational-only and flat-only coordinator assignments", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "relational",
        coordinatorAssignments: [{
          assignmentId: "assignment-1",
          contactId: "K1",
          label: "Nelson Gonzalez",
          isPrimary: false,
          createdAt: "2026-07-16T10:00:00.000Z",
        }],
      },
      {
        id: "flat",
        coordinatorContactId: "K2",
        coordinadorCx: "Ezequiel DEV",
      },
    ])

    expect(surgeries[0]).toMatchObject({
      coordinadorContactId: "K1",
      coordinadorCx: "Nelson Gonzalez",
      coordinatorAssignmentState: "resolved",
      coordinatorAssignments: [{
        assignmentId: "assignment-1",
        contactId: "K1",
        slaBasis: {
          status: "valid",
          createdAt: "2026-07-16T10:00:00.000Z",
          epochMs: Date.parse("2026-07-16T10:00:00.000Z"),
        },
      }],
    })
    expect(surgeries[1]).toMatchObject({
      coordinadorContactId: "K2",
      coordinadorCx: "Ezequiel DEV",
      coordinatorAssignmentState: "resolved",
    })
  })

  it("preserves server-authorized ownership when the exact assignment timestamp is missing or invalid", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "missing-time",
        coordinatorAssignment: {
          status: "resolved",
          resolved: { contactId: "K1", label: "Authoritative subject" },
        },
        coordinatorAssignments: [{
          assignmentId: "assignment-missing",
          contactId: "K1",
          label: "Relational subject",
          isPrimary: false,
        }],
      },
      {
        id: "invalid-time",
        coordinatorAssignment: {
          status: "resolved",
          resolved: { contactId: "K2", label: "Authoritative subject 2" },
        },
        coordinatorAssignments: [{
          assignmentId: "assignment-invalid",
          contactId: "K2",
          label: "Relational subject 2",
          isPrimary: true,
          createdAt: "not-an-instant",
        }],
      },
    ])

    expect(surgeries[0]).toMatchObject({
      coordinadorContactId: "K1",
      coordinadorCx: "Authoritative subject",
      coordinatorAssignmentState: "resolved",
      coordinatorAssignments: [{
        assignmentId: "assignment-missing",
        contactId: "K1",
        slaBasis: {
          status: "missing",
          diagnosticCode: "assignment_created_at_missing",
        },
      }],
    })
    expect(surgeries[1]).toMatchObject({
      coordinadorContactId: "K2",
      coordinadorCx: "Authoritative subject 2",
      coordinatorAssignmentState: "resolved",
      coordinatorAssignments: [{
        assignmentId: "assignment-invalid",
        contactId: "K2",
        slaBasis: {
          status: "invalid",
          diagnosticCode: "assignment_created_at_invalid",
        },
      }],
    })
  })

  it("preserves valid assignment identity when isPrimary is missing or malformed", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "non-authoritative-primary",
      coordinatorAssignment: {
        status: "resolved",
        resolved: { contactId: "K1", label: "Subject" },
      },
      coordinatorAssignments: [
        {
          assignmentId: "primary-missing",
          contactId: "K1",
          label: "Subject",
          createdAt: "2026-07-16T10:00:00.000Z",
        },
        {
          assignmentId: "primary-malformed",
          contactId: "K1",
          label: "Subject",
          isPrimary: "true",
          createdAt: "2026-07-16T11:00:00.000Z",
        },
      ],
    }])

    expect(surgeries[0].coordinatorAssignments).toMatchObject([
      { assignmentId: "primary-missing", contactId: "K1", isPrimary: false },
      { assignmentId: "primary-malformed", contactId: "K1", isPrimary: false },
    ])
  })

  it("classifies present empty and whitespace createdAt values as invalid", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "blank-created-at",
      coordinatorAssignments: [
        { assignmentId: "empty", contactId: "K1", label: "Subject", isPrimary: false, createdAt: "" },
        { assignmentId: "whitespace", contactId: "K1", label: "Subject", isPrimary: false, createdAt: "   " },
      ],
    }])

    expect(surgeries[0].coordinatorAssignments?.map((assignment) => assignment.slaBasis)).toEqual([
      { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
      { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
    ])
  })

  it("classifies a present non-string createdAt value as invalid", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "non-string-created-at",
      coordinatorAssignments: [{
        assignmentId: "numeric-created-at",
        contactId: "K1",
        label: "Subject",
        isPrimary: false,
        createdAt: 1_721_124_000_000,
      }],
    }])

    expect(surgeries[0].coordinatorAssignments).toMatchObject([{
      assignmentId: "numeric-created-at",
      slaBasis: { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
    }])
  })

  it("accepts explicit numeric offsets and rejects date-only or browser-local timestamps", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "timestamp-quality",
      coordinatorAssignment: {
        status: "resolved",
        resolved: { contactId: "K1", label: "Subject" },
      },
      coordinatorAssignments: [
        {
          assignmentId: "offset",
          contactId: "K1",
          label: "Subject",
          isPrimary: false,
          createdAt: "2026-07-16T07:00:00.000-03:00",
        },
        {
          assignmentId: "date-only",
          contactId: "K1",
          label: "Subject",
          isPrimary: false,
          createdAt: "2026-07-16",
        },
        {
          assignmentId: "local-time",
          contactId: "K1",
          label: "Subject",
          isPrimary: false,
          createdAt: "2026-07-16T10:00:00",
        },
      ],
    }])

    expect(surgeries[0].coordinatorAssignments).toMatchObject([
      {
        assignmentId: "offset",
        slaBasis: {
          status: "valid",
          createdAt: "2026-07-16T07:00:00.000-03:00",
          epochMs: Date.parse("2026-07-16T07:00:00.000-03:00"),
        },
      },
      {
        assignmentId: "date-only",
        slaBasis: { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
      },
      {
        assignmentId: "local-time",
        slaBasis: { status: "invalid", diagnosticCode: "assignment_created_at_invalid" },
      },
    ])
  })

  it("rejects structurally invalid identities without selecting another timestamp source", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "invalid-identities",
      createdAt: "2020-01-01T00:00:00.000Z",
      probableDate: "2020-01-02T00:00:00.000Z",
      authorizationDate: "2020-01-03T00:00:00.000Z",
      history: [{ date: "2020-01-04" }],
      coordinatorAssignment: {
        status: "resolved",
        resolved: { contactId: "K1", label: "Subject" },
      },
      coordinatorAssignments: [
        { contactId: "K1", label: "Missing assignment id", isPrimary: true, createdAt: "2026-07-16T10:00:00.000Z" },
        { assignmentId: "missing-contact", label: "Missing contact", isPrimary: false, createdAt: "2026-07-16T10:00:00.000Z" },
        { assignmentId: "kept", contactId: "K1", label: "Subject", isPrimary: false },
      ],
    }])

    expect(surgeries[0]).toMatchObject({
      coordinatorAssignmentState: "resolved",
      coordinadorContactId: "K1",
      coordinatorAssignments: [{
        assignmentId: "kept",
        contactId: "K1",
        slaBasis: { status: "missing", diagnosticCode: "assignment_created_at_missing" },
      }],
    })
  })

  it("keeps duplicate same-contact assignment identities for downstream ambiguity diagnostics", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "duplicate-subject-rows",
      coordinatorAssignment: {
        status: "resolved",
        resolved: { contactId: "K1", label: "Subject" },
      },
      coordinatorAssignments: [
        { assignmentId: "first", contactId: "K1", label: "Subject", isPrimary: true, createdAt: "2026-07-16T10:00:00.000Z" },
        { assignmentId: "second", contactId: "K1", label: "Subject", isPrimary: false, createdAt: "bad" },
      ],
    }])

    expect(surgeries[0].coordinatorAssignmentState).toBe("resolved")
    expect(surgeries[0].coordinatorAssignments?.map((assignment) => assignment.assignmentId)).toEqual(["first", "second"])
    expect(surgeries[0].coordinatorAssignments?.map((assignment) => assignment.slaBasis.status)).toEqual(["valid", "invalid"])
  })

  it("propagates the four explicit surgery contact ids without inferring nested ids", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "with-ids",
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
        institution: { legalName: "Hospital" },
        payer: { legalName: "Payer" },
      },
      {
        id: "without-ids",
        institution: { id: "nested-id-must-not-be-inferred", legalName: "Hospital 2" },
        payer: { id: "nested-payer-must-not-be-inferred", legalName: "Payer 2" },
      },
    ])

    expect(surgeries[0]).toMatchObject({
      institutionContactId: "institution-1",
      clientContactId: "payer-1",
      patientContactId: "patient-1",
      surgeonContactId: "doctor-1",
    })
    expect(surgeries[1].patientContactId).toBeUndefined()
    expect(surgeries[1].surgeonContactId).toBeUndefined()
    expect(surgeries[1].institutionContactId).toBeUndefined()
    expect(surgeries[1].clientContactId).toBeUndefined()
  })

  it("deduplicates equal dual candidates and keeps one surgery row", () => {
    const surgeries = mapApiSurgeryListToSurgeries([{
      id: "equal-dual",
      coordinatorContactId: "K1",
      coordinadorCx: "Legacy label",
      coordinatorAssignments: [{
        assignmentId: "assignment-1",
        contactId: "K1",
        label: "Relational label",
        isPrimary: true,
        createdAt: "2026-07-16T10:00:00.000Z",
      }],
    }])

    expect(surgeries).toHaveLength(1)
    expect(surgeries[0].coordinatorAssignmentState).toBe("resolved")
    expect(surgeries[0].coordinadorContactId).toBe("K1")
    expect(surgeries[0].coordinadorCx).toBe("Relational label")
  })

  it("clears singular coordinator fields for ambiguous and absent backend states", () => {
    const localAmbiguous = {
      ...existingLocalSurgery,
      id: "ambiguous",
      coordinadorContactId: "LOCAL-1",
      coordinadorCx: "Mock local ambiguo",
    }
    const localNone = {
      ...existingLocalSurgery,
      id: "none",
      coordinadorContactId: "LOCAL-2",
      coordinadorCx: "Mock local ausente",
    }
    const surgeries = mapApiSurgeryListToSurgeries([
      {
        id: "ambiguous",
        coordinatorContactId: "K2",
        coordinatorAssignments: [{
          assignmentId: "assignment-1",
          contactId: "K1",
          label: "Primary does not win",
          isPrimary: true,
          createdAt: "2026-07-16T10:00:00.000Z",
        }],
      },
      { id: "none" },
    ], [localAmbiguous, localNone])

    expect(surgeries[0]).toMatchObject({ coordinatorAssignmentState: "ambiguous" })
    expect(surgeries[0].coordinadorContactId).toBeUndefined()
    expect(surgeries[0].coordinadorCx).toBeUndefined()
    expect(surgeries[1]).toMatchObject({ coordinatorAssignmentState: "none" })
    expect(surgeries[1].coordinadorContactId).toBeUndefined()
    expect(surgeries[1].coordinadorCx).toBeUndefined()
  })
})
