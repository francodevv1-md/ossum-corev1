/**
 * mail-stage1.test.ts
 *
 * Unit tests for the OSSUM COR mail-stage1 module:
 *   - permissions
 *   - validators
 *   - repository (FileSystemMailStage1Repository)
 *   - provider (MockMailProvider)
 *   - service (integration with real mock provider, temp-backed repository)
 */

// ── Hoisted: compute temp dir & set env BEFORE any module loads ──
const TEST_RUNTIME_DIR = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("node:path")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const os = require("node:os")
  const dir = path.join(os.tmpdir(), `ossum-mail-stage1-test-${Date.now()}`)
  process.env.OSSUM_RUNTIME_DIR = dir
  return dir
})

// ── Ensure the repository singleton uses our temp dir ──
vi.mock("@/lib/mail-stage1/repository", async (importOriginal) => {
  return importOriginal()
})

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import path from "node:path"
import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"

// ── Module under test ──
import {
  resolveMailStage1Permissions,
  MAIL_STAGE1_VIEW_AUDIENCE,
  MAIL_STAGE1_MUTATION_AUDIENCE,
  MAIL_STAGE1_UNLINK_ROLES,
} from "@/lib/mail-stage1/permissions"

import {
  validateListMailboxConversationsQuery,
  validateAttachConversationInput,
  validateRefreshConversationInput,
  validatePersistCriticalAttachmentsInput,
  validateSurgeryId,
} from "@/lib/validators/mail-stage1.validator"

import {
  FileSystemMailStage1Repository,
  mailStage1Repository,
} from "@/lib/mail-stage1/repository"

import { MockMailProvider } from "@/lib/mail-stage1/provider/mock-mail-provider"

import {
  listLinkedConversations,
  browseMailboxConversations,
  attachConversationToSurgery,
  refreshLinkedConversation,
  persistCriticalAttachments,
  unlinkConversationFromSurgery,
} from "@/lib/mail-stage1/service"

import { MAIL_STAGE1_MAILBOX, buildConversationKey, classifyMailAttachment } from "@/lib/mail-stage1/types"
import type { MailStage1Actor } from "@/lib/mail-stage1/types"
import { ApiError } from "@/lib/api/errors"

// ── Shared test helpers ──
const ACTOR: MailStage1Actor = { actorUserId: "user-test-1", role: "admin" }
const COMPANY = "test-company-001"
const SURGERY_A = "surgery-alpha"
const SURGERY_B = "surgery-beta"

function uniqueCompany() {
  return `test-co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueSurgery() {
  return `surg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ====================================================================
// 1. PERMISSIONS
// ====================================================================
describe("resolveMailStage1Permissions", () => {
  it("grants canView + canAttach/canRefresh/canPersist + canUnlink to admin", () => {
    const p = resolveMailStage1Permissions("admin")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(true)
    expect(p.canRefresh).toBe(true)
    expect(p.canPersistAttachments).toBe(true)
    expect(p.canUnlink).toBe(true)
    expect(p.role).toBe("admin")
  })

  it("grants canView + canMutate + canUnlink to manager", () => {
    const p = resolveMailStage1Permissions("manager")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(true)
    expect(p.canUnlink).toBe(true)
  })

  it("grants canView + canMutate to coordinator (no canUnlink)", () => {
    const p = resolveMailStage1Permissions("coordinator")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(true)
    expect(p.canUnlink).toBe(false)
  })

  it("grants canView + canMutate + canUnlink to owner", () => {
    const p = resolveMailStage1Permissions("owner")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(true)
    expect(p.canUnlink).toBe(true)
  })

  it("grants canView + canMutate + canUnlink to super_admin", () => {
    const p = resolveMailStage1Permissions("super_admin")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(true)
    expect(p.canUnlink).toBe(true)
  })

  it("grants canView but NOT canMutate to operator", () => {
    const p = resolveMailStage1Permissions("operator")
    expect(p.canView).toBe(true)
    expect(p.canAttach).toBe(false)
    expect(p.canRefresh).toBe(false)
    expect(p.canPersistAttachments).toBe(false)
  })

  it("denies both canView and canMutate to unlisted roles", () => {
    for (const role of ["banned", "guest", "unknown", ""]) {
      const p = resolveMailStage1Permissions(role)
      expect(p.canView).toBe(false)
      expect(p.canAttach).toBe(false)
      expect(p.role).toBe(role)
    }
  })

  it("viewAudienceLabels matches expected array", () => {
    const p = resolveMailStage1Permissions("admin")
    expect(p.viewAudienceLabels).toEqual(MAIL_STAGE1_VIEW_AUDIENCE)
    expect(MAIL_STAGE1_VIEW_AUDIENCE).toContain("coordinadores")
    expect(MAIL_STAGE1_VIEW_AUDIENCE).toContain("depósito")
  })

  it("mutationAudienceLabels matches expected array", () => {
    const p = resolveMailStage1Permissions("admin")
    expect(p.mutationAudienceLabels).toEqual(MAIL_STAGE1_MUTATION_AUDIENCE)
    expect(MAIL_STAGE1_MUTATION_AUDIENCE).toContain("coordinadores")
    expect(MAIL_STAGE1_MUTATION_AUDIENCE).not.toContain("depósito")
  })
})

// ====================================================================
// 2. VALIDATORS
// ====================================================================
describe("validateSurgeryId", () => {
  it("accepts valid surgeryId", () => {
    expect(validateSurgeryId("surgery-001")).toBe("surgery-001")
    expect(validateSurgeryId("cx_2024")).toBe("cx_2024")
    expect(validateSurgeryId("PR-2041")).toBe("PR-2041")
  })

  it("rejects empty surgeryId", () => {
    expect(() => validateSurgeryId("")).toThrow(ApiError)
    expect(() => validateSurgeryId("   ")).toThrow(ApiError)
  })

  it("rejects surgeryId with special characters", () => {
    expect(() => validateSurgeryId("surgery/001")).toThrow(ApiError)
    expect(() => validateSurgeryId("surgery@001")).toThrow(ApiError)
    expect(() => validateSurgeryId("surg 001")).toThrow(ApiError)
  })
})

describe("validateListMailboxConversationsQuery", () => {
  it("accepts empty object input", () => {
    const result = validateListMailboxConversationsQuery({})
    expect(result.query).toBeUndefined()
    expect(result.limit).toBeUndefined()
  })

  it("accepts valid query string", () => {
    const result = validateListMailboxConversationsQuery({ query: "implantes" })
    expect(result.query).toBe("implantes")
  })

  it("accepts valid limit within range", () => {
    const result = validateListMailboxConversationsQuery({ limit: "25" })
    expect(result.limit).toBe(25)
  })

  it("accepts limit as number", () => {
    const result = validateListMailboxConversationsQuery({ limit: 10 })
    expect(result.limit).toBe(10)
  })

  it("rejects limit < 1", () => {
    expect(() => validateListMailboxConversationsQuery({ limit: 0 })).toThrow(ApiError)
    expect(() => validateListMailboxConversationsQuery({ limit: -5 })).toThrow(ApiError)
  })

  it("rejects limit > 50", () => {
    expect(() => validateListMailboxConversationsQuery({ limit: 51 })).toThrow(ApiError)
    expect(() => validateListMailboxConversationsQuery({ limit: 100 })).toThrow(ApiError)
  })

  it("rejects non-integer limit", () => {
    expect(() => validateListMailboxConversationsQuery({ limit: 3.5 })).toThrow(ApiError)
    expect(() => validateListMailboxConversationsQuery({ limit: "abc" })).toThrow(ApiError)
  })

  it("rejects query longer than 120 chars", () => {
    expect(() =>
      validateListMailboxConversationsQuery({ query: "x".repeat(121) })
    ).toThrow(ApiError)
  })

  it("trims query whitespace", () => {
    const result = validateListMailboxConversationsQuery({ query: "  hola  " })
    expect(result.query).toBe("hola")
  })
})

describe("validateAttachConversationInput", () => {
  it("accepts valid minimal payload", () => {
    const result = validateAttachConversationInput({
      externalConversationId: "conv-001",
      surgeryLabel: "CX-123",
    })
    expect(result.externalConversationId).toBe("conv-001")
    expect(result.surgeryLabel).toBe("CX-123")
  })

  it("rejects missing externalConversationId", () => {
    expect(() =>
      validateAttachConversationInput({ surgeryLabel: "CX-123" })
    ).toThrow(ApiError)
  })

  it("rejects empty externalConversationId", () => {
    expect(() =>
      validateAttachConversationInput({
        externalConversationId: "   ",
        surgeryLabel: "CX-123",
      })
    ).toThrow(ApiError)
  })

  it("deduplicates criticalAttachmentIds", () => {
    const result = validateAttachConversationInput({
      externalConversationId: "conv-001",
      surgeryLabel: "CX-123",
      criticalAttachmentIds: ["a-1", "a-2", "a-1", "a-2"],
    })
    expect(result.criticalAttachmentIds).toEqual(["a-1", "a-2"])
  })

  it("trims crossLinkReason", () => {
    const result = validateAttachConversationInput({
      externalConversationId: "conv-001",
      surgeryLabel: "CX-123",
      crossLinkReason: "  compartido  ",
    })
    expect(result.crossLinkReason).toBe("compartido")
  })

  it("returns undefined crossLinkReason when empty", () => {
    const result = validateAttachConversationInput({
      externalConversationId: "conv-001",
      surgeryLabel: "CX-123",
      crossLinkReason: "   ",
    })
    expect(result.crossLinkReason).toBeUndefined()
  })

  it("accepts warningAcknowledged with valid crossLinkReason", () => {
    const result = validateAttachConversationInput({
      externalConversationId: "conv-001",
      surgeryLabel: "CX-123",
      warningAcknowledged: true,
      crossLinkReason: "Motivo de test",
    })
    expect(result.warningAcknowledged).toBe(true)
    expect(result.crossLinkReason).toBe("Motivo de test")
  })

  it("rejects crossLinkReason longer than 500 chars", () => {
    expect(() =>
      validateAttachConversationInput({
        externalConversationId: "conv-001",
        surgeryLabel: "CX-123",
        crossLinkReason: "x".repeat(501),
      })
    ).toThrow(ApiError)
  })

  it("rejects >10 criticalAttachmentIds", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `a-${i}`)
    expect(() =>
      validateAttachConversationInput({
        externalConversationId: "conv-001",
        surgeryLabel: "CX-123",
        criticalAttachmentIds: ids,
      })
    ).toThrow(ApiError)
  })

  it("rejects warningAcknowledged=true without crossLinkReason", () => {
    expect(() =>
      validateAttachConversationInput({
        externalConversationId: "conv-001",
        surgeryLabel: "CX-123",
        warningAcknowledged: true,
        crossLinkReason: "   ",
      })
    ).toThrow(ApiError)
  })
})

describe("validateRefreshConversationInput", () => {
  it("accepts empty input (undefined)", () => {
    const result = validateRefreshConversationInput(undefined)
    expect(result).toBeDefined()
  })

  it("accepts empty object", () => {
    const result = validateRefreshConversationInput({})
    expect(result).toBeDefined()
  })

  it("accepts valid mailbox", () => {
    const result = validateRefreshConversationInput({
      mailbox: MAIL_STAGE1_MAILBOX,
    })
    expect(result.mailbox).toBe(MAIL_STAGE1_MAILBOX)
  })

  it("rejects invalid mailbox", () => {
    expect(() =>
      validateRefreshConversationInput({ mailbox: "otro@mail.com" })
    ).toThrow(ApiError)
  })
})

describe("validatePersistCriticalAttachmentsInput", () => {
  it("accepts valid attachmentIds", () => {
    const result = validatePersistCriticalAttachmentsInput({
      attachmentIds: ["a-1", "a-2"],
    })
    expect(result.attachmentIds).toEqual(["a-1", "a-2"])
  })

  it("rejects empty array", () => {
    expect(() =>
      validatePersistCriticalAttachmentsInput({ attachmentIds: [] })
    ).toThrow(ApiError)
  })

  it("deduplicates attachmentIds", () => {
    const result = validatePersistCriticalAttachmentsInput({
      attachmentIds: ["a-1", "a-2", "a-1", "a-3", "a-2"],
    })
    expect(result.attachmentIds).toEqual(["a-1", "a-2", "a-3"])
  })

  it("rejects >10 attachmentIds", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `a-${i}`)
    expect(() =>
      validatePersistCriticalAttachmentsInput({ attachmentIds: ids })
    ).toThrow(ApiError)
  })
})

// ====================================================================
// 3. REPOSITORY
// ====================================================================
describe("FileSystemMailStage1Repository", () => {
  let repo: FileSystemMailStage1Repository
  const repoCompany = "repo-test-co"

  beforeAll(async () => {
    // Use the already-configured temp runtime dir
    repo = new FileSystemMailStage1Repository()
    // Ensure base dirs exist
    await fs.mkdir(TEST_RUNTIME_DIR, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(TEST_RUNTIME_DIR, { recursive: true, force: true })
  })

  it("getCompanyDocument returns empty document for unknown company", async () => {
    const doc = await repo.getCompanyDocument("nonexistent-co")
    expect(doc.version).toBe(1)
    expect(doc.companyId).toBe("nonexistent-co")
    expect(doc.conversations).toEqual({})
    expect(doc.links).toEqual({})
  })

  it("saveCompanyDocument persists and getCompanyDocument returns saved data", async () => {
    const companyId = uniqueCompany()
    const doc = await repo.getCompanyDocument(companyId)

    // Mutate and save
    doc.conversations["mock::sistemas@districorr.com.ar::conv-test"] = {
      conversationKey: "mock::sistemas@districorr.com.ar::conv-test",
      provider: "mock-mailbox",
      mailbox: MAIL_STAGE1_MAILBOX,
      externalConversationId: "conv-test",
      subject: "Test",
      participants: [],
      messageCount: 0,
      latestMessageAt: new Date().toISOString(),
      importedAt: new Date().toISOString(),
      refreshStatus: "idle",
      messages: [],
      attachments: [],
    }

    await repo.saveCompanyDocument(companyId, doc)

    // Read back
    const loaded = await repo.getCompanyDocument(companyId)
    expect(loaded.companyId).toBe(companyId)
    expect(Object.keys(loaded.conversations)).toHaveLength(1)
    expect(loaded.conversations["mock::sistemas@districorr.com.ar::conv-test"].subject).toBe("Test")
  })

  it("persistAttachmentBinary creates file in expected path", async () => {
    const companyId = repoCompany
    const convKey = buildConversationKey("conv-attach-test")
    const buffer = Buffer.from("mock binary content for testing")

    const relativePath = await repo.persistAttachmentBinary({
      companyId,
      surgeryId: "surgery-attach-test",
      conversationId: "conv-attach-test",
      conversationKey: convKey,
      attachment: {
        attachmentId: "att-001",
        fileName: "test-file.pdf",
        mimeType: "application/pdf",
        providerAttachmentRef: "provider-ref-001",
        persistenceState: "metadata_only",
        isCriticalSelected: false,
      },
      buffer,
    })

    expect(relativePath).toMatch(/^fs:mail-stage1\/attachments\//)
    const fsPath = relativePath.slice(3)
    expect(relativePath).toContain("/")
    expect(relativePath).not.toContain("\\")

    // Verify file exists and content matches
    const fullPath = path.join(TEST_RUNTIME_DIR, fsPath)
    const content = await fs.readFile(fullPath)
    expect(Array.from(content)).toEqual(Array.from(buffer))
  })

  it("getCompanyDocument throws for non-ENOENT errors (bad JSON)", async () => {
    // Write a corrupt JSON file manually
    const repo2 = new FileSystemMailStage1Repository()
    const dir = path.join(TEST_RUNTIME_DIR, "mail-stage1", "companies")
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, "corrupt-co.json"), "not-valid-json{{{", "utf8")

    await expect(repo2.getCompanyDocument("corrupt-co")).rejects.toThrow()
  })
})

// ====================================================================
// 4. MOCK MAIL PROVIDER
// ====================================================================
describe("MockMailProvider", () => {
  const provider = new MockMailProvider()

  it("listMailboxConversations returns all 3 fixture conversations without filter", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
    })
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.externalConversationId).sort()).toEqual([
      "conv-ortho-001",
      "conv-shared-003",
      "conv-trauma-002",
    ])
  })

  it("listMailboxConversations applies limit", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      limit: 1,
    })
    expect(result).toHaveLength(1)
  })

  it("listMailboxConversations filters by subject", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "Autorización",
    })
    expect(result).toHaveLength(1)
    expect(result[0].externalConversationId).toBe("conv-ortho-001")
  })

  it("listMailboxConversations filters by snippet", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "kit de trauma",
    })
    expect(result).toHaveLength(1)
    expect(result[0].externalConversationId).toBe("conv-trauma-002")
  })

  it("listMailboxConversations filters by participant email", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "ventas@districorr",
    })
    expect(result).toHaveLength(1)
    expect(result[0].externalConversationId).toBe("conv-shared-003")
  })

  it("listMailboxConversations filters by participant name", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "Andrea",
    })
    expect(result).toHaveLength(1)
    expect(result[0].externalConversationId).toBe("conv-ortho-001")
  })

  it("listMailboxConversations returns empty for no match", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "zzz-nonexistent-query",
    })
    expect(result).toHaveLength(0)
  })

  it("listMailboxConversations case-insensitive filter", async () => {
    const result = await provider.listMailboxConversations({
      mailbox: MAIL_STAGE1_MAILBOX,
      query: "AUTORIZACIÓN",
    })
    expect(result).toHaveLength(1)
  })

  it("getConversationSnapshot returns full snapshot for valid id", async () => {
    const snap = await provider.getConversationSnapshot({
      mailbox: MAIL_STAGE1_MAILBOX,
      externalConversationId: "conv-ortho-001",
    })
    expect(snap.subject).toBe("Autorización + implantes | Paciente Fernández")
    expect(snap.messages).toHaveLength(2)
    expect(snap.attachments).toHaveLength(3)
    expect(snap.participants).toHaveLength(3)
    expect(snap.messages[0].bodyHtml).toContain("<strong>Fernández</strong>")
    expect(snap.messages[0].bodyText).toContain("Adjunto pedido de autorización")
  })

  it("classifies single or selected images as case evidence", () => {
    expect(classifyMailAttachment({
      fileName: "image001.png",
      mimeType: "image/png",
      persistenceState: "metadata_only",
      isCriticalSelected: false,
      totalAttachments: 1,
    })).toBe("case_document")

    expect(classifyMailAttachment({
      fileName: "image001.png",
      mimeType: "image/png",
      persistenceState: "selected",
      isCriticalSelected: true,
      totalAttachments: 3,
    })).toBe("case_document")
  })

  it("classifies inline and cid-based images as embedded assets", () => {
    expect(classifyMailAttachment({
      fileName: "image001.png",
      mimeType: "image/png",
      contentDisposition: "inline",
      persistenceState: "metadata_only",
      isCriticalSelected: false,
      totalAttachments: 3,
    })).toBe("embedded_asset")

    expect(classifyMailAttachment({
      fileName: "credencial.png",
      mimeType: "image/png",
      contentId: "<case-image-1>",
      persistenceState: "metadata_only",
      isCriticalSelected: false,
      totalAttachments: 3,
    })).toBe("embedded_asset")
  })

  it("getConversationSnapshot throws for unknown id", async () => {
    await expect(
      provider.getConversationSnapshot({
        mailbox: MAIL_STAGE1_MAILBOX,
        externalConversationId: "conv-unknown-999",
      })
    ).rejects.toThrow(ApiError)
  })

  it("downloadAttachment returns buffer for existing attachment", async () => {
    const result = await provider.downloadAttachment({
      mailbox: MAIL_STAGE1_MAILBOX,
      externalConversationId: "conv-ortho-001",
      providerAttachmentRef: "att-ortho-1",
    })
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.fileName).toBe("autorizacion-fernandez.pdf")
    expect(result.mimeType).toBe("application/pdf")
  })

  it("downloadAttachment throws for fail behavior attachment", async () => {
    await expect(
      provider.downloadAttachment({
        mailbox: MAIL_STAGE1_MAILBOX,
        externalConversationId: "conv-shared-003",
        providerAttachmentRef: "att-shared-2",
      })
    ).rejects.toThrow(ApiError)
  })

  it("downloadAttachment throws for unknown attachment ref", async () => {
    await expect(
      provider.downloadAttachment({
        mailbox: MAIL_STAGE1_MAILBOX,
        externalConversationId: "conv-ortho-001",
        providerAttachmentRef: "att-nonexistent",
      })
    ).rejects.toThrow(ApiError)
  })

  it("throws for invalid mailbox", async () => {
    await expect(
      provider.listMailboxConversations({
        mailbox: "invalid@mail.com" as typeof MAIL_STAGE1_MAILBOX,
      })
    ).rejects.toThrow(ApiError)
  })
})

// ====================================================================
// 5. SERVICE (integration tests with temp repo + real mock provider)
// ====================================================================
describe("mail-stage1 service", () => {
  // Each test uses a unique company to avoid state leaks
  let companyId: string
  const actorAdmin: MailStage1Actor = { actorUserId: "user-admin-1", role: "admin" }

  beforeEach(() => {
    companyId = uniqueCompany()
  })

  // ── listLinkedConversations ──
  describe("listLinkedConversations", () => {
    it("returns empty array for surgery with no links", async () => {
      const result = await listLinkedConversations(companyId, SURGERY_A, actorAdmin)
      expect(result.mailbox).toBe(MAIL_STAGE1_MAILBOX)
      expect(result.surgeryId).toBe(SURGERY_A)
      expect(result.conversations).toEqual([])
      expect(result.permissions.canView).toBe(true)
    })
  })

  // ── browseMailboxConversations ──
  describe("browseMailboxConversations", () => {
    it("returns all 3 fixture conversations with alreadyLinkedToCurrentSurgery=false when no links", async () => {
      const result = await browseMailboxConversations(companyId, SURGERY_A, actorAdmin)
      expect(result.conversations).toHaveLength(3)
      for (const c of result.conversations) {
        expect(c.alreadyLinkedToCurrentSurgery).toBe(false)
        expect(c.linkedSurgeries).toEqual([])
      }
    })

    it("flags alreadyLinkedToCurrentSurgery=true after linking", async () => {
      // Link conv-ortho-001 to surgery A
      await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho A",
      })

      const result = await browseMailboxConversations(companyId, SURGERY_A, actorAdmin)
      const ortho = result.conversations.find(
        (c) => c.externalConversationId === "conv-ortho-001"
      )
      expect(ortho!.alreadyLinkedToCurrentSurgery).toBe(true)
      expect(ortho!.linkedSurgeries).toHaveLength(1)
      expect(ortho!.linkedSurgeries[0].surgeryId).toBe(SURGERY_A)

      // Other conversations still false
      const trauma = result.conversations.find(
        (c) => c.externalConversationId === "conv-trauma-002"
      )
      expect(trauma!.alreadyLinkedToCurrentSurgery).toBe(false)
    })

    it("respects query filter", async () => {
      const result = await browseMailboxConversations(
        companyId,
        SURGERY_A,
        actorAdmin,
        "trauma"
      )
      expect(result.conversations).toHaveLength(1)
      expect(result.conversations[0].externalConversationId).toBe("conv-trauma-002")
    })

    it("exposes latest message body text for optional seguimiento notes", async () => {
      const result = await browseMailboxConversations(companyId, SURGERY_A, actorAdmin)
      const ortho = result.conversations.find((c) => c.externalConversationId === "conv-ortho-001")

      expect(ortho?.latestMessageBodyText).toContain("Autorización recibida")
    })
  })

  // ── attachConversationToSurgery ──
  describe("attachConversationToSurgery", () => {
    it("creates link successfully for new conversation", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho Fernández",
      })

      expect(view.linkId).toBeDefined()
      expect(view.conversationKey).toBe(buildConversationKey("conv-ortho-001"))
      expect(view.subject).toBe("Autorización + implantes | Paciente Fernández")
      expect(view.conversationState).toBe("attach_success")
      expect(view.lastOperationMessage).toBe("Conversación vinculada")
      expect(view.linkedSurgeries).toHaveLength(1)
      expect(view.linkedSurgeries[0].surgeryId).toBe(SURGERY_A)
      expect(view.eventLog).toHaveLength(1)
      expect(view.eventLog[0].type).toBe("linked")
      expect(view.eventLog[0].actorRole).toBe("admin")
      expect(view.eventCount).toBe(1)
      expect(view.attachments).toHaveLength(3)
      expect(view.messages[0].bodyHtml).toContain("Fernández")
      // All attachments start as metadata_only, not selected
      for (const att of view.attachments) {
        expect(att.persistenceState).toBe("metadata_only")
        expect(att.isCriticalSelected).toBe(false)
      }
    })

    it("rejects duplicate link to same surgery with conflict error", async () => {
      await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho",
      })

      await expect(
        attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho v2",
        })
      ).rejects.toThrow(ApiError)

      // Verify the error is a conflict
      try {
        await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho v2",
        })
      } catch (e) {
        const err = e as ApiError
        expect(err.status).toBe(409)
        expect(err.code).toBe("mail_conversation_already_linked")
      }
    })

    it("rejects cross-surgery link without warningAcknowledged", async () => {
      // Link to surgery A first
      await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho A",
      })

      // Try to link same conversation to surgery B without acknowledgement
      await expect(
        attachConversationToSurgery(companyId, SURGERY_B, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho B",
          // warningAcknowledged missing
        })
      ).rejects.toThrow(ApiError)

      try {
        await attachConversationToSurgery(companyId, SURGERY_B, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho B",
        })
      } catch (e) {
        const err = e as ApiError
        expect(err.code).toBe("mail_cross_link_ack_required")
      }
    })

    it("rejects cross-surgery link without crossLinkReason", async () => {
      // Link to surgery A first
      await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho A",
      })

      await expect(
        attachConversationToSurgery(companyId, SURGERY_B, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho B",
          warningAcknowledged: true,
          // crossLinkReason missing
        })
      ).rejects.toThrow(ApiError)

      try {
        await attachConversationToSurgery(companyId, SURGERY_B, actorAdmin, {
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Ortho B",
          warningAcknowledged: true,
        })
      } catch (e) {
        const err = e as ApiError
        expect(err.code).toBe("mail_cross_link_reason_required")
      }
    })

    it("succeeds for cross-surgery link WITH warningAcknowledged + crossLinkReason", async () => {
      // Link to surgery A
      await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho A",
      })

      // Link to surgery B with cross-link params
      const view = await attachConversationToSurgery(companyId, SURGERY_B, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho B",
        warningAcknowledged: true,
        crossLinkReason: "Misma conversación para seguimiento compartido",
      })

      expect(view.conversationState).toBe("attach_success")
      // Should have 2 linked surgeries
      expect(view.linkedSurgeries).toHaveLength(2)
      const surgeryIds = view.linkedSurgeries.map((s) => s.surgeryId).sort()
      expect(surgeryIds).toEqual([SURGERY_A, SURGERY_B].sort())

      // Event log should mention multivínculo
      const linkEvent = view.eventLog.find((e) => e.type === "linked")
      expect(linkEvent!.detail).toContain("Multivínculo confirmado")
      expect(linkEvent!.detail).toContain("seguimiento compartido")
    })

    it("handles critical attachment selection (auto-persists on attach)", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho Critical",
        criticalAttachmentIds: ["a-ortho-1"],
      })

      expect(view.attachments).toHaveLength(3)
      const critical = view.attachments.find((a) => a.attachmentId === "a-ortho-1")
      const normal = view.attachments.find((a) => a.attachmentId === "a-ortho-2")

      expect(critical!.isCriticalSelected).toBe(true)
      // Auto-persist runs immediately when criticalAttachmentIds are provided
      expect(critical!.persistenceState).toBe("stored")

      expect(normal!.isCriticalSelected).toBe(false)
      expect(normal!.persistenceState).toBe("metadata_only")

      // selectedAttachmentCount and storedAttachmentCount reflect the auto-persist
      expect(view.selectedAttachmentCount).toBe(1)
      expect(view.storedAttachmentCount).toBe(1)
    })

    it("sets storedFileRef after auto-persist on attach", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho Auto Persist",
        criticalAttachmentIds: ["a-ortho-1"],
      })

      const critical = view.attachments.find((a) => a.attachmentId === "a-ortho-1")
      expect(critical!.persistenceState).toBe("stored")
      // storedFileRef is a relative path pointing inside the runtime dir
      expect(critical!.storedFileRef).toMatch(/^fs:mail-stage1\/attachments\//)
      expect(view.storedAttachmentCount).toBe(1)
    })
  })

  // ── refreshLinkedConversation ──
  describe("refreshLinkedConversation", () => {
    it("updates snapshot for existing link", async () => {
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho Refresh",
      })

      const refreshed = await refreshLinkedConversation(
        companyId,
        SURGERY_A,
        attached.linkId,
        actorAdmin
      )

      expect(refreshed.conversationState).toBe("refresh_success")
      expect(refreshed.refreshStatus).toBe("success")
      expect(refreshed.refreshedAt).toBeDefined()
      // Event log should have linked + refresh events
      expect(refreshed.eventLog.length).toBeGreaterThanOrEqual(3) // linked + refresh_requested + refresh_succeeded
      const refreshEvent = refreshed.eventLog.find(
        (e) => e.type === "refresh_succeeded"
      )
      expect(refreshEvent).toBeDefined()
    })

    it("throws for non-existent link", async () => {
      await expect(
        refreshLinkedConversation(
          companyId,
          SURGERY_A,
          "non-existent-link-id",
          actorAdmin
        )
      ).rejects.toThrow(ApiError)
    })

    it("throws for link belonging to different surgery", async () => {
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho",
      })

      await expect(
        refreshLinkedConversation(
          companyId,
          "different-surgery-id",
          attached.linkId,
          actorAdmin
        )
      ).rejects.toThrow(ApiError)
    })
  })

  // ── persistCriticalAttachments ──
  describe("persistCriticalAttachments", () => {
    it("stores attachments successfully", async () => {
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-trauma-002",
        surgeryLabel: "CX Trauma Persist",
      })

      const view = await persistCriticalAttachments(
        companyId,
        SURGERY_A,
        attached.linkId,
        actorAdmin,
        { attachmentIds: ["a-trauma-1"] }
      )

      const persisted = view.attachments.find((a) => a.attachmentId === "a-trauma-1")
      expect(persisted!.persistenceState).toBe("stored")
      expect(persisted!.isCriticalSelected).toBe(true)
      expect(persisted!.storedFileRef).toBeDefined()
      expect(view.storedAttachmentCount).toBe(1)
      expect(view.selectedAttachmentCount).toBe(1)
    })

    it("rejects unknown attachmentId", async () => {
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho",
      })

      await expect(
        persistCriticalAttachments(
          companyId,
          SURGERY_A,
          attached.linkId,
          actorAdmin,
          { attachmentIds: ["unknown-attachment-999"] }
        )
      ).rejects.toThrow(ApiError)
    })

    it("marks attachment as persist_failed for fail-behavior attachment", async () => {
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-shared-003",
        surgeryLabel: "CX Shared",
      })

      // a-shared-2 has downloadBehavior "fail"
      const view = await persistCriticalAttachments(
        companyId,
        SURGERY_A,
        attached.linkId,
        actorAdmin,
        { attachmentIds: ["a-shared-2"] }
      )

      const failed = view.attachments.find((a) => a.attachmentId === "a-shared-2")
      expect(failed!.persistenceState).toBe("persist_failed")
      expect(failed!.lastPersistenceError).toBeDefined()
      expect(failed!.isCriticalSelected).toBe(true)

      // Event log should have persist_failed event
      const failEvent = view.eventLog.find(
        (e) => e.type === "attachment_persist_failed"
      )
      expect(failEvent).toBeDefined()
    })

    it("skips already-stored attachments", async () => {
      // First, attach and persist
      const attached = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Ortho",
      })

      await persistCriticalAttachments(
        companyId,
        SURGERY_A,
        attached.linkId,
        actorAdmin,
        { attachmentIds: ["a-ortho-1"] }
      )

      // Persist again — should not create duplicate events or break
      const view = await persistCriticalAttachments(
        companyId,
        SURGERY_A,
        attached.linkId,
        actorAdmin,
        { attachmentIds: ["a-ortho-1"] }
      )

      const att = view.attachments.find((a) => a.attachmentId === "a-ortho-1")
      expect(att!.persistenceState).toBe("stored")
      // Event count should not have duplicate persist events for the same attachment
      const persistEvents = view.eventLog.filter(
        (e) => e.type === "attachment_persisted"
      )
      expect(persistEvents).toHaveLength(1)
    })
  })

  // ── State transition: attach → refresh → persist ──
  describe("conversation state transitions", () => {
    it("transitions correctly through attach → refresh → persist", async () => {
      // Step 1: Attach
      const view1 = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX State Test",
      })
      expect(view1.conversationState).toBe("attach_success")
      expect(view1.eventLog[0].type).toBe("linked")

      // Step 2: Refresh
      const view2 = await refreshLinkedConversation(
        companyId,
        SURGERY_A,
        view1.linkId,
        actorAdmin
      )
      expect(view2.conversationState).toBe("refresh_success")
      expect(view2.refreshStatus).toBe("success")

      // Step 3: Persist critical attachment
      const view3 = await persistCriticalAttachments(
        companyId,
        SURGERY_A,
        view1.linkId,
        actorAdmin,
        { attachmentIds: ["a-ortho-1"] }
      )
      expect(view3.conversationState).toBe("idle")
      expect(
        view3.attachments.find((a) => a.attachmentId === "a-ortho-1")!
          .persistenceState
      ).toBe("stored")
    })

    it("preserves persistenceState across refresh", async () => {
      // Attach with critical attachment selection (auto-persist)
      const view1 = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-trauma-002",
        surgeryLabel: "CX Trauma State",
        criticalAttachmentIds: ["a-trauma-1"],
      })

      // a-trauma-1 should be stored (auto-persisted)
      let att = view1.attachments.find((a) => a.attachmentId === "a-trauma-1")
      expect(att!.persistenceState).toBe("stored")

      // Refresh
      const view2 = await refreshLinkedConversation(
        companyId,
        SURGERY_A,
        view1.linkId,
        actorAdmin
      )

      // a-trauma-1 should still be stored after refresh
      att = view2.attachments.find((a) => a.attachmentId === "a-trauma-1")
      expect(att!.persistenceState).toBe("stored")
      expect(att!.isCriticalSelected).toBe(true)
    })
  })

  // ── Cross-company isolation ──
  describe("cross-company isolation", () => {
    it("conversations from one company do not leak to another", async () => {
      const companyA = uniqueCompany()
      const companyB = uniqueCompany()

      // Link to company A
      await attachConversationToSurgery(companyA, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Co A",
      })

      // Company B should see no linked conversations
      const resultB = await listLinkedConversations(companyB, SURGERY_A, actorAdmin)
      expect(resultB.conversations).toEqual([])
    })

    it("rejects cross-company document mismatch on save", async () => {
      const companyA = uniqueCompany()
      const companyB = uniqueCompany()

      // Link to company A
      const view = await attachConversationToSurgery(companyA, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Co A",
      })

      // Trying to refresh with companyB should fail because the link belongs to companyA
      // Actually the link record has companyId embedded, but the document is loaded per-company
      // So refreshing with companyB will load companyB's empty document, and the link won't exist
      await expect(
        refreshLinkedConversation(companyB, SURGERY_A, view.linkId, actorAdmin)
      ).rejects.toThrow(ApiError)
    })
  })

  // ── Unlink conversation ──
  describe("unlinkConversationFromSurgery", () => {
    it("unlinks an active conversation and records audit event", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Unlink Test",
      })

      const unlinked = await unlinkConversationFromSurgery(
        companyId,
        SURGERY_A,
        view.linkId,
        actorAdmin
      )

      expect(unlinked.linkId).toBe(view.linkId)
      // The view should contain the unlinked event
      const unlinkEvent = unlinked.eventLog.find((e) => e.type === "unlinked")
      expect(unlinkEvent).toBeDefined()
      expect(unlinkEvent!.actorUserId).toBe(actorAdmin.actorUserId)
      expect(unlinkEvent!.actorRole).toBe("admin")
      expect(unlinked.eventCount).toBeGreaterThanOrEqual(2) // linked + unlinked

      // The conversation should no longer appear in the list
      const list = await listLinkedConversations(companyId, SURGERY_A, actorAdmin)
      expect(list.conversations.find((c) => c.linkId === view.linkId)).toBeUndefined()
    })

    it("rejects unlink for non-admin/manager roles", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Unlink Role",
      })

      const coordinator: MailStage1Actor = { actorUserId: "user-coord", role: "coordinator" }
      await expect(
        unlinkConversationFromSurgery(companyId, SURGERY_A, view.linkId, coordinator)
      ).rejects.toThrow(ApiError)
    })

    it("rejects unlink for non-existent link", async () => {
      await expect(
        unlinkConversationFromSurgery(companyId, SURGERY_A, "non-existent-id", actorAdmin)
      ).rejects.toThrow(ApiError)
    })

    it("rejects unlink for link belonging to different surgery", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Unlink Diff Surgery",
      })

      await expect(
        unlinkConversationFromSurgery(companyId, "different-surgery", view.linkId, actorAdmin)
      ).rejects.toThrow(ApiError)
    })

    it("rejects double unlink (already unlinked)", async () => {
      const view = await attachConversationToSurgery(companyId, SURGERY_A, actorAdmin, {
        externalConversationId: "conv-ortho-001",
        surgeryLabel: "CX Double Unlink",
      })

      await unlinkConversationFromSurgery(companyId, SURGERY_A, view.linkId, actorAdmin)

      // Second unlink should fail — link no longer active
      await expect(
        unlinkConversationFromSurgery(companyId, SURGERY_A, view.linkId, actorAdmin)
      ).rejects.toThrow(ApiError)
    })
  })
})
