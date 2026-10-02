// @vitest-environment node
import type { Prisma, PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { cajasTransaction } from "@/lib/services/cajas-command.service";
import { createBoxFormula, publishFormulaVersion } from "@/lib/services/cajas-formula.service";
import { createStockPhysicalUnit, updateStockPhysicalUnit } from "@/lib/services/stock-physical-unit.service";
import { assignBoxToSurgery, endBoxAssignment } from "@/lib/services/cajas-assignment.service";

describe("Cajas modern public root/transaction shape", () => {
  it("reuses the supplied owner transaction even when it exposes $transaction", async () => {
    const tx = { $transaction: vi.fn(() => { throw new Error("nested transaction"); }) };
    const run = vi.fn(async (owner) => { expect(owner).toBe(tx); return "accepted"; });
    expect(await cajasTransaction(tx as unknown as Prisma.TransactionClient, run)).toBe("accepted");
    expect(run).toHaveBeenCalledTimes(1);
    expect(tx.$transaction).not.toHaveBeenCalled();
  });

  it("opens exactly one root callback and preserves the owner's identity", async () => {
    const tx = { $transaction: vi.fn(() => { throw new Error("nested transaction"); }) };
    const root = { $connect: vi.fn(), $transaction: vi.fn(async (run) => run(tx)) };
    const run = vi.fn(async (owner) => { expect(owner).toBe(tx); return "accepted"; });
    expect(await cajasTransaction(root as unknown as PrismaClient, (owner) => cajasTransaction(owner, run))).toBe("accepted");
    expect(root.$transaction).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(tx.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["formula create", (db: any) => createBoxFormula(db, "company", {} as any, "actor")],
    ["formula publish", (db: any) => publishFormulaVersion(db, "company", "formula", {} as any, "actor")],
    ["physical create", (db: any) => createStockPhysicalUnit(db, "company", {} as any, "actor")],
    ["physical update", (db: any) => updateStockPhysicalUnit(db, "company", "unit", {} as any, "actor")],
    ["assignment create", (db: any) => assignBoxToSurgery(db, "company", "surgery", {} as any, "actor")],
    ["assignment end", (db: any) => endBoxAssignment(db, "company", "assignment", {} as any, "actor")],
  ])("%s enters domain work once without nested savepoints", async (_name, invoke) => {
    const domainReached = new Error("domain reached");
    const tx = {
      $transaction: vi.fn(() => { throw new Error("nested transaction"); }),
      company: { findUnique: vi.fn(() => { throw domainReached; }) },
      stockPhysicalUnit: { findFirst: vi.fn(() => { throw domainReached; }) },
    };
    const root = { $connect: vi.fn(), $transaction: vi.fn(async (run) => run(tx)) };
    await expect(invoke(root)).rejects.toBe(domainReached);
    expect(root.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$transaction).not.toHaveBeenCalled();
  });
});
