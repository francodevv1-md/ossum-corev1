import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { acceptCajasControl, getCajasDispatchEligibility, resolveCajasDifference } from "@/lib/services/cajas-control.service";

const active = (position = "p1") => ({ preparationLineId: "pl1", stockPositionId: position, quantity: new Prisma.Decimal(1), stockUnit: "UNIT", scaleSnapshot: 0, allocationTraceSnapshot: { traceMode: "NONE" }, followingCorrelations: [], stockPosition: { articleId: "a1" }, stockReservation: { projection: { status: "ACTIVE", activeQuantity: new Prisma.Decimal(1) } } });
function db() {
  const tx: any = { operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() }, auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit" }) }, cajasControl: { create: vi.fn() }, cajasControlLine: { createMany: vi.fn() }, cajasDifference: { create: vi.fn() }, cajasPreparation: { update: vi.fn() }, cajasAssignment: { findFirst: vi.fn().mockResolvedValue({ boxArticleId: "box", controls: [], preparations: [{ id: "prep", formulaVersionId: "fv", version: 1, latestControlId: null, lines: [{ id: "pl1", articleId: "a1", quantity: new Prisma.Decimal(1), stockUnit: "UNIT", scaleSnapshot: 0, expectedFormulaLineId: null, role: "EXPECTED", reservationCorrelations: [active()] }] }] }) } };
  return { ...tx, $transaction: vi.fn((fn: any) => fn(tx)), _tx: tx } as any;
}
describe("Phase C control runtime", () => {
  it("creates immutable allocation control snapshot and audit", async () => {
    const client = db(); await expect(acceptCajasControl(client, "co", "sx", "as", "u", { idempotencyKey: "k", reason: "checked" })).resolves.toMatchObject({ replayed: false });
    expect(client._tx.cajasControlLine.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ stockPositionId: "p1", traceCapture: { traceMode: "NONE" } })] }));
    expect(client._tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u", action: "cajas_control_accepted" }) }));
  });
  it("treats two valid 1+1 allocations for one expected 2-unit line as clean", async () => {
    const client = db(); const preparation = (await client._tx.cajasAssignment.findFirst()).preparations[0];
    preparation.lines[0].quantity = new Prisma.Decimal(2);
    preparation.lines[0].reservationCorrelations.push(active("p2"));
    await acceptCajasControl(client, "co", "sx", "as", "u", { idempotencyKey: "split", reason: "checked" });
    expect(client._tx.cajasControl.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ result: "CLEAN" }) }));
  });
  it.each([["accept", true], ["reject", false]] as const)("records %s resolution audit and closure", async (decision, closesDifference) => {
    const client = db(); client._tx.cajasDifference.findFirst = vi.fn().mockResolvedValue({ resolutions: [] }); client._tx.cajasDifferenceResolution = { create: vi.fn() };
    await resolveCajasDifference(client, "co", "sx", "as", "d", "u", { decision, reason: "reason", evidenceReference: "evidence", idempotencyKey: decision });
    expect(client._tx.cajasDifferenceResolution.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ closesDifference, explanation: "reason", supportingReference: "evidence", acceptedById: "u", acceptedAt: expect.any(Date) }) }));
  });
  it("keeps rejected differences dispatch-blocking and requires recontrol after composition", async () => {
    const client = db(); const assignment: any = { id: "as", preparations: [{ requiresRecontrol: true, version: 1, latestControl: { id: "c", sourcePreparationVersion: 1 }, lines: [{ quantity: new Prisma.Decimal(1), reservationCorrelations: [active()] }] }], differences: [{ resolutions: [{ closesDifference: false }] }], dispatches: [] };
    client.cajasAssignment.findFirst = vi.fn().mockResolvedValue(assignment);
    await expect(getCajasDispatchEligibility(client, "co", "sx", "as")).resolves.toMatchObject({ eligible: false, reason: "control_stale" });
    assignment.preparations[0].requiresRecontrol = false;
    await expect(getCajasDispatchEligibility(client, "co", "sx", "as")).resolves.toMatchObject({ eligible: false, reason: "difference_open" });
  });
});
