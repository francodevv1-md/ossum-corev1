import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Phase D logistics migration artifact", () => {
  it("is additive and protects operation and reconciliation history from mutation", () => {
    const sql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260907100000_phase_d_logistics_reconciliation/migration.sql"), "utf8")
    expect(sql).toContain('CREATE TABLE "cajas_phase_d_operation"')
    expect(sql).toContain('CREATE TABLE "cajas_phase_d_reconciliation_event"')
    expect(sql).toContain('CREATE TABLE "cajas_phase_d_action_grant"')
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON "cajas_phase_d_operation"')
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON "cajas_phase_d_reconciliation_event"')
    expect(sql).not.toMatch(/DROP\s+(TABLE|TYPE)/i)
  })
})
