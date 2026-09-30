import { describe, expect, it } from "vitest";
import {
  requireSeguimientoEventMutationAccess,
  type ApiAuthContext,
} from "@/lib/api/guards";
import { resolveCanonicalRole, type CanonicalRole } from "@/lib/permissions/canonical-roles";

function createContext(roleInput: string): ApiAuthContext {
  const canonical = resolveCanonicalRole(roleInput) ?? ("viewer" as CanonicalRole);
  return {
    actorUserId: "user-1",
    supabaseAuthId: null,
    companyId: "company-1",
    role: canonical,
    canonicalRole: canonical,
    rawRole: roleInput,
    user: {
      id: "user-1",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
    },
    activeCompany: {
      id: "company-1",
      name: "OSSUM COR Test",
    },
    source: "dev-header",
  };
}

describe("requireSeguimientoEventMutationAccess", () => {
  it("permits admin and coordinator with cirugias:mutate capability", () => {
    expect(() => requireSeguimientoEventMutationAccess(createContext("admin"))).not.toThrow();
    expect(() => requireSeguimientoEventMutationAccess(createContext("coordinator"))).not.toThrow();
  });

  it.each(["billing", "viewer", "arbitrary-role"])(
    "denies %s with capability_denied",
    (role) => {
      expect(() => requireSeguimientoEventMutationAccess(createContext(role))).toThrow(
        expect.objectContaining({
          status: 403,
          code: "capability_denied",
        })
      );
    }
  );
});
