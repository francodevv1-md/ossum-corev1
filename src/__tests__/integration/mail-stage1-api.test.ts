/**
 * mail-stage1-api.test.ts
 *
 * Integration tests for the OSSUM COR mail-stage1 API routes.
 * Tests route handlers directly by mocking the auth context and calling
 * the exported route handler functions.
 *
 * Since the routes depend on Next.js's App Router pattern (async functions
 * that receive Request + { params }), we test them by constructing mock
 * Request objects and calling the handlers directly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import fs from "node:fs/promises"
import { notFound } from "@/lib/api/errors"

// ── Hoisted: compute temp dir & set env BEFORE any module loads ──
const TEST_RUNTIME_DIR = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require("node:path")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const os = require("node:os")
  const dir = p.join(os.tmpdir(), `ossum-mail-stage1-api-test-${Date.now()}`)
  process.env.OSSUM_RUNTIME_DIR = dir
  return dir
})

// ── Mock the auth context to avoid real Supabase calls ──
const { getApiAuthContext } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}))

const { resolveCompanySurgery } = vi.hoisted(() => ({
  resolveCompanySurgery: vi.fn(),
}))

vi.mock("@/lib/surgery/resolve-company-surgery", () => ({
  resolveCompanySurgery,
}))

const { extractAutorizacion } = vi.hoisted(() => ({
  extractAutorizacion: vi.fn(),
}))

vi.mock("@/lib/services/ai/autorizacion-extractor", () => ({
  extractAutorizacion,
}))

import { GET as listMailLinks, POST as attachMailLink } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/route"
import { POST as refreshMailLink } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/refresh/route"
import { POST as persistAttachments } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/attachments/persist/route"
import { GET as downloadAttachment } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/attachments/[attachmentId]/download/route"
import { DELETE as unlinkMailLink } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mail-links/[linkId]/route"
import { GET as browseMailbox } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/route"
import { GET as previewMailboxAttachment } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/[externalConversationId]/attachments/[attachmentId]/preview/route"
import { POST as extractMailboxAttachmentText } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/mailbox/conversations/[externalConversationId]/attachments/[attachmentId]/extract-text/route"
import { MAIL_STAGE1_MAILBOX, buildConversationKey } from "@/lib/mail-stage1/types"
import { ApiError } from "@/lib/api/errors"

// ── Test helpers ──
interface ApiResponseBody {
  data?: unknown
  error?: { code?: string; message?: string }
}

const ADMIN_AUTH = {
  actorUserId: "test-admin",
  supabaseAuthId: "uuid-admin",
  companyId: "test-co-api",
  role: "admin",
  source: "dev-header" as const,
}

const COORD_AUTH = {
  actorUserId: "test-coord",
  supabaseAuthId: "uuid-coord",
  companyId: "test-co-api",
  role: "coordinator",
  source: "dev-header" as const,
}

const OPERATOR_AUTH = {
  actorUserId: "test-operator",
  supabaseAuthId: "uuid-operator",
  companyId: "test-co-api",
  role: "operator",
  source: "dev-header" as const,
}

const BAD_ROLE_AUTH = {
  actorUserId: "test-bad",
  supabaseAuthId: "uuid-bad",
  companyId: "test-co-api",
  role: "guest",
  source: "dev-header" as const,
}

const OTHER_COMPANY_AUTH = {
  actorUserId: "test-other",
  supabaseAuthId: "uuid-other",
  companyId: "other-co-api",
  role: "admin",
  source: "dev-header" as const,
}

const COMPANY_ID = "test-co-api"
const SURGERY_ID = "surgery-api-001"
const LINKED_CONV_ID = "conv-ortho-001"

function jsonBody(body: unknown): BodyInit {
  return JSON.stringify(body)
}

async function bodyAsJson(response: Response): Promise<ApiResponseBody> {
  const text = await response.text()
  return JSON.parse(text) as ApiResponseBody
}

async function paramsForRoute(params: Record<string, string>) {
  // RouteContext types are specific per route; `as any` is acceptable for tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { params: Promise.resolve(params) } as any
}

// ── Tests ──
describe("mail-stage1 API routes", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_RUNTIME_DIR, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(TEST_RUNTIME_DIR, { recursive: true, force: true })
  })

  beforeEach(() => {
    vi.resetAllMocks()
    extractAutorizacion.mockResolvedValue({
      provider: "mock",
      confidence: 0.81,
      looks_like_authorization: true,
      warnings: [],
      raw_text_preview: "Afiliado Fernández · autorización aprobada.",
      extracted: {
        paciente: "Fernández",
        dni: "28456789",
        medico: "Dr. Gómez",
        institucion: "Clínica Centro",
        obra_social: "OS Central",
        patologia_sugerida: "RTR",
        numero_autorizacion: "AUT-7781",
        numero_siniestro: "",
        numero_poliza: "",
        fecha_autorizacion: "2026-06-21",
        fecha_cirugia: "2026-06-28",
        fecha_probable: "",
        provincia_sugerida: "Buenos Aires",
        localidad_sugerida: "La Plata",
        material_autorizado: [],
        observaciones: "Cobertura sujeta a auditoría final.",
      },
    })

    resolveCompanySurgery.mockImplementation(async (companyId: string, surgeryId: string) => {
      if (companyId !== COMPANY_ID && companyId !== "other-co-api") {
        throw notFound("Surgery not found", "surgery_not_found")
      }

      if (surgeryId === "CX-9006" || surgeryId.startsWith("missing-surgery")) {
        throw notFound("Surgery not found", "surgery_not_found")
      }

      return {
        id: surgeryId,
        visibleNumber: surgeryId.startsWith("CX-") ? surgeryId : null,
      }
    })
  })

  // ════════════════════════════════════════════════════════════════
  // GET /mail-links — list linked conversations
  // ════════════════════════════════════════════════════════════════
  describe("GET /mail-links", () => {
    it("returns 401/403 when auth context fails", async () => {
      getApiAuthContext.mockRejectedValueOnce(new ApiError(401, "auth_required", "Authentication required"))

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(401)
      expect(body.error?.code).toBe("auth_required")
    })

    it("rejects invalid surgeryId with 400", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/surg@bad/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: "surg@bad" }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_invalid_surgery_id")
    })

    it("guest role gets canView:false in permissions but still succeeds", async () => {
      getApiAuthContext.mockResolvedValueOnce(BAD_ROLE_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(200)
      const data = body.data as Record<string, unknown>
      const perms = data?.permissions as Record<string, unknown>
      expect(perms?.canView).toBe(false)
      expect(perms?.canAttach).toBe(false)
      expect(perms?.canUnlink).toBe(false)
    })

    it("returns empty list for fresh company", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(200)
      const data = body.data as Record<string, unknown>
      expect(data?.conversations).toEqual([])
      expect(data?.surgeryId).toBe(SURGERY_ID)
      expect(data?.mailbox).toBe(MAIL_STAGE1_MAILBOX)
    })

    it("includes permissions in response", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      const data = body.data as Record<string, unknown>
      const perms = data?.permissions as Record<string, unknown>
      expect(perms?.canView).toBe(true)
      expect(perms?.canAttach).toBe(true)
      expect(perms?.canUnlink).toBe(true)
    })

    it("rejects orphan surgery references with 404 before listing links", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/CX-9006/mail-links`)
      const res = await listMailLinks(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: "CX-9006" }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(404)
      expect(body.error?.code).toBe("surgery_not_found")
      expect(resolveCompanySurgery).toHaveBeenCalledWith(COMPANY_ID, "CX-9006")
    })
  })

  // ════════════════════════════════════════════════════════════════
  // POST /mail-links — attach conversation
  // ════════════════════════════════════════════════════════════════
  describe("POST /mail-links", () => {
    it("rejects invalid payload with 400", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({}),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_invalid_attach_payload")
    })

    it("rejects missing externalConversationId", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({ surgeryLabel: "CX-001" }),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
    })

    it("creates link successfully with valid payload", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Ortho API Test",
        }),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(201)
      const data = body.data as Record<string, unknown>
      expect(data?.conversationKey).toBe(buildConversationKey(LINKED_CONV_ID))
      expect(data?.subject).toContain("Autorización")
      expect((data as { eventCount: number })?.eventCount).toBe(1)
      // Verify event has actorRole
      const events = data?.eventLog as Array<{ actorRole?: string }> | undefined
      expect(events?.[0]?.actorRole).toBe("admin")
    })

    it("rejects duplicate link with 409", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Ortho Dup",
        }),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(409)
      expect(body.error?.code).toBe("mail_conversation_already_linked")
    })

    it("rejects cross-link without warning/reason with 409", async () => {
      // Link to another surgery first
      const otherSurg = "surgery-api-002"

      // First link to surgery-api-002
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const req1 = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${otherSurg}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-shared-003",
          surgeryLabel: "CX Shared First",
        }),
      })
      await attachMailLink(req1, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: otherSurg }))

      // Then try to link to surgery-api-001 without warning
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const req2 = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-shared-003",
          surgeryLabel: "CX Shared Second",
        }),
      })
      const res = await attachMailLink(req2, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(409)
      expect(body.error?.code).toBe("mail_cross_link_ack_required")
    })

    it("accepts cross-link with warning+reason", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-shared-003",
          surgeryLabel: "CX Shared Second",
          warningAcknowledged: true,
          crossLinkReason: "Seguimiento compartido entre cirugías",
        }),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(201)
      const data = body.data as Record<string, unknown>
      expect(data?.linkedSurgeries).toHaveLength(2)
    })

    it("rejects non-mutating role with 403", async () => {
      getApiAuthContext.mockResolvedValueOnce(OPERATOR_AUTH)

      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-trauma-002",
          surgeryLabel: "CX Operator Test",
        }),
      })
      const res = await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))
      const body = await bodyAsJson(res)

      expect(res.status).toBe(403)
      expect(body.error?.code).toBe("company_mutation_access_denied")
    })
  })

  // ════════════════════════════════════════════════════════════════
  // POST /mail-links/[linkId]/refresh
  // ════════════════════════════════════════════════════════════════
  describe("POST /mail-links/[linkId]/refresh", () => {
    it("returns 404 for non-existent link", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links/non-existent/refresh`,
        { method: "POST" }
      )
      const res = await refreshMailLink(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, linkId: "non-existent" })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(404)
      expect(body.error?.code).toBe("mail_link_not_found")
    })

    it("refreshes an existing link successfully", async () => {
      // First, create a link
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const attachReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-trauma-002",
          surgeryLabel: "CX Refresh API",
        }),
      })
      const attachRes = await attachMailLink(
        attachReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID })
      )
      const attachBody = await bodyAsJson(attachRes)
      const linkId = (attachBody.data as { linkId: string }).linkId

      // Then refresh it
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const refreshReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links/${linkId}/refresh`,
        { method: "POST" }
      )
      const refreshRes = await refreshMailLink(
        refreshReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, linkId })
      )
      const refreshBody = await bodyAsJson(refreshRes)

      expect(refreshRes.status).toBe(200)
      const data = refreshBody.data as Record<string, unknown>
      expect(data?.refreshStatus).toBe("success")
      expect(data?.conversationState).toBe("refresh_success")
    })
  })

  // ════════════════════════════════════════════════════════════════
  // POST /mail-links/[linkId]/attachments/persist
  // ════════════════════════════════════════════════════════════════
  describe("POST /mail-links/[linkId]/attachments/persist", () => {
    const PERSIST_SURGERY = "surgery-api-persist"

    it("returns 404 for non-existent link", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${PERSIST_SURGERY}/mail-links/non-existent/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ attachmentIds: ["a-1"] }),
        }
      )
      const res = await persistAttachments(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: PERSIST_SURGERY, linkId: "non-existent" })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(404)
      expect(body.error?.code).toBe("mail_link_not_found")
    })

    it("persists attachments for valid link", async () => {
      // Create a link first on unique surgery — use cross-link params since conv is already linked elsewhere
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const attachReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${PERSIST_SURGERY}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Persist API",
          warningAcknowledged: true,
          crossLinkReason: "Cross-link for persist test",
        }),
      })
      const attachRes = await attachMailLink(
        attachReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: PERSIST_SURGERY })
      )
      const attachBody = await bodyAsJson(attachRes)
      expect(attachRes.status).toBe(201)
      const linkId = (attachBody.data as { linkId: string }).linkId

      // Persist an attachment
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const persistReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${PERSIST_SURGERY}/mail-links/${linkId}/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ attachmentIds: ["a-ortho-1"] }),
        }
      )
      const persistRes = await persistAttachments(
        persistReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: PERSIST_SURGERY, linkId })
      )
      const persistBody = await bodyAsJson(persistRes)

      expect(persistRes.status).toBe(200)
      const data = persistBody.data as Record<string, unknown>
      expect(data?.storedAttachmentCount).toBe(1)
    })

    it("rejects invalid attachmentIds payload", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${PERSIST_SURGERY}/mail-links/some-id/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ attachmentIds: [] }),
        }
      )
      const res = await persistAttachments(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: PERSIST_SURGERY, linkId: "some-id" })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_invalid_persist_payload")
    })

    it("rejects >10 attachmentIds", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const tooManyIds = Array.from({ length: 11 }, (_, i) => `a-${i}`)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${PERSIST_SURGERY}/mail-links/some-id/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ attachmentIds: tooManyIds }),
        }
      )
      const res = await persistAttachments(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: PERSIST_SURGERY, linkId: "some-id" })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
    })
  })

  // ════════════════════════════════════════════════════════════════
  // DELETE /mail-links/[linkId] — unlink
  // ════════════════════════════════════════════════════════════════
  describe("DELETE /mail-links/[linkId]", () => {
    const UNLINK_SURGERY = "surgery-api-unlink"

    it("returns 404 for non-existent link", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_SURGERY}/mail-links/non-existent`,
        { method: "DELETE" }
      )
      const res = await unlinkMailLink(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_SURGERY, linkId: "non-existent" })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(404)
      expect(body.error?.code).toBe("mail_link_not_found")
    })

    it("rejects unlink for non-admin role (coordinator)", async () => {
      // Create link as admin — cross-link since conv is already linked elsewhere
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const attachReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_SURGERY}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Unlink API Coord",
          warningAcknowledged: true,
          crossLinkReason: "Cross-link for unlink role test",
        }),
      })
      const attachRes = await attachMailLink(
        attachReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_SURGERY })
      )
      const attachBody = await bodyAsJson(attachRes)
      expect(attachRes.status).toBe(201)
      const linkId = (attachBody.data as { linkId: string }).linkId

      // Try unlink as coordinator (should be rejected by guard)
      getApiAuthContext.mockResolvedValueOnce(COORD_AUTH)
      const unlinkReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_SURGERY}/mail-links/${linkId}`,
        { method: "DELETE" }
      )
      const unlinkRes = await unlinkMailLink(
        unlinkReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_SURGERY, linkId })
      )
      const unlinkBody = await bodyAsJson(unlinkRes)

      expect(unlinkRes.status).toBe(403)
      expect(unlinkBody.error?.code).toBe("company_mutation_access_denied")
    })

    it("unlinks successfully as admin", async () => {
      const UNLINK_ADMIN_SURGERY = "surgery-api-unlink-admin"
      // Create a new link for this test — cross-link since conv is already linked elsewhere
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const attachReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_ADMIN_SURGERY}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Unlink API",
          warningAcknowledged: true,
          crossLinkReason: "Cross-link for unlink test",
        }),
      })
      const attachRes = await attachMailLink(
        attachReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_ADMIN_SURGERY })
      )
      const attachBody = await bodyAsJson(attachRes)
      expect(attachRes.status).toBe(201)
      const linkId = (attachBody.data as { linkId: string }).linkId

      // Unlink
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const unlinkReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_ADMIN_SURGERY}/mail-links/${linkId}`,
        { method: "DELETE" }
      )
      const unlinkRes = await unlinkMailLink(
        unlinkReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_ADMIN_SURGERY, linkId })
      )
      const unlinkBody = await bodyAsJson(unlinkRes)

      expect(unlinkRes.status).toBe(200)
      const data = unlinkBody.data as Record<string, unknown>
      expect(data?.linkId).toBe(linkId)
      const events = data?.eventLog as Array<{ type?: string; actorRole?: string }> | undefined
      const unlinkEvent = events?.find((e) => e.type === "unlinked")
      expect(unlinkEvent).toBeDefined()
      expect(unlinkEvent?.actorRole).toBe("admin")

      // Verify gone from list
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const listReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${UNLINK_ADMIN_SURGERY}/mail-links`)
      const listRes = await listMailLinks(listReq, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: UNLINK_ADMIN_SURGERY }))
      const listBody = await bodyAsJson(listRes)
      const listData = listBody.data as { conversations: Array<{ linkId: string }> }
      expect(listData.conversations.find((c) => c.linkId === linkId)).toBeUndefined()
    })
  })

  describe("GET /mail-links/[linkId]/attachments/[attachmentId]/download", () => {
    it("downloads persisted evidence with authenticated route context", async () => {
      const downloadSurgeryId = `surgery-download-${Date.now()}`
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const attachReq = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${downloadSurgeryId}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: LINKED_CONV_ID,
          surgeryLabel: "CX Download Evidence",
          warningAcknowledged: true,
          crossLinkReason: "Prueba aislada de descarga autenticada",
        }),
      })
      const attachRes = await attachMailLink(attachReq, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: downloadSurgeryId }))
      const attachBody = await bodyAsJson(attachRes)
      const linkId = (attachBody.data as { linkId: string }).linkId

      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const persistReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${downloadSurgeryId}/mail-links/${linkId}/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ attachmentIds: ["a-ortho-1"] }),
        }
      )
      await persistAttachments(persistReq, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: downloadSurgeryId, linkId }))

      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const downloadReq = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${downloadSurgeryId}/mail-links/${linkId}/attachments/a-ortho-1/download`
      )
      const downloadRes = await downloadAttachment(
        downloadReq,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: downloadSurgeryId, linkId, attachmentId: "a-ortho-1" })
      )

      expect(downloadRes.status).toBe(200)
      expect(downloadRes.headers.get("Content-Type")).toBe("application/pdf")
      expect(downloadRes.headers.get("Content-Disposition")).toContain("autorizacion-fernandez.pdf")
      expect(Buffer.from(await downloadRes.arrayBuffer()).length).toBeGreaterThan(0)
    })
  })

  // ════════════════════════════════════════════════════════════════
  // GET /mailbox/conversations — browse mailbox
  // ════════════════════════════════════════════════════════════════
  describe("GET /mailbox/conversations", () => {
    it("returns browse results with permissions", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations?limit=5`
      )
      const res = await browseMailbox(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(200)
      const data = body.data as Record<string, unknown>
      expect(data?.mailbox).toBe(MAIL_STAGE1_MAILBOX)
      const conversations = data?.conversations as Array<Record<string, unknown>>
      expect(conversations?.length).toBeGreaterThan(0)
      const perms = data?.permissions as Record<string, unknown>
      expect(perms?.canView).toBe(true)
      expect(resolveCompanySurgery).toHaveBeenCalledWith(COMPANY_ID, SURGERY_ID)
    })

    it("rejects invalid query params with 400", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations?limit=0`
      )
      const res = await browseMailbox(
        req,
        await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_invalid_browse_query")
    })
  })

  // ════════════════════════════════════════════════════════════════
  // Cross-company segregation
  // ════════════════════════════════════════════════════════════════
  describe("cross-company segregation", () => {
    it("different companies see isolated data", async () => {
      // Create link for test-co-api
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)
      const req = new Request(`http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mail-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({
          externalConversationId: "conv-ortho-001",
          surgeryLabel: "CX Segregation CoA",
        }),
      })
      await attachMailLink(req, await paramsForRoute({ companyId: COMPANY_ID, surgeryId: SURGERY_ID }))

      // Check other-co-api sees empty list
      getApiAuthContext.mockResolvedValueOnce(OTHER_COMPANY_AUTH)
      const otherReq = new Request(`http://localhost/api/companies/other-co-api/surgeries/${SURGERY_ID}/mail-links`)
      const otherRes = await listMailLinks(
        otherReq,
        await paramsForRoute({ companyId: "other-co-api", surgeryId: SURGERY_ID })
      )
      const otherBody = await bodyAsJson(otherRes)
      const otherData = otherBody.data as { conversations: unknown[] }
      expect(otherData.conversations).toEqual([])
    })
  })

  describe("POST /mailbox/conversations/[externalConversationId]/attachments/[attachmentId]/extract-text", () => {
    it("extracts text from an image attachment in mailbox scope", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations/${LINKED_CONV_ID}/attachments/a-ortho-3/extract-text`,
        { method: "POST" }
      )

      const res = await extractMailboxAttachmentText(
        req,
        await paramsForRoute({
          companyId: COMPANY_ID,
          surgeryId: SURGERY_ID,
          externalConversationId: LINKED_CONV_ID,
          attachmentId: "a-ortho-3",
        })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(200)
      const data = body.data as Record<string, unknown>
      expect(data?.attachmentId).toBe("a-ortho-3")
      expect(data?.fileName).toBe("credencial-fernandez.png")
      expect(String(data?.text)).toContain("Adjunto extraído: credencial-fernandez.png")
      expect(String(data?.text)).toContain("Paciente: Fernández")
      expect(extractAutorizacion).toHaveBeenCalledTimes(1)
    })

    it("rejects non-image attachments for this flow", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations/${LINKED_CONV_ID}/attachments/a-ortho-1/extract-text`,
        { method: "POST" }
      )

      const res = await extractMailboxAttachmentText(
        req,
        await paramsForRoute({
          companyId: COMPANY_ID,
          surgeryId: SURGERY_ID,
          externalConversationId: LINKED_CONV_ID,
          attachmentId: "a-ortho-1",
        })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_attachment_extract_requires_image")
      expect(extractAutorizacion).not.toHaveBeenCalled()
    })
  })

  describe("GET /mailbox/conversations/[externalConversationId]/attachments/[attachmentId]/preview", () => {
    it("returns inline image preview for mailbox image attachments", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations/${LINKED_CONV_ID}/attachments/a-ortho-3/preview`
      )

      const res = await previewMailboxAttachment(
        req,
        await paramsForRoute({
          companyId: COMPANY_ID,
          surgeryId: SURGERY_ID,
          externalConversationId: LINKED_CONV_ID,
          attachmentId: "a-ortho-3",
        })
      )

      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toBe("image/png")
      expect(res.headers.get("Content-Disposition")).toContain("credencial-fernandez.png")
    })

    it("rejects non-image attachments for preview", async () => {
      getApiAuthContext.mockResolvedValueOnce(ADMIN_AUTH)

      const req = new Request(
        `http://localhost/api/companies/${COMPANY_ID}/surgeries/${SURGERY_ID}/mailbox/conversations/${LINKED_CONV_ID}/attachments/a-ortho-1/preview`
      )

      const res = await previewMailboxAttachment(
        req,
        await paramsForRoute({
          companyId: COMPANY_ID,
          surgeryId: SURGERY_ID,
          externalConversationId: LINKED_CONV_ID,
          attachmentId: "a-ortho-1",
        })
      )
      const body = await bodyAsJson(res)

      expect(res.status).toBe(400)
      expect(body.error?.code).toBe("mail_attachment_preview_requires_image")
    })
  })
})
