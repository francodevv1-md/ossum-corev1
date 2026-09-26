import { describe, expect, it, vi } from "vitest"

import {
  getOperationalIndex,
  getUnitEvidence,
} from "@/lib/services/cajas-operational.service"

describe("cajas-operational.service", () => {
  it("maps formulas, physical units, conditions, and active assignments", async () => {
    const db = {
      cajasBoxFormula: {
        findMany: vi.fn().mockResolvedValue([{
          boxArticleId: "box-article-1",
          nextVersionNumber: 2,
          boxEligibility: {
            article: {
              sku: "BOX-TRAUMA",
              description: "Caja trauma",
              family: "Trauma",
              articleType: "Caja",
            },
          },
          currentVersion: {
            versionNumber: 1,
            lines: [{
              articleId: "article-1",
              descriptionSnapshot: "Tornillo 3.5",
              expectedQuantity: "4",
              stockUnit: "u",
              lineNumber: 1,
              eligibility: { article: { sku: "TOR-3.5", description: "Tornillo" } },
            }],
          },
        }]),
      },
      stockIdentifiedUnit: {
        findMany: vi.fn().mockResolvedValue([{
          id: "unit-1",
          articleId: "box-article-1",
          currentConfiguration: { internalCode: "UT-001" },
          cajasConditionProjection: { condition: "available" },
          cajasAssignments: [
            { activeSlot: null, assignedAt: new Date("2026-08-01T09:00:00Z"), surgery: { id: "surgery-1", visibleNumber: "CX-ENDED", cxStatus: "performed", performedDate: new Date("2026-08-01T10:00:00Z"), surgeryDate: null } },
            { activeSlot: 1, assignedAt: new Date("2026-08-01T08:00:00Z"), surgery: { id: "surgery-1", visibleNumber: "CX-ACTIVE", cxStatus: "performed", performedDate: new Date("2026-08-01T10:00:00Z"), surgeryDate: null } },
            { activeSlot: null, assignedAt: new Date("2026-08-02T09:00:00Z"), surgery: { id: "surgery-2", visibleNumber: "CX-102", cxStatus: "finalized", performedDate: null, surgeryDate: new Date("2026-08-02T10:00:00Z") } },
            { activeSlot: null, assignedAt: new Date("2026-08-03T09:00:00Z"), surgery: { id: "surgery-3", visibleNumber: "CX-103", cxStatus: "pending", performedDate: null, surgeryDate: new Date("2026-08-03T10:00:00Z") } },
            { activeSlot: null, assignedAt: new Date("2026-08-04T09:00:00Z"), surgery: { id: "surgery-4", visibleNumber: "CX-104", cxStatus: "cancelled", performedDate: null, surgeryDate: new Date("2026-08-04T10:00:00Z") } },
          ],
        }, {
          id: "unit-2",
          articleId: "box-article-1",
          currentConfiguration: { internalCode: "UT-002" },
          cajasConditionProjection: { condition: "available" },
          cajasAssignments: [{ activeSlot: null, assignedAt: new Date("2026-07-01T09:00:00Z"), surgery: { id: "surgery-ended", visibleNumber: "CX-ONLY-ENDED", cxStatus: "performed", performedDate: null, surgeryDate: null } }],
        }]),
      },
      cajasUnitLogEntry: {
        findMany: vi.fn().mockResolvedValue([
          { boxIdentifiedUnitId: "unit-1", articleId: "article-2", eventKind: "REPAIR_SENT", occurredAt: new Date("2026-08-02T14:00:00Z") },
          { boxIdentifiedUnitId: "unit-1", articleId: "article-1", eventKind: "REPAIR_RETURNED", occurredAt: new Date("2026-08-02T13:00:00Z") },
          { boxIdentifiedUnitId: "unit-1", articleId: "article-1", eventKind: "REPAIR_SENT", occurredAt: new Date("2026-08-02T12:00:00Z") },
          { boxIdentifiedUnitId: "unit-1", articleId: "article-1", eventKind: "PROBLEM_REPORTED", occurredAt: new Date("2026-08-02T11:00:00Z") },
        ]),
      },
      cajasMaintenanceCase: {
        findMany: vi.fn().mockResolvedValue([
          { id: "maintenance-z", boxIdentifiedUnitId: "unit-1", kind: "PREVENTIVE_MAINTENANCE", status: "OPEN", version: 3, updatedAt: new Date("2026-08-06T10:00:00Z"), articleEligibility: null },
          { id: "maintenance-a", boxIdentifiedUnitId: "unit-1", kind: "REPAIR", status: "SENT", version: 2, updatedAt: new Date("2026-08-06T10:00:00Z"), articleEligibility: { article: { description: "Tornillo 3.5" } } },
          { id: "maintenance-old", boxIdentifiedUnitId: "unit-1", kind: "REPAIR", status: "RETURNED_PENDING_REVIEW", version: 4, updatedAt: new Date("2026-08-05T10:00:00Z"), articleEligibility: { article: { description: "Separador" } } },
        ]),
      },
    }

    const result = await getOperationalIndex(db as never, "company-1")

    expect(result).toEqual([expect.objectContaining({
      id: "BOX-TRAUMA",
      category: "Trauma",
      expectedContent: expect.objectContaining({
        label: "v1",
        items: [expect.objectContaining({ articleId: "article-1", articleSku: "TOR-3.5", expectedQuantity: 4 })],
      }),
      units: [{
        unitId: "unit-1",
        code: "UT-001",
        condition: "Disponible",
        operationReference: "CX-ACTIVE",
        evidence: [],
        usageCount: 2,
        lastSurgery: { reference: "CX-102", occurredAt: "2026-08-02T10:00:00.000Z" },
        reportedProblemCount: 1,
        repairSendCount: 2,
        repairLatestSentSignalCount: 1,
        activeMaintenanceCount: 3,
        latestActiveMaintenance: {
          id: "maintenance-z",
          kind: "PREVENTIVE_MAINTENANCE",
          status: "OPEN",
          articleDescription: null,
          version: 3,
          updatedAt: "2026-08-06T10:00:00.000Z",
        },
      }, {
        unitId: "unit-2",
        code: "UT-002",
        condition: "Disponible",
        operationReference: undefined,
        evidence: [],
        usageCount: 1,
        lastSurgery: { reference: "CX-ONLY-ENDED", occurredAt: "2026-07-01T09:00:00.000Z" },
        reportedProblemCount: 0,
        repairSendCount: 0,
        repairLatestSentSignalCount: 0,
        activeMaintenanceCount: 0,
        latestActiveMaintenance: null,
      }],
    })])
    expect(db.cajasUnitLogEntry.findMany).toHaveBeenCalledOnce()
    expect(db.cajasMaintenanceCase.findMany).toHaveBeenCalledOnce()
    expect(db.cajasMaintenanceCase.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        boxIdentifiedUnitId: { in: ["unit-1", "unit-2"] },
        status: { in: ["OPEN", "SENT", "RETURNED_PENDING_REVIEW"] },
      },
      select: expect.any(Object),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    })
  })

  it("does not invent a current formula version when none exists", async () => {
    const db = {
      cajasBoxFormula: {
        findMany: vi.fn().mockResolvedValue([{
          boxArticleId: "box-article-1",
          nextVersionNumber: 1,
          boxEligibility: { article: { sku: "BOX-EMPTY", description: "Caja sin fórmula", family: null, articleType: "Caja" } },
          currentVersion: null,
        }]),
      },
      stockIdentifiedUnit: { findMany: vi.fn().mockResolvedValue([]) },
    }

    const [result] = await getOperationalIndex(db as never, "company-1")

    expect(result.expectedContent).toEqual({
      label: "Sin versión vigente",
      nextLabel: "v1",
      context: "Sin fórmula vigente",
      items: [],
    })
  })

  it("combines every historical assignment, derives distinct qualifying Surgery uses, and includes dispatched instruments", async () => {
    const controlAt = new Date("2026-08-25T10:00:00.000Z")
    const dispatchAt = new Date("2026-08-25T11:00:00.000Z")
    const returnAt = new Date("2026-08-25T12:00:00.000Z")
    const db = {
      stockIdentifiedUnit: { findFirst: vi.fn().mockResolvedValue({ id: "unit-1" }) },
      cajasAssignment: { findMany: vi.fn().mockResolvedValue([
        { id: "assignment-2", assignedAt: new Date("2026-08-24T10:00:00Z"), surgery: { id: "surgery-2", visibleNumber: "CX-102", cxStatus: "pending", performedDate: null, surgeryDate: null } },
        { id: "assignment-1", assignedAt: new Date("2026-08-23T10:00:00Z"), surgery: { id: "surgery-1", visibleNumber: "CX-101", cxStatus: "performed", performedDate: new Date("2026-08-25T09:00:00Z"), surgeryDate: null } },
        { id: "assignment-1b", assignedAt: new Date("2026-08-22T10:00:00Z"), surgery: { id: "surgery-1", visibleNumber: "CX-101", cxStatus: "finalized", performedDate: new Date("2026-08-25T09:00:00Z"), surgeryDate: null } },
        { id: "assignment-3", assignedAt: new Date("2026-08-21T10:00:00Z"), surgery: { id: "surgery-3", visibleNumber: "CX-103", cxStatus: "cancelled", performedDate: null, surgeryDate: null } },
      ]) },
      cajasControl: {
        findMany: vi.fn().mockResolvedValue([{
          id: "control-1",
          assignmentId: "assignment-2",
          kind: "CONTROL",
          result: "CLEAN",
          acceptedAt: controlAt,
          acceptedBy: { firstName: "Ada", lastName: "Lovelace" },
        }]),
      },
      cajasDispatch: {
        findMany: vi.fn().mockResolvedValue([{
          id: "dispatch-original",
          assignmentId: "assignment-1",
          recordKind: "ORIGINAL",
          correctsDispatchId: null,
          sequence: 1,
          acceptedAt: new Date("2026-08-25T10:30:00.000Z"),
          acceptedBy: { firstName: "Ada", lastName: "Lovelace" },
          lines: [{ articleId: "article-obsolete", quantity: "1", accountingSign: 1, neutralizesDispatchLineId: null, descriptionSnapshot: "Instrumental original obsoleto", skuSnapshot: "OLD-1", articleEligibility: { article: { description: "Original obsoleto" } } }],
        }, {
          id: "dispatch-correction",
          assignmentId: "assignment-1",
          recordKind: "CORRECTION",
          correctsDispatchId: "dispatch-original",
          sequence: 2,
          acceptedAt: dispatchAt,
          acceptedBy: { firstName: "Ada", lastName: "Lovelace" },
          lines: [
            { articleId: "article-pinza", quantity: "2", accountingSign: 1, neutralizesDispatchLineId: null, descriptionSnapshot: "Pinza de disección", skuSnapshot: "PIN-1", articleEligibility: { article: { description: "Pinza" } } },
            { articleId: "article-pinza", quantity: "2", accountingSign: -1, neutralizesDispatchLineId: "line-pinza", descriptionSnapshot: "Pinza de disección", skuSnapshot: "PIN-1", articleEligibility: { article: { description: "Pinza" } } },
            { articleId: "article-separador", quantity: "1", accountingSign: 1, neutralizesDispatchLineId: null, descriptionSnapshot: "Separador", skuSnapshot: "SEP-1", articleEligibility: { article: { description: "Separador" } } },
          ],
        }, {
          id: "dispatch-original-reversed",
          assignmentId: "assignment-1b",
          recordKind: "ORIGINAL",
          correctsDispatchId: null,
          sequence: 1,
          acceptedAt: new Date("2026-08-25T10:40:00.000Z"),
          acceptedBy: { firstName: "Ada", lastName: "Lovelace" },
          lines: [{ articleId: "article-sierra", quantity: "1", accountingSign: 1, neutralizesDispatchLineId: null, descriptionSnapshot: "Sierra", skuSnapshot: "SIE-1", articleEligibility: { article: { description: "Sierra" } } }],
        }, {
          id: "dispatch-reversal",
          assignmentId: "assignment-1b",
          recordKind: "REVERSAL",
          correctsDispatchId: "dispatch-original-reversed",
          sequence: 2,
          acceptedAt: new Date("2026-08-25T11:30:00.000Z"),
          acceptedBy: { firstName: "Ada", lastName: "Lovelace" },
          lines: [{ articleId: "article-sierra", quantity: "1", accountingSign: -1, neutralizesDispatchLineId: "line-sierra", descriptionSnapshot: "Sierra", skuSnapshot: "SIE-1", articleEligibility: { article: { description: "Sierra" } } }],
        }]),
      },
      cajasReturnConfirmation: {
        findMany: vi.fn().mockResolvedValue([{
          id: "return-1",
          dispatchId: "dispatch-correction",
          recordKind: "ORIGINAL",
          result: "WITH_DIFFERENCES",
          sequence: 1,
          acceptedAt: returnAt,
          acceptedBy: { firstName: "Grace", lastName: "Hopper" },
        }]),
      },
      cajasUnitLogEntry: {
        findMany: vi.fn().mockResolvedValue([
          { id: "log-2", assignmentId: "assignment-1", articleId: "article-separador", eventKind: "PROBLEM_REPORTED", note: "Marca visible", occurredAt: new Date("2026-08-25T13:00:00Z"), actor: { firstName: "Grace", lastName: "Hopper" }, article: { article: { description: "Separador" } } },
          { id: "log-1", assignmentId: "assignment-1", articleId: "article-pinza", eventKind: "REPAIR_SENT", note: "Juego detectado", occurredAt: new Date("2026-08-25T13:00:00Z"), actor: { firstName: "Grace", lastName: "Hopper" }, article: { article: { description: "Pinza de disección" } } },
        ]),
      },
    }

    const result = await getUnitEvidence(db as never, "company-1", "unit-1")

    expect(result.map((item) => item.id)).toContain("surgery-use:surgery-1")
    expect(result.filter((item) => item.eventKind === "SURGERY_USE")).toHaveLength(1)
    expect(result.find((item) => item.eventKind === "SURGERY_USE")).toEqual(expect.objectContaining({ summary: "Instrumental despachado: Separador" }))
    expect(result.find((item) => item.id === "return-1")).toEqual(expect.objectContaining({
      checkpoint: "Devolución registrada",
      summary: "Devolución #1: Con diferencias",
      actor: "Grace Hopper",
    }))
    expect(result.find((item) => item.id === "dispatch-correction")).toEqual(expect.objectContaining({
      summary: expect.stringContaining("Corrección · Despacho #2 registrado · Pinza de disección, Separador"),
      displayedAt: expect.stringContaining("08:00"),
    }))
    expect(result.find((item) => item.id === "log-1")).toEqual(expect.objectContaining({ articleId: "article-pinza", articleDescription: "Pinza de disección" }))
    expect(result.filter((item) => item.id.startsWith("log-")).map((item) => item.id)).toEqual(["log-2", "log-1"])
    expect(db.cajasAssignment.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", boxIdentifiedUnitId: "unit-1" },
      select: expect.any(Object),
      orderBy: { assignedAt: "desc" },
    })
    expect(db.cajasControl.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", assignmentId: { in: ["assignment-2", "assignment-1", "assignment-1b", "assignment-3"] } },
    }))
    expect(db.cajasDispatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", assignmentId: { in: ["assignment-2", "assignment-1", "assignment-1b", "assignment-3"] } },
    }))
    expect(db.cajasReturnConfirmation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", dispatchId: { in: ["dispatch-original", "dispatch-correction", "dispatch-original-reversed", "dispatch-reversal"] } },
    }))
    expect(db.cajasUnitLogEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", assignmentId: { in: ["assignment-2", "assignment-1", "assignment-1b", "assignment-3"] }, boxIdentifiedUnitId: "unit-1" } }))
  })
})
