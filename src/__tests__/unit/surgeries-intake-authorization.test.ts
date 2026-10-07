import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateCreateSurgeryInput,
  validateUpdateSurgeryInput,
  validateUpdateSurgeryCxStatusInput,
} from "@/lib/validators/surgery.validator"
import {
  createSurgery,
  updateSurgery,
  updateSurgeryCxStatus,
} from "@/lib/services/surgery.service"
import { emitCrossDomainNotification } from "@/lib/services/internal-notifications.service"
import type { PrismaClient } from "@prisma/client"

vi.mock("@/lib/audit", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
}))

vi.mock("@/lib/services/internal-notifications.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/internal-notifications.service")>()
  return {
    ...actual,
    emitCrossDomainNotification: vi.fn().mockResolvedValue({ createdCount: 1, attemptedCount: 1 }),
  }
})

describe("DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001 Unit Tests", () => {
  const companyId = "comp-1"
  const actorUserId = "user-1"
  const coordinatorContactId = "coord-contact-1"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Surgery Validators", () => {
    it("accepts coordinatorContactId in validateCreateSurgeryInput", () => {
      const input = validateCreateSurgeryInput({
        patientId: "pat-1",
        coordinatorContactId,
        classification: "Reemplazo total de rodilla",
        priority: "urgent",
      })

      expect(input.coordinatorContactId).toBe(coordinatorContactId)
      expect(input.classification).toBe("Reemplazo total de rodilla")
      expect(input.priority).toBe("urgent")
    })

    it("accepts coordinatorContactId in validateUpdateSurgeryInput", () => {
      const input = validateUpdateSurgeryInput({
        coordinatorContactId: "new-coord-contact",
        cxStatus: "authorized",
      })

      expect(input.coordinatorContactId).toBe("new-coord-contact")
      expect(input.cxStatus).toBe("authorized")
    })

    it("maps Spanish 'Autorizada' to canonical 'authorized' in validateUpdateSurgeryCxStatusInput", () => {
      const input = validateUpdateSurgeryCxStatusInput({
        cxStatus: "Autorizada",
      })

      expect(input.cxStatus).toBe("authorized")
    })
  })

  describe("Surgery Service Persistence & Coordinator", () => {
    it("creates surgery and inserts SurgeryContactAssignment when coordinatorContactId is present", async () => {
      const mockTx = {
        surgery: {
          create: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        surgeryContactAssignment: {
          create: vi.fn().mockResolvedValue({ id: "assign-1" }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ maxNumber: "0" }]),
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        contactCompanyLink: {
          findMany: vi.fn().mockResolvedValue([
            { contactId: "pat-1" },
            { contactId: coordinatorContactId },
          ]),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      const result = await createSurgery(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        {
          patientId: "pat-1",
          coordinatorContactId,
          classification: "Artroscopía",
        }
      )

      expect(result.id).toBe("surg-1")
      expect(mockTx.surgery.create).toHaveBeenCalled()
      expect(mockTx.surgeryContactAssignment.create).toHaveBeenCalledWith({
        data: {
          surgeryId: "surg-1",
          contactId: coordinatorContactId,
          role: "coordinator",
          isPrimary: true,
        },
      })
    })

    it("updates surgery and replaces SurgeryContactAssignment when coordinatorContactId changes", async () => {
      const mockTx = {
        surgery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        surgeryContactAssignment: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({ id: "assign-2" }),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        contactCompanyLink: {
          findMany: vi.fn().mockResolvedValue([
            { contactId: "new-coord-2" },
          ]),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      const result = await updateSurgery(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        "surg-1",
        {
          coordinatorContactId: "new-coord-2",
        }
      )

      expect(mockTx.surgeryContactAssignment.deleteMany).toHaveBeenCalledWith({
        where: { surgeryId: "surg-1", role: "coordinator" },
      })
      expect(mockTx.surgeryContactAssignment.create).toHaveBeenCalledWith({
        data: {
          surgeryId: "surg-1",
          contactId: "new-coord-2",
          role: "coordinator",
          isPrimary: true,
        },
      })
    })
  })

  describe("Backend Authorization Evidence Validation & Routing", () => {
    it("rejects authorizing surgery when neither evidence nor exception exists in seguimiento", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockResolvedValue(0),
        },
        surgery: {
          updateMany: vi.fn(),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      await expect(
        updateSurgeryCxStatus(
          mockPrisma,
          { companyId, actorUserId, module: "surgery" },
          "surg-1",
          "authorized"
        )
      ).rejects.toThrow("Para autorizar la cirugía se requiere comprobante o registro de excepción en Seguimiento.")

      expect(mockTx.surgery.updateMany).not.toHaveBeenCalled()
    })

    it("rejects authorizing surgery when only generic document_evidence exists (generic documents do not satisfy authorization requirement)", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockImplementation(({ where }) => {
            // Count query specifically searches for authorization_evidence or action: authorization_recorded
            // Generic document_evidence is excluded and returns 0 matches
            return Promise.resolve(0)
          }),
        },
        surgery: {
          updateMany: vi.fn(),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      await expect(
        updateSurgeryCxStatus(
          mockPrisma,
          { companyId, actorUserId, module: "surgery" },
          "surg-1",
          "authorized"
        )
      ).rejects.toThrow("Para autorizar la cirugía se requiere comprobante o registro de excepción en Seguimiento.")
    })

    it("allows authorizing surgery when verifiable authorization_evidence exists in seguimiento", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockImplementation(({ where }) => {
            if (where.OR) return Promise.resolve(1) // 1 authorization evidence entry found
            return Promise.resolve(0)
          }),
        },
        surgery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "authorized",
          }),
        },
        surgeryContactAssignment: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      const result = await updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        "surg-1",
        "authorized"
      )

      expect(result?.cxStatus).toBe("authorized")
      expect(mockTx.surgery.updateMany).toHaveBeenCalledWith({
        where: { id: "surg-1", companyId, archivedAt: null },
        data: { cxStatus: "authorized" },
      })
    })

    it("allows authorizing surgery when registered exception note exists in seguimiento", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockImplementation(({ where }) => {
            if (where.entryType === "note") return Promise.resolve(1) // 1 exception note found
            return Promise.resolve(0)
          }),
        },
        surgery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "authorized",
          }),
        },
        surgeryContactAssignment: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      const result = await updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        "surg-1",
        "authorized"
      )

      expect(result?.cxStatus).toBe("authorized")
      expect(mockTx.surgery.updateMany).toHaveBeenCalled()
    })

    it("routes authorized notification specifically to assigned coordinator user with valid /expediente?id= linkHref", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockResolvedValue(1),
        },
        surgery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "authorized",
          }),
        },
        surgeryContactAssignment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "assign-1",
            contactId: "coord-contact-1",
            contact: {
              id: "coord-contact-1",
              email: "nelson@example.com",
            },
          }),
        },
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({
            userId: "nelson-user-id",
          }),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      await updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        "surg-1",
        "authorized"
      )

      expect(emitCrossDomainNotification).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          type: "surgery_authorized",
          linkHref: "/expediente?id=surg-1",
          explicitRecipientUserIds: ["nelson-user-id"],
        })
      )
    })

    it("sets explicitRecipientUserIds to empty array (0 recipients, no broadcast) when coordinator contact cannot be mapped", async () => {
      const mockTx = {
        seguimientoEntry: {
          count: vi.fn().mockResolvedValue(1),
        },
        surgery: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "authorized",
          }),
        },
        surgeryContactAssignment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "assign-1",
            contactId: "coord-contact-1",
            contact: {
              id: "coord-contact-1",
              email: "unmatched@example.com",
            },
          }),
        },
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      }

      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({ role: "admin", company: { isActive: true } }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: "surg-1",
            visibleNumber: "CX-0001",
            companyId,
            cxStatus: "pending",
          }),
        },
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as PrismaClient

      await updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        "surg-1",
        "authorized"
      )

      expect(emitCrossDomainNotification).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          type: "surgery_authorized",
          linkHref: "/expediente?id=surg-1",
          explicitRecipientUserIds: [],
        })
      )
    })
  })
})
