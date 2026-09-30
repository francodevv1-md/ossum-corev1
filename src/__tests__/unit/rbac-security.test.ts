import { describe, expect, it, vi } from "vitest"
import {
  type CanonicalRole,
  CANONICAL_ROLES,
  assertCanonicalRole,
  isCanonicalRole,
  resolveCanonicalRole,
} from "@/lib/permissions/canonical-roles"
import {
  type AppCapability,
  getRoleCapabilities,
  hasCapability,
  isRoleAdmin,
} from "@/lib/permissions/capabilities"
import {
  type ApiAuthContext,
  requireCompanyAdmin,
  requireCompanyCapability,
  requireCompanyMembership,
  requireCompanyMutationAccess,
} from "@/lib/api/guards"
import {
  createCompanyMembership,
  deleteCompanyMembership,
  listCompanyMemberships,
  updateCompanyMembership,
} from "@/lib/services/memberships.service"

describe("RBAC Backend Authority & Canonical Roles", () => {
  describe("1. Canonical Role Resolution & Legacy Aliases", () => {
    it("resolves canonical roles directly", () => {
      expect(resolveCanonicalRole("admin")).toBe("admin")
      expect(resolveCanonicalRole("coordinator")).toBe("coordinator")
      expect(resolveCanonicalRole("logistics")).toBe("logistics")
      expect(resolveCanonicalRole("billing")).toBe("billing")
      expect(resolveCanonicalRole("commercial")).toBe("commercial")
      expect(resolveCanonicalRole("technician")).toBe("technician")
      expect(resolveCanonicalRole("viewer")).toBe("viewer")
    })

    it("resolves legacy and regional aliases correctly", () => {
      // admin aliases
      expect(resolveCanonicalRole("Administrador")).toBe("admin")
      expect(resolveCanonicalRole("superadmin")).toBe("admin")
      expect(resolveCanonicalRole("Administración")).toBe("admin")
      expect(resolveCanonicalRole("ADMIN")).toBe("admin")

      // coordinator aliases
      expect(resolveCanonicalRole("Coordinador")).toBe("coordinator")
      expect(resolveCanonicalRole("coordinador")).toBe("coordinator")

      // logistics aliases
      expect(resolveCanonicalRole("Logística")).toBe("logistics")
      expect(resolveCanonicalRole("logistica")).toBe("logistics")
      expect(resolveCanonicalRole("Depósito")).toBe("logistics")
      expect(resolveCanonicalRole("Operador")).toBe("logistics")
      expect(resolveCanonicalRole("operator")).toBe("logistics")

      // billing aliases
      expect(resolveCanonicalRole("Facturación")).toBe("billing")
      expect(resolveCanonicalRole("facturacion")).toBe("billing")

      // commercial aliases
      expect(resolveCanonicalRole("Vendedor")).toBe("commercial")
      expect(resolveCanonicalRole("vendedor")).toBe("commercial")
      expect(resolveCanonicalRole("Compras")).toBe("commercial")

      // technician aliases
      expect(resolveCanonicalRole("Instrumentador")).toBe("technician")
      expect(resolveCanonicalRole("matrona")).toBe("technician")

      // viewer aliases
      expect(resolveCanonicalRole("Solo lectura")).toBe("viewer")
      expect(resolveCanonicalRole("Gerencia")).toBe("viewer")
    })

    it("rejects unknown or invalid role strings with deny-by-default (null)", () => {
      expect(resolveCanonicalRole("hacker")).toBeNull()
      expect(resolveCanonicalRole("root")).toBeNull()
      expect(resolveCanonicalRole("guest")).toBeNull()
      expect(resolveCanonicalRole("")).toBeNull()
      expect(resolveCanonicalRole(null)).toBeNull()
      expect(resolveCanonicalRole(undefined)).toBeNull()
    })

    it("assertCanonicalRole throws for invalid roles", () => {
      expect(() => assertCanonicalRole("unauthorized_role")).toThrow()
    })
  })

  describe("2. Capability Matrix & Deny-by-default", () => {
    it("enforces Stock & Recepción capabilities", () => {
      // Read allowed for all active company members
      for (const role of CANONICAL_ROLES) {
        expect(hasCapability(role, "stock:read")).toBe(true)
      }

      // Mutate allowed only for admin and logistics
      expect(hasCapability("admin", "stock:mutate")).toBe(true)
      expect(hasCapability("logistics", "stock:mutate")).toBe(true)
      expect(hasCapability("Operador", "stock:mutate")).toBe(true) // alias of logistics
      expect(hasCapability("coordinator", "stock:mutate")).toBe(false)
      expect(hasCapability("billing", "stock:mutate")).toBe(false)
      expect(hasCapability("viewer", "stock:mutate")).toBe(false)

      // Critical allowed only for admin and logistics
      expect(hasCapability("admin", "stock:critical")).toBe(true)
      expect(hasCapability("logistics", "stock:critical")).toBe(true)
      expect(hasCapability("coordinator", "stock:critical")).toBe(false)
    })

    it("enforces Cirugías & Expediente capabilities", () => {
      expect(hasCapability("admin", "cirugias:mutate")).toBe(true)
      expect(hasCapability("coordinator", "cirugias:mutate")).toBe(true)
      expect(hasCapability("logistics", "cirugias:mutate")).toBe(false)
      expect(hasCapability("billing", "cirugias:mutate")).toBe(false)
      expect(hasCapability("viewer", "cirugias:mutate")).toBe(false)
    })

    it("enforces Remitos & Despacho capabilities", () => {
      expect(hasCapability("admin", "remitos:mutate")).toBe(true)
      expect(hasCapability("coordinator", "remitos:mutate")).toBe(true)
      expect(hasCapability("logistics", "remitos:mutate")).toBe(true)
      expect(hasCapability("billing", "remitos:mutate")).toBe(false)
      expect(hasCapability("viewer", "remitos:mutate")).toBe(false)
    })

    it("enforces Consumo & Devolución capabilities", () => {
      // Mutate: admin, coordinator, logistics
      expect(hasCapability("admin", "consumo_devolucion:mutate")).toBe(true)
      expect(hasCapability("coordinator", "consumo_devolucion:mutate")).toBe(true)
      expect(hasCapability("logistics", "consumo_devolucion:mutate")).toBe(true)
      expect(hasCapability("viewer", "consumo_devolucion:mutate")).toBe(false)

      // Critical: admin, logistics
      expect(hasCapability("admin", "consumo_devolucion:critical")).toBe(true)
      expect(hasCapability("logistics", "consumo_devolucion:critical")).toBe(true)
      expect(hasCapability("coordinator", "consumo_devolucion:critical")).toBe(false)
    })

    it("enforces Facturación & Cobros capabilities", () => {
      // Read: admin, billing, coordinator, viewer
      expect(hasCapability("admin", "billing:read")).toBe(true)
      expect(hasCapability("billing", "billing:read")).toBe(true)
      expect(hasCapability("coordinator", "billing:read")).toBe(true)
      expect(hasCapability("viewer", "billing:read")).toBe(true)
      expect(hasCapability("logistics", "billing:read")).toBe(false)
      expect(hasCapability("technician", "billing:read")).toBe(false)

      // Mutate: admin, billing
      expect(hasCapability("admin", "billing:mutate")).toBe(true)
      expect(hasCapability("billing", "billing:mutate")).toBe(true)
      expect(hasCapability("coordinator", "billing:mutate")).toBe(false)
      expect(hasCapability("viewer", "billing:mutate")).toBe(false)
    })

    it("enforces Contactos capabilities", () => {
      expect(hasCapability("admin", "contacts:mutate")).toBe(true)
      expect(hasCapability("coordinator", "contacts:mutate")).toBe(true)
      expect(hasCapability("billing", "contacts:mutate")).toBe(true)
      expect(hasCapability("logistics", "contacts:mutate")).toBe(false)
      expect(hasCapability("viewer", "contacts:mutate")).toBe(false)
    })

    it("enforces Usuarios & Membresías capabilities (admin only)", () => {
      expect(hasCapability("admin", "users_memberships:read")).toBe(true)
      expect(hasCapability("admin", "users_memberships:mutate")).toBe(true)
      expect(hasCapability("coordinator", "users_memberships:mutate")).toBe(false)
      expect(hasCapability("logistics", "users_memberships:mutate")).toBe(false)
      expect(hasCapability("billing", "users_memberships:mutate")).toBe(false)
    })
  })

  describe("3. API Guards Enforcement", () => {
    function createMockAuthContext(role: CanonicalRole, companyId = "company-1", actorUserId = "usr-1"): ApiAuthContext {
      return {
        actorUserId,
        supabaseAuthId: "sub-1",
        companyId,
        role,
        canonicalRole: role,
        rawRole: role,
        user: { id: actorUserId, email: "user@test.com", firstName: "Test", lastName: "User" },
        activeCompany: { id: companyId, name: "Test Co" },
        source: "supabase-auth",
      }
    }

    it("requireCompanyCapability allows authorized role", () => {
      const auth = createMockAuthContext("logistics")
      expect(() => requireCompanyCapability(auth, "stock:mutate")).not.toThrow()
    })

    it("requireCompanyCapability denies unauthorized role with 403", () => {
      const auth = createMockAuthContext("viewer")
      expect(() => requireCompanyCapability(auth, "stock:mutate")).toThrowError()
    })

    it("requireCompanyAdmin allows admin and denies others", () => {
      const adminAuth = createMockAuthContext("admin")
      expect(() => requireCompanyAdmin(adminAuth)).not.toThrow()

      const coordinatorAuth = createMockAuthContext("coordinator")
      expect(() => requireCompanyAdmin(coordinatorAuth)).toThrowError()
    })

    it("requireCompanyMutationAccess normalizes legacy roles for check", () => {
      const auth = createMockAuthContext("logistics")
      expect(() => requireCompanyMutationAccess(auth, ["admin", "Operador"])).not.toThrow()
      expect(() => requireCompanyMutationAccess(auth, ["admin", "coordinator"])).toThrowError()
    })
  })

  describe("4. Memberships Service & Last Admin Protection", () => {
    it("protects last active administrator against deactivation or demotion", async () => {
      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({
            id: "acc-1",
            userId: "usr-admin-1",
            companyId: "company-1",
            role: "admin",
            isActive: true,
            user: { id: "usr-admin-1", email: "admin@test.com", isActive: true },
          }),
          findMany: vi.fn().mockResolvedValue([
            { role: "admin" }, // only 1 active admin
          ]),
          update: vi.fn(),
          delete: vi.fn(),
        },
        user: { update: vi.fn() },
        auditEvent: { create: vi.fn() },
      }

      // Demoting last admin to coordinator must fail
      await expect(
        updateCompanyMembership(mockPrisma as any, "company-1", "usr-admin-1", "acc-1", {
          role: "coordinator",
        })
      ).rejects.toThrow(/único Administrador activo/i)

      // Deactivating last admin must fail
      await expect(
        updateCompanyMembership(mockPrisma as any, "company-1", "usr-admin-1", "acc-1", {
          isActive: false,
        })
      ).rejects.toThrow(/único Administrador activo/i)

      // Deleting last admin must fail
      await expect(
        deleteCompanyMembership(mockPrisma as any, "company-1", "usr-admin-1", "acc-1")
      ).rejects.toThrow(/único Administrador activo/i)
    })

    it("allows updating when multiple active administrators exist", async () => {
      const mockPrisma = {
        userCompanyAccess: {
          findFirst: vi.fn().mockResolvedValue({
            id: "acc-1",
            userId: "usr-admin-1",
            companyId: "company-1",
            role: "admin",
            isActive: true,
            user: { id: "usr-admin-1", email: "admin@test.com", isActive: true },
          }),
          findMany: vi.fn().mockResolvedValue([
            { role: "admin" },
            { role: "admin" }, // 2 active admins
          ]),
          update: vi.fn().mockResolvedValue({
            id: "acc-1",
            userId: "usr-admin-1",
            role: "coordinator",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: "usr-admin-1",
              email: "admin@test.com",
              firstName: "Admin",
              lastName: "One",
              phone: null,
              isActive: true,
            },
          }),
        },
        user: { update: vi.fn() },
        auditEvent: { create: vi.fn().mockResolvedValue({}) },
      }

      const result = await updateCompanyMembership(
        mockPrisma as any,
        "company-1",
        "usr-admin-1",
        "acc-1",
        { role: "coordinator" }
      )

      expect(result.canonicalRole).toBe("coordinator")
      expect(mockPrisma.auditEvent.create).toHaveBeenCalled()
    })
  })
})
