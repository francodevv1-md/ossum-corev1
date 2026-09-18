/**
 * CONTACTO-CODIGO-AUTO-P1: Store-level tests for the new contact-code actions.
 * Verifies getNextContactoCodigo, isCodigoContactoDisponible(codigo, companyId?),
 * and reformatLegacyContactoCodigos per spec §10.2.
 *
 * Uses isolated setState seeding (does not depend on mock-contactos) so the
 * existing contactos-store-020.test.ts assertions on mock data stay intact.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto } from "@/types"

function getStore() {
  return useOrtoTrackStore.getState()
}

function makeContacto(overrides: Partial<Contacto> & { id: string }): Contacto {
  return {
    codigoContacto: "C-0001",
    tipoPersona: "fisica",
    nombre: `Contacto ${overrides.id}`,
    estado: "activo",
    roles: ["cliente"],
    groups: [],
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    ...overrides,
  } as Contacto
}

function seed(contactos: Contacto[]) {
  useOrtoTrackStore.setState({ contactos })
}

describe("Contacto Código Auto P1 — store actions", () => {
  describe("getNextContactoCodigo", () => {
    beforeEach(() => {
      seed([])
    })

    it("returns C-0001 for an empty contactos array", () => {
      expect(getStore().getNextContactoCodigo()).toBe("C-0001")
    })

    it("returns C-0004 when max conforming suffix is 3", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0003" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })

    it("returns C-0004 for sequential C-0001, C-0002, C-0003", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
        makeContacto({ id: "B", codigoContacto: "C-0002" }),
        makeContacto({ id: "C", codigoContacto: "C-0003" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })

    it("returns C-0001 when only legacy (non-conforming) codes exist", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527" }),
        makeContacto({ id: "B", codigoContacto: "8712" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0001")
    })

    it("returns C-0006 for mixed conforming C-0005 + legacy 8527", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0005" }),
        makeContacto({ id: "B", codigoContacto: "8527" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0006")
    })

    it("auto-grows to C-10000 when max conforming is C-9999", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-9999" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-10000")
    })

    it("returns C-10006 for C-10000 + C-10005", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-10000" }),
        makeContacto({ id: "B", codigoContacto: "C-10005" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-10006")
    })

    it("returns C-0001 when only transient C-T#### fallback codes exist", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-T0001" }),
        makeContacto({ id: "B", codigoContacto: "C-T0002" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0001")
    })

    it("returns C-0002 when conforming codes are duplicated (instrumental edge)", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
        makeContacto({ id: "B", codigoContacto: "C-0001" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0002")
    })

    it("accepts companyId param but ignores it (Phase 1 stub)", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
      ])
      expect(getStore().getNextContactoCodigo("comp-A")).toBe(getStore().getNextContactoCodigo("comp-B"))
    })

    it("FR-5: empty array after deleting only contacto returns C-0001 (no persistent deleted-code log in P1)", () => {
      // Phase 1 derives next purely from max(existing conforming). Per FR-5,
      // an empty array always yields C-0001. A persistent deleted-code log
      // (so deletes don't free their code) is a Phase 2 concern.
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0002")
      // Delete the only contacto (filter out).
      seed([])
      expect(getStore().getNextContactoCodigo()).toBe("C-0001")
    })

    it("FR-6 (no reuse of holes): deleting a middle contacto does not lower the next code", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
        makeContacto({ id: "B", codigoContacto: "C-0002" }),
        makeContacto({ id: "C", codigoContacto: "C-0003" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
      // Delete the middle one — counter stays at C-0004, never refills C-0002.
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
        makeContacto({ id: "C", codigoContacto: "C-0003" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })
  })

  describe("isCodigoContactoDisponible(codigo, companyId?)", () => {
    beforeEach(() => {
      seed([])
    })

    it("returns true for a code not present in the array", () => {
      expect(getStore().isCodigoContactoDisponible("C-0042")).toBe(true)
    })

    it("returns false for a code present in the array", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
      ])
      expect(getStore().isCodigoContactoDisponible("C-0001")).toBe(false)
    })

    it("returns false for a legacy code present (un-reformatted)", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527" }),
      ])
      expect(getStore().isCodigoContactoDisponible("8527")).toBe(false)
    })

    it("with companyId returns identical value to without companyId (stub)", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "C-0001" }),
      ])
      expect(getStore().isCodigoContactoDisponible("C-0001", "comp-A")).toBe(
        getStore().isCodigoContactoDisponible("C-0001")
      )
    })

    it("backward-compat: legacy 8527 unavailable before reformat, available after", () => {
      // Self-contained (spec §10.2): seed 8527, assert unavailable, reformat,
      // then assert available. The real top-level mock store equivalent is
      // already covered unchanged by contactos-store-020.test.ts.
      seed([
        makeContacto({ id: "A", codigoContacto: "8527" }),
      ])
      expect(getStore().isCodigoContactoDisponible("8527")).toBe(false)
      getStore().reformatLegacyContactoCodigos()
      expect(getStore().isCodigoContactoDisponible("8527")).toBe(true)
    })
  })

  describe("reformatLegacyContactoCodigos", () => {
    it("rewrites legacy codes ordered by createdAt asc, preserving conforming", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527", createdAt: "2025-01-01" }),
        makeContacto({ id: "B", codigoContacto: "8712", createdAt: "2025-02-01" }),
        makeContacto({ id: "C", codigoContacto: "C-0001", createdAt: "2024-12-01" }),
      ])
      getStore().reformatLegacyContactoCodigos()

      const c = getStore().contactos
      const byId = Object.fromEntries(c.map((x) => [x.id, x.codigoContacto]))
      expect(byId["C"]).toBe("C-0001") // conforming preserved
      expect(byId["A"]).toBe("C-0002") // oldest legacy → first new seq
      expect(byId["B"]).toBe("C-0003")
    })

    it("is idempotent: a second run is a no-op", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527", createdAt: "2025-01-01" }),
        makeContacto({ id: "B", codigoContacto: "8712", createdAt: "2025-02-01" }),
      ])
      getStore().reformatLegacyContactoCodigos()
      const afterFirst = getStore().contactos.map((c) => `${c.id}=${c.codigoContacto}`).join(",")
      getStore().reformatLegacyContactoCodigos()
      const afterSecond = getStore().contactos.map((c) => `${c.id}=${c.codigoContacto}`).join(",")
      expect(afterSecond).toBe(afterFirst)
    })

    it("counter reflects the new max after reformat", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527", createdAt: "2025-01-01" }),
        makeContacto({ id: "B", codigoContacto: "8712", createdAt: "2025-02-01" }),
        makeContacto({ id: "C", codigoContacto: "C-0001", createdAt: "2024-12-01" }),
      ])
      getStore().reformatLegacyContactoCodigos()
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })

    it("before reformat, getNextContactoCodigo ignores legacy; after reformat it reflects them", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527", createdAt: "2025-01-01" }),
        makeContacto({ id: "B", codigoContacto: "8712", createdAt: "2025-02-01" }),
        makeContacto({ id: "C", codigoContacto: "C-0001", createdAt: "2024-12-01" }),
      ])
      expect(getStore().getNextContactoCodigo()).toBe("C-0002") // max conforming = 1
      getStore().reformatLegacyContactoCodigos()
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })

    it("tie-breaks on id ascending when createdAt is identical", () => {
      seed([
        makeContacto({ id: "Y", codigoContacto: "8527", createdAt: "2025-01-01" }),
        makeContacto({ id: "X", codigoContacto: "8712", createdAt: "2025-01-01" }),
      ])
      getStore().reformatLegacyContactoCodigos()
      const byId = Object.fromEntries(getStore().contactos.map((x) => [x.id, x.codigoContacto]))
      expect(byId["X"]).toBe("C-0001") // id ascending: X < Y
      expect(byId["Y"]).toBe("C-0002")
    })

    it("full legacy reformat (no conforming codes): assigns C-0001..C-N in createdAt asc order", () => {
      seed([
        makeContacto({ id: "A", codigoContacto: "8527", createdAt: "2025-03-01" }),
        makeContacto({ id: "B", codigoContacto: "8712", createdAt: "2025-01-01" }),
        makeContacto({ id: "C", codigoContacto: "9001", createdAt: "2025-02-01" }),
      ])
      getStore().reformatLegacyContactoCodigos()
      const byId = Object.fromEntries(getStore().contactos.map((x) => [x.id, x.codigoContacto]))
      // Order by createdAt asc: B (Jan), C (Feb), A (Mar)
      expect(byId["B"]).toBe("C-0001")
      expect(byId["C"]).toBe("C-0002")
      expect(byId["A"]).toBe("C-0003")
      expect(getStore().getNextContactoCodigo()).toBe("C-0004")
    })
  })
})