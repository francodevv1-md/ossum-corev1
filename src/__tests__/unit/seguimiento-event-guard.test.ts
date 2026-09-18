import { describe, expect, it } from "vitest";
import {
  requireSeguimientoEventMutationAccess,
  type ApiAuthContext,
} from "@/lib/api/guards";

function createContext(role: string): ApiAuthContext {
  return {
    actorUserId: "user-1",
    supabaseAuthId: null,
    companyId: "company-1",
    role,
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
  it("permits exactly admin", () => {
    expect(() => requireSeguimientoEventMutationAccess(createContext("admin"))).not.toThrow();
  });

  it.each(["coordinator", "operator", "arbitrary-role"])(
    "denies %s with the company mutation access error",
    (role) => {
      expect(() => requireSeguimientoEventMutationAccess(createContext(role))).toThrow(
        expect.objectContaining({
          status: 403,
          code: "company_mutation_access_denied",
        })
      );
    }
  );
});
