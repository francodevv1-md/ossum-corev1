import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/errors"
import { validateMailAuthorizationImportInput } from "@/lib/validators/mail-stage1.validator"
import { createMailAuthorizationEvidence } from "@/lib/services/seguimiento.service"

const { getCompanyDocument } = vi.hoisted(() => ({
  getCompanyDocument: vi.fn(),
}))

vi.mock("@/lib/mail-stage1/repository", () => ({
  mailStage1Repository: { getCompanyDocument },
}))

import { resolveMailAuthorizationImportProvenance } from "@/lib/mail-stage1/service"

const provenance = {
  linkId: "link-1",
  conversationKey: "mock::mail::conversation-1",
  externalConversationId: "conversation-1",
  provider: "mock-mailbox",
  mailbox: "sistemas@districorr.com.ar",
  subject: "Autorización",
  participantsSummary: "Ana · Obra social",
  latestMessageAt: "2026-07-15T12:00:00.000Z",
  messageCount: 2,
  attachmentCount: 1,
  importedAttachments: [{
    attachmentId: "attachment-1",
    fileName: "autorizacion.pdf",
    mimeType: "application/pdf",
    sizeBytes: 120,
    persistenceState: "stored" as const,
    storedFileRef: "fs:mail-stage1/attachments/authorization.pdf",
  }],
}

function companyDocument(overrides: Record<string, unknown> = {}) {
  return {
    companyId: "company-1",
    links: {
      "link-1": {
        linkId: "link-1",
        companyId: "company-1",
        surgeryId: "surgery-1",
        conversationKey: provenance.conversationKey,
        linkStatus: "active",
      },
    },
    conversations: {
      [provenance.conversationKey]: {
        ...provenance,
        participants: [{ name: "Ana", email: "ana@example.com" }, { name: "Obra social", email: "os@example.com" }],
        attachments: [{
          ...provenance.importedAttachments[0],
          providerAttachmentRef: "provider-private-ref",
          isCriticalSelected: true,
        }],
        // These are intentionally untyped snapshot extras. They must never be copied.
        extracted: { material_autorizado: true },
        materials: ["implante"],
      },
    },
    ...overrides,
  }
}

describe("Mail authorization import contract", () => {
  it("accepts only operative text and a unique bounded attachment selection", () => {
    expect(validateMailAuthorizationImportInput({
      content: "  Autorización recibida ",
      summary: "Resumen",
      attachmentIds: ["attachment-1"],
    })).toEqual({ content: "Autorización recibida", summary: "Resumen", attachmentIds: ["attachment-1"] })

    for (const body of [
      { content: "ok", entryType: "authorization_evidence" },
      { content: "ok", evidenceRef: { extracted: true } },
      { content: "ok", attachmentIds: ["attachment-1", "attachment-1"] },
      { content: "ok", attachmentIds: Array.from({ length: 11 }, (_, index) => String(index)) },
    ]) {
      expect(() => validateMailAuthorizationImportInput(body)).toThrow(ApiError)
    }
  })

  it("resolves only active company-and-surgery scoped snapshot provenance", async () => {
    getCompanyDocument.mockResolvedValue(companyDocument())

    await expect(resolveMailAuthorizationImportProvenance(
      "company-1", "surgery-1", "link-1", ["attachment-1"]
    )).resolves.toEqual(provenance)

    const resolved = await resolveMailAuthorizationImportProvenance(
      "company-1", "surgery-1", "link-1", ["attachment-1"]
    )
    expect(resolved).not.toHaveProperty("extracted")
    expect(resolved).not.toHaveProperty("materials")
    expect(resolved.importedAttachments[0]).not.toHaveProperty("providerAttachmentRef")

    await expect(resolveMailAuthorizationImportProvenance(
      "company-1", "other-surgery", "link-1", []
    )).rejects.toMatchObject({ status: 404, code: "mail_link_not_found" })
    await expect(resolveMailAuthorizationImportProvenance(
      "company-1", "surgery-1", "link-1", ["unknown"]
    )).rejects.toMatchObject({ status: 400, code: "mail_attachment_not_found" })
    await expect(resolveMailAuthorizationImportProvenance(
      "company-1", "surgery-1", "link-1", ["attachment-1", "attachment-1"]
    )).rejects.toMatchObject({ status: 400, code: "mail_attachment_not_found" })
  })

  it("creates a fresh Mail-only authorization row without source or circuit writes", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "entry-1",
      surgeryId: "surgery-1",
      companyId: "company-1",
      entryType: "authorization_evidence",
      content: "Autorizado",
      summary: null,
      authorId: "user-1",
      evidenceRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { firstName: "Ana", lastName: "Test" },
    })
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(prisma)),
      seguimientoEntry: { create },
      surgery: { update: vi.fn() },
    } as any

    await createMailAuthorizationEvidence(prisma, {
      surgeryId: "surgery-1",
      companyId: "company-1",
      actor: { userId: "user-1", displayName: "Ana Test" },
      content: "Autorizado",
      provenance,
    })

    const evidenceRef = create.mock.calls[0][0].data.evidenceRef
    expect(evidenceRef).toMatchObject({
      action: "authorization_recorded",
      source: "mail_import",
      mailImport: provenance,
    })
    expect(evidenceRef).not.toHaveProperty("sourceEntryId")
    expect(JSON.stringify(evidenceRef)).not.toContain("material_autorizado")
    expect(prisma.surgery.update).not.toHaveBeenCalled()
  })

  it("enforces the Mail role boundary before parsing or resolving Mail state", async () => {
    const getApiAuthContext = vi.fn().mockResolvedValue({
      actorUserId: "user-operator",
      companyId: "company-1",
      role: "operator",
      user: { firstName: "Operator", lastName: null, email: "operator@example.com" },
    })
    const resolveCompanySurgery = vi.fn()
    const resolveProvenance = vi.fn()
    const createEvidence = vi.fn()

    vi.doMock("@/lib/api/auth-context", () => ({ getApiAuthContext }))
    vi.doMock("@/lib/surgery/resolve-company-surgery", () => ({ resolveCompanySurgery }))
    vi.doMock("@/lib/mail-stage1/service", () => ({
      resolveMailAuthorizationImportProvenance: resolveProvenance,
    }))
    vi.doMock("@/lib/services/seguimiento.service", () => ({
      createMailAuthorizationEvidence: createEvidence,
    }))
    vi.doMock("@/lib/prisma", () => ({ default: {} }))

    const { POST } = await import(
      "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/authorization-evidence/route"
    )
    const response = await POST(
      new Request("http://localhost", { method: "POST", body: "{" }),
      { params: Promise.resolve({ companyId: "company-1", surgeryId: "surgery-1", linkId: "link-1" }) }
    )

    await expect(response.json()).resolves.toEqual({
      error: { code: "company_mutation_access_denied", message: "Company mutation access denied" },
    })
    expect(response.status).toBe(403)
    expect(resolveCompanySurgery).not.toHaveBeenCalled()
    expect(resolveProvenance).not.toHaveBeenCalled()
    expect(createEvidence).not.toHaveBeenCalled()
  })
})
