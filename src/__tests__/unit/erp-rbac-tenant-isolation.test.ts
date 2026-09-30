import { describe, it, expect } from "vitest";
import {
  hasCapability,
  getRoleCapabilities,
  APP_CAPABILITIES,
  type AppCapability,
} from "@/lib/permissions/capabilities";
import {
  requireCompanyCapability,
  requireCompanyAdmin,
  requireCompanyMembership,
} from "@/lib/api/guards";
import type { ApiAuthContext } from "@/lib/api/auth-context";

describe("ERP Backend - RBAC & Tenant Isolation", () => {
  const createMockContext = (
    companyId: string,
    role: any,
    userId = "user-1"
  ): ApiAuthContext => ({
    companyId,
    actorUserId: userId,
    role,
    canonicalRole: role,
    rawRole: role,
    supabaseAuthId: null,
    user: { id: userId, email: "user@ossum.test", firstName: "Test", lastName: "User" },
    activeCompany: { id: companyId, name: "OSSUM Test SA" },
    source: "dev-header",
  });

  describe("1. Deny-by-default for viewer and unknown roles", () => {
    const mutationCapabilities: AppCapability[] = [
      "stock:mutate",
      "cirugias:mutate",
      "remitos:mutate",
      "consumo_devolucion:mutate",
      "billing:mutate",
      "contacts:mutate",
      "users_memberships:mutate",
      "purchases:mutate",
    ];

    it("viewer has ZERO mutation capabilities", () => {
      const viewerCaps = getRoleCapabilities("viewer");
      for (const cap of mutationCapabilities) {
        expect(viewerCaps).not.toContain(cap);
        expect(hasCapability("viewer", cap)).toBe(false);

        const ctx = createMockContext("comp-1", "viewer");
        expect(() => requireCompanyCapability(ctx, cap)).toThrow(/Permission denied/);
      }
    });

    it("unknown or malformed role has ZERO capabilities and throws 403", () => {
      const unknownRoles = ["hacker", "guest", "operator_legacy", "", null, undefined];
      for (const r of unknownRoles) {
        expect(getRoleCapabilities(r)).toHaveLength(0);
        for (const cap of APP_CAPABILITIES) {
          expect(hasCapability(r, cap)).toBe(false);
          const ctx = createMockContext("comp-1", r as any);
          expect(() => requireCompanyCapability(ctx, cap)).toThrow(/Permission denied/);
        }
      }
    });
  });

  describe("2. Purchases Domain Role Segregation", () => {
    it("logistics can mutate necesidades and stock, but CANNOT mutate Orden de Pago", () => {
      const ctx = createMockContext("comp-1", "logistics");

      // Needs and stock mutation allowed
      expect(hasCapability("logistics", "purchases:mutate")).toBe(true);
      expect(hasCapability("logistics", "stock:mutate")).toBe(true);
      expect(() => requireCompanyCapability(ctx, "purchases:mutate")).not.toThrow();

      // Payments / Orden de Pago requires billing:mutate -> DENIED for logistics
      expect(hasCapability("logistics", "billing:mutate")).toBe(false);
      expect(() => requireCompanyCapability(ctx, "billing:mutate")).toThrow(/Permission denied/);
    });

    it("billing can mutate Orden de Pago, but CANNOT mutate logistics or cirugias", () => {
      const ctx = createMockContext("comp-1", "billing");

      // Billing mutation allowed
      expect(hasCapability("billing", "billing:mutate")).toBe(true);
      expect(() => requireCompanyCapability(ctx, "billing:mutate")).not.toThrow();

      // Cirugias and stock mutations DENIED for billing
      expect(hasCapability("billing", "cirugias:mutate")).toBe(false);
      expect(hasCapability("billing", "stock:mutate")).toBe(false);
      expect(() => requireCompanyCapability(ctx, "cirugias:mutate")).toThrow(/Permission denied/);
      expect(() => requireCompanyCapability(ctx, "stock:mutate")).toThrow(/Permission denied/);
    });

    it("coordinator can mutate Cirugías, Remitos and Necesidades, but CANNOT mutate Stock directamente or Orden de Pago", () => {
      const ctx = createMockContext("comp-1", "coordinator");

      expect(hasCapability("coordinator", "cirugias:mutate")).toBe(true);
      expect(hasCapability("coordinator", "remitos:mutate")).toBe(true);
      expect(hasCapability("coordinator", "purchases:mutate")).toBe(true);
      expect(() => requireCompanyCapability(ctx, "cirugias:mutate")).not.toThrow();

      // Stock physical adjustments and payments are DENIED for coordinator
      expect(hasCapability("coordinator", "stock:mutate")).toBe(false);
      expect(hasCapability("coordinator", "billing:mutate")).toBe(false);
      expect(() => requireCompanyCapability(ctx, "stock:mutate")).toThrow(/Permission denied/);
      expect(() => requireCompanyCapability(ctx, "billing:mutate")).toThrow(/Permission denied/);
    });
  });

  describe("3. Multi-Tenant Membership and Isolation Guards", () => {
    it("requireCompanyMembership throws 403 if companyId or actorUserId is missing", () => {
      const invalidCtx1 = createMockContext("", "admin");
      expect(() => requireCompanyMembership(invalidCtx1)).toThrow(/Company membership required/);

      const invalidCtx2 = { ...createMockContext("comp-1", "admin"), actorUserId: "" };
      expect(() => requireCompanyMembership(invalidCtx2)).toThrow(/Company membership required/);
    });

    it("requireCompanyAdmin restricts non-admin roles strictly", () => {
      const nonAdminRoles = ["coordinator", "logistics", "billing", "commercial", "technician", "viewer"];
      for (const role of nonAdminRoles) {
        const ctx = createMockContext("comp-1", role);
        expect(() => requireCompanyAdmin(ctx)).toThrow(/Administrator access required/);
      }

      const adminCtx = createMockContext("comp-1", "admin");
      expect(() => requireCompanyAdmin(adminCtx)).not.toThrow();
    });
  });
});
