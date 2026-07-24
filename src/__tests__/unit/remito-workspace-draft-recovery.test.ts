import { beforeEach, describe, expect, it } from "vitest"

import { clearRemitoWorkspaceDraft, readRemitoWorkspaceDraft, remitoWorkspaceDraftKey, REMITO_WORKSPACE_DRAFT_TTL_MS, writeRemitoWorkspaceDraft } from "@/lib/remito-workspace-draft-recovery"

const draft = { branchId: "suc-1", recipient: "Hospital", item: { lot: "L-1", serial: "S-1" } }
const isDraft = (value: unknown): value is typeof draft => Boolean(value && typeof value === "object" && "branchId" in value)
const createContext = { userId: "user/a", companyId: "company:1", mode: "create" as const }

describe("remito workspace draft recovery", () => {
  beforeEach(() => window.sessionStorage.clear())

  it("scopes versioned keys by encoded user, company and workspace mode", () => {
    expect(remitoWorkspaceDraftKey(createContext)).toContain("user%2Fa")
    expect(remitoWorkspaceDraftKey(createContext)).toContain("company%3A1")
    expect(remitoWorkspaceDraftKey(createContext)).not.toBe(remitoWorkspaceDraftKey({ ...createContext, userId: "other" }))
    expect(remitoWorkspaceDraftKey(createContext)).not.toBe(remitoWorkspaceDraftKey({ ...createContext, mode: "edit", remitoId: "rem-1" }))
  })

  it("returns a matching draft without applying it and rejects expired, corrupt or mismatched entries", () => {
    expect(writeRemitoWorkspaceDraft(createContext, draft, null, 100)).toEqual({ status: "written" })
    expect(readRemitoWorkspaceDraft(createContext, isDraft, 101)).toMatchObject({ status: "valid", envelope: { draft } })

    window.sessionStorage.setItem(remitoWorkspaceDraftKey(createContext), "not-json")
    expect(readRemitoWorkspaceDraft(createContext, isDraft, 101)).toEqual({ status: "invalid" })
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(createContext))).toBeNull()

    writeRemitoWorkspaceDraft(createContext, draft, null, 100)
    expect(readRemitoWorkspaceDraft(createContext, isDraft, 100 + REMITO_WORKSPACE_DRAFT_TTL_MS)).toEqual({ status: "invalid" })

    writeRemitoWorkspaceDraft(createContext, draft, null, 100)
    expect(readRemitoWorkspaceDraft({ ...createContext, companyId: "other-company" }, isDraft, 101)).toEqual({ status: "none" })
  })

  it("keeps storage failures non-blocking and clears the exact scoped key", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "sessionStorage")
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: { getItem: () => null, setItem: () => { throw new Error("quota") }, removeItem: () => undefined } })
    expect(writeRemitoWorkspaceDraft(createContext, draft, null)).toEqual({ status: "failed" })
    Object.defineProperty(window, "sessionStorage", descriptor!)

    writeRemitoWorkspaceDraft(createContext, draft, null)
    writeRemitoWorkspaceDraft({ ...createContext, userId: "other" }, draft, null)
    expect(clearRemitoWorkspaceDraft(createContext)).toBe(true)
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(createContext))).toBeNull()
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey({ ...createContext, userId: "other" }))).not.toBeNull()
  })
})
