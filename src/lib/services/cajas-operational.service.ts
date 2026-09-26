import type { Prisma, PrismaClient } from "@prisma/client";

import { notFound } from "../api/errors";
import type {
  BoxPresentationSku,
  BoxPresentationUnit,
  BoxUnitCondition,
  BoxExpectedContentVersion,
  BoxExpectedContentItem,
  BoxPresentationEvidence,
  BoxActiveMaintenanceSummary,
} from "@/features/boxes/presentation/boxes-presentation-fixtures";

type Db = PrismaClient | Prisma.TransactionClient;

function mapCondition(condition: string | null | undefined): BoxUnitCondition {
  if (condition === "available") return "Disponible";
  if (condition === "withDifferences") return "Con diferencias";
  return null;
}

function actorName(user: { firstName: string | null; lastName: string | null } | null): string | undefined {
  if (!user) return undefined;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || undefined;
}

function formatDisplayedDate(date: Date): string {
  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns the cajas operational index: box formulas with their physical units
 * (StockIdentifiedUnit), current condition (CajasConditionProjection), and
 * latest assignment reference, qualifying Surgery-use summary, and unit-log
 * counters needed by the read-only control board.
 *
 * Evidence is loaded lazily via getUnitEvidence to keep this query fast.
 * Units in the response carry evidence: [] — the page component fills it
 * when the user opens a unit detail.
 */
export async function getOperationalIndex(db: Db, companyId: string): Promise<BoxPresentationSku[]> {
  // 1 — all box formulas with current version lines
  const formulas = await db.cajasBoxFormula.findMany({
    where: { companyId },
    include: {
      boxEligibility: { include: { article: true } },
      currentVersion: {
        include: {
          lines: {
            include: { eligibility: { include: { article: true } } },
            orderBy: { lineNumber: "asc" },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (formulas.length === 0) return [];

  const boxArticleIds = formulas.map((f) => f.boxArticleId);

  // 2 — all physical units for these box articles (single query)
  const units = await db.stockIdentifiedUnit.findMany({
    where: { companyId, articleId: { in: boxArticleIds } },
    include: {
      currentConfiguration: true,
      cajasConditionProjection: true,
      cajasAssignments: {
        orderBy: { assignedAt: "desc" },
        select: {
          activeSlot: true,
          assignedAt: true,
          surgery: {
            select: {
              id: true,
              visibleNumber: true,
              cxStatus: true,
              performedDate: true,
              surgeryDate: true,
            },
          },
        },
      },
    },
  });

  const unitIds = units.map(({ id }) => id);
  const [logEntries, maintenanceCases] = unitIds.length > 0
    ? await Promise.all([
      db.cajasUnitLogEntry.findMany({
        where: { companyId, boxIdentifiedUnitId: { in: unitIds } },
        select: {
          boxIdentifiedUnitId: true,
          articleId: true,
          eventKind: true,
          occurredAt: true,
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      }),
      db.cajasMaintenanceCase.findMany({
        where: {
          companyId,
          boxIdentifiedUnitId: { in: unitIds },
          status: { in: ["OPEN", "SENT", "RETURNED_PENDING_REVIEW"] },
        },
        select: {
          id: true,
          boxIdentifiedUnitId: true,
          kind: true,
          status: true,
          version: true,
          updatedAt: true,
          articleEligibility: { select: { article: { select: { description: true } } } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      }),
    ])
    : [[], []];

  const logsByUnit = new Map<string, typeof logEntries>();
  for (const entry of logEntries) {
    const list = logsByUnit.get(entry.boxIdentifiedUnitId) ?? [];
    list.push(entry);
    logsByUnit.set(entry.boxIdentifiedUnitId, list);
  }

  const maintenanceByUnit = new Map<string, { count: number; latest: BoxActiveMaintenanceSummary }>();
  for (const maintenanceCase of maintenanceCases) {
    const current = maintenanceByUnit.get(maintenanceCase.boxIdentifiedUnitId);
    const summary: BoxActiveMaintenanceSummary = {
      id: maintenanceCase.id,
      kind: maintenanceCase.kind,
      status: maintenanceCase.status as BoxActiveMaintenanceSummary["status"],
      articleDescription: maintenanceCase.articleEligibility?.article.description ?? null,
      version: maintenanceCase.version,
      updatedAt: maintenanceCase.updatedAt.toISOString(),
    };
    maintenanceByUnit.set(maintenanceCase.boxIdentifiedUnitId, {
      count: (current?.count ?? 0) + 1,
      latest: current?.latest ?? summary,
    });
  }

  // 3 — group units by boxArticleId
  const unitsByArticle = new Map<string, typeof units>();
  for (const unit of units) {
    const list = unitsByArticle.get(unit.articleId) ?? [];
    list.push(unit);
    unitsByArticle.set(unit.articleId, list);
  }

  // 4 — map to BoxPresentationSku[]
  return formulas.map((formula): BoxPresentationSku => {
    const article = formula.boxEligibility.article;
    const formulaUnits = unitsByArticle.get(formula.boxArticleId) ?? [];
    const lines = formula.currentVersion?.lines ?? [];

    const expectedContent: BoxExpectedContentVersion = {
      label: formula.currentVersion ? `v${formula.currentVersion.versionNumber}` : "Sin versión vigente",
      nextLabel: `v${formula.nextVersionNumber}`,
      context: formula.currentVersion ? "Fórmula vigente" : "Sin fórmula vigente",
      items: lines.map((line): BoxExpectedContentItem => ({
        articleId: line.articleId,
        articleSku: line.skuSnapshot ?? line.eligibility.article.sku,
        articleName: line.descriptionSnapshot ?? line.eligibility.article.description,
        expectedQuantity: Number(line.expectedQuantity),
        quantityUnit: line.stockUnit,
        order: line.lineNumber,
      })),
    };

    const mappedUnits: BoxPresentationUnit[] = formulaUnits.map((unit) => {
      const condition = unit.cajasConditionProjection?.condition;
      const assignment = unit.cajasAssignments.find(({ activeSlot }) => activeSlot === 1);
      const qualifyingAssignments = unit.cajasAssignments.filter(({ surgery }) =>
        surgery.cxStatus === "performed" || surgery.cxStatus === "finalized");
      const usageCount = new Set(qualifyingAssignments.map(({ surgery }) => surgery.id)).size;
      const lastAssignment = qualifyingAssignments.reduce<(typeof qualifyingAssignments)[number] | null>((latest, current) => {
        const currentDate = current.surgery.performedDate ?? current.surgery.surgeryDate ?? current.assignedAt;
        const latestDate = latest && (latest.surgery.performedDate ?? latest.surgery.surgeryDate ?? latest.assignedAt);
        return !latestDate || currentDate > latestDate ? current : latest;
      }, null);
      const lastSurgeryDate = lastAssignment
        ? lastAssignment.surgery.performedDate ?? lastAssignment.surgery.surgeryDate ?? lastAssignment.assignedAt
        : null;
      const unitLogs = logsByUnit.get(unit.id) ?? [];
      const maintenance = maintenanceByUnit.get(unit.id);
      const repairEntries = unitLogs.filter(({ eventKind }) => eventKind === "REPAIR_SENT" || eventKind === "REPAIR_RETURNED");
      const latestRepairByArticle = new Map<string, (typeof repairEntries)[number]>();
      for (const entry of repairEntries) {
        if (!latestRepairByArticle.has(entry.articleId)) latestRepairByArticle.set(entry.articleId, entry);
      }

      return {
        code: unit.currentConfiguration?.internalCode ?? unit.id,
        condition: mapCondition(condition),
        operationReference: assignment?.surgery?.visibleNumber ?? assignment?.surgery?.id,
        evidence: [],
        unitId: unit.id,
        usageCount,
        lastSurgery: lastAssignment && lastSurgeryDate
          ? {
              reference: lastAssignment.surgery.visibleNumber ?? lastAssignment.surgery.id,
              occurredAt: lastSurgeryDate.toISOString(),
            }
          : null,
        reportedProblemCount: unitLogs.filter(({ eventKind }) => eventKind === "PROBLEM_REPORTED").length,
        repairSendCount: repairEntries.filter(({ eventKind }) => eventKind === "REPAIR_SENT").length,
        repairLatestSentSignalCount: [...latestRepairByArticle.values()]
          .filter(({ eventKind }) => eventKind === "REPAIR_SENT").length,
        activeMaintenanceCount: maintenance?.count ?? 0,
        latestActiveMaintenance: maintenance?.latest ?? null,
      };
    });

    return {
      id: article.sku,
      name: article.description,
      description: article.description,
      category: article.family ?? article.articleType ?? "Caja",
      expectedContent,
      units: mappedUnits,
    };
  });
}

/**
 * Returns all assignment history for a physical unit, including derived
 * Surgery uses and append-only exception entries.
 */
export async function getUnitEvidence(
  db: Db,
  companyId: string,
  unitId: string,
): Promise<BoxPresentationEvidence[]> {
  // 1 — verify the unit exists and belongs to this company
  const unit = await db.stockIdentifiedUnit.findFirst({
    where: { companyId, id: unitId },
    select: { id: true },
  });
  if (!unit) throw notFound("Physical unit not found", "unit_not_found");

  const assignments = await db.cajasAssignment.findMany({
    where: { companyId, boxIdentifiedUnitId: unitId },
    select: {
      id: true,
      assignedAt: true,
      surgery: { select: { id: true, visibleNumber: true, cxStatus: true, performedDate: true, surgeryDate: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  if (assignments.length === 0) return [];
  const assignmentIds = assignments.map(({ id }) => id);

  const controls = await db.cajasControl.findMany({
    where: { companyId, assignmentId: { in: assignmentIds } },
    select: {
      id: true,
      assignmentId: true,
      kind: true,
      result: true,
      acceptedAt: true,
      acceptedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { acceptedAt: "desc" },
  });

  const dispatches = await db.cajasDispatch.findMany({
    where: { companyId, assignmentId: { in: assignmentIds } },
    select: {
      id: true,
      assignmentId: true,
      recordKind: true,
      correctsDispatchId: true,
      sequence: true,
      acceptedAt: true,
      acceptedBy: { select: { firstName: true, lastName: true } },
      lines: {
        select: {
          accountingSign: true,
          articleId: true,
          quantity: true,
          neutralizesDispatchLineId: true,
          descriptionSnapshot: true,
          skuSnapshot: true,
          articleEligibility: { include: { article: true } },
        },
      },
    },
    orderBy: { acceptedAt: "desc" },
  });

  const dispatchIds = dispatches.map((d) => d.id);
  const returns = dispatchIds.length > 0
    ? await db.cajasReturnConfirmation.findMany({
        where: { companyId, dispatchId: { in: dispatchIds } },
        select: {
          id: true,
          dispatchId: true,
          recordKind: true,
          result: true,
          sequence: true,
          acceptedAt: true,
          acceptedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { acceptedAt: "desc" },
      })
    : [];

  const logEntries = await db.cajasUnitLogEntry.findMany({
    where: { companyId, assignmentId: { in: assignmentIds }, boxIdentifiedUnitId: unitId },
    select: {
      id: true,
      assignmentId: true,
      articleId: true,
      eventKind: true,
      note: true,
      occurredAt: true,
      actor: { select: { firstName: true, lastName: true } },
      article: { include: { article: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });

  const evidence: BoxPresentationEvidence[] = [];
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const surgeryReference = (assignmentId: string) => {
    const surgery = assignmentById.get(assignmentId)?.surgery;
    return surgery?.visibleNumber ?? surgery?.id;
  };

  const qualifyingBySurgery = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (assignment.surgery.cxStatus === "performed" || assignment.surgery.cxStatus === "finalized") {
      qualifyingBySurgery.set(assignment.surgery.id, [...(qualifyingBySurgery.get(assignment.surgery.id) ?? []), assignment]);
    }
  }
  for (const surgeryAssignments of qualifyingBySurgery.values()) {
    const assignment = surgeryAssignments[0];
    const surgeryAssignmentIds = new Set(surgeryAssignments.map(({ id }) => id));
    const surgeryDispatches = dispatches.filter((dispatch) => surgeryAssignmentIds.has(dispatch.assignmentId));
    const correctedDispatchIds = new Set(surgeryDispatches.map(({ correctsDispatchId }) => correctsDispatchId).filter(Boolean));
    const netByArticle = new Map<string, { quantity: number; description: string | null }>();
    for (const line of surgeryDispatches.filter(({ id }) => !correctedDispatchIds.has(id)).flatMap(({ lines }) => lines)) {
      const current = netByArticle.get(line.articleId) ?? { quantity: 0, description: null };
      netByArticle.set(line.articleId, {
        quantity: current.quantity + Number(line.quantity) * Number(line.accountingSign),
        description: current.description ?? line.descriptionSnapshot ?? line.articleEligibility.article.description ?? line.skuSnapshot,
      });
    }
    const descriptions = [...netByArticle.values()]
      .filter(({ quantity, description }) => quantity > 0 && Boolean(description))
      .map(({ description }) => description as string);
    const occurredAt = assignment.surgery.performedDate ?? assignment.surgery.surgeryDate ?? assignment.assignedAt;
    const reference = assignment.surgery.visibleNumber ?? assignment.surgery.id;
    evidence.push({
      id: `surgery-use:${assignment.surgery.id}`,
      occurredAt: occurredAt.toISOString(),
      displayedAt: formatDisplayedDate(occurredAt),
      checkpoint: "Uso / CX",
      summary: descriptions.length > 0 ? `Instrumental despachado: ${descriptions.join(", ")}` : "Uso derivado de la asignación a una cirugía realizada.",
      eventKind: "SURGERY_USE",
      surgeryReference: reference,
    });
  }

  for (const c of controls) {
    const isRecontrol = c.kind === "RECONTROL";
    const isClean = c.result === "CLEAN";
    evidence.push({
      id: c.id,
      occurredAt: c.acceptedAt.toISOString(),
      displayedAt: formatDisplayedDate(c.acceptedAt),
      checkpoint: "Control de preparación",
      summary: `${isRecontrol ? "Recontrol" : "Control"}: ${isClean ? "Sin diferencias" : "Con diferencias"}`,
      actor: actorName(c.acceptedBy),
      surgeryReference: surgeryReference(c.assignmentId),
    });
  }

  for (const d of dispatches) {
    const prefix = d.recordKind === "ORIGINAL" ? "" : `${d.recordKind === "CORRECTION" ? "Corrección" : d.recordKind === "REVERSAL" ? "Reversión" : "Anulación"} · `;
    evidence.push({
      id: d.id,
      occurredAt: d.acceptedAt.toISOString(),
      displayedAt: formatDisplayedDate(d.acceptedAt),
      checkpoint: "Contenido despachado",
      summary: `${prefix}Despacho #${d.sequence} registrado${d.lines.length > 0 ? ` · ${[...new Set(d.lines.map((line) => line.descriptionSnapshot ?? line.articleEligibility.article.description ?? line.skuSnapshot).filter(Boolean))].join(", ")}` : ""}`,
      actor: actorName(d.acceptedBy),
      surgeryReference: surgeryReference(d.assignmentId),
    });
  }

  for (const r of returns) {
    const isClean = r.result === "CLEAN";
    const prefix = r.recordKind === "ORIGINAL" ? "" : `${r.recordKind === "CORRECTION" ? "Corrección" : r.recordKind === "REVERSAL" ? "Reversión" : "Anulación"} · `;
    evidence.push({
      id: r.id,
      occurredAt: r.acceptedAt.toISOString(),
      displayedAt: formatDisplayedDate(r.acceptedAt),
      checkpoint: "Devolución registrada",
      summary: `${prefix}Devolución #${r.sequence}: ${isClean ? "Sin diferencias" : "Con diferencias"}`,
      actor: actorName(r.acceptedBy),
      surgeryReference: surgeryReference(dispatches.find((dispatch) => dispatch.id === r.dispatchId)?.assignmentId ?? ""),
    });
  }

  const logPresentation = {
    PROBLEM_REPORTED: { checkpoint: "Problema reportado", eventKind: "PROBLEM_REPORTED" },
    REPAIR_SENT: { checkpoint: "Enviado a reparación", eventKind: "REPAIR_SENT" },
    REPAIR_RETURNED: { checkpoint: "Regresó de reparación", eventKind: "REPAIR_RETURNED" },
  } as const;
  for (const entry of logEntries) {
    const presentation = logPresentation[entry.eventKind as keyof typeof logPresentation];
    if (!presentation) continue;
    evidence.push({
      id: entry.id,
      occurredAt: entry.occurredAt.toISOString(),
      displayedAt: formatDisplayedDate(entry.occurredAt),
      checkpoint: presentation.checkpoint,
      summary: entry.note,
      actor: actorName(entry.actor),
      eventKind: presentation.eventKind,
      surgeryReference: surgeryReference(entry.assignmentId),
      articleId: entry.articleId,
      articleDescription: entry.article.article.description,
    });
  }

  evidence.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));

  return evidence;
}

/**
 * Resolves a physical unit's DB ID from its internal code (or raw unit ID).
 * Used by the evidence endpoint when the frontend only has the code.
 */
export async function resolveUnitIdByCode(db: Db, companyId: string, codeOrId: string): Promise<string | null> {
  // Try by internal code first
  const config = await db.stockIdentifiedUnitCurrentConfiguration.findUnique({
    where: { companyId_internalCode: { companyId, internalCode: codeOrId } },
    select: { identifiedUnitId: true },
  });
  if (config) return config.identifiedUnitId;

  // Fall back to raw unit ID
  const unit = await db.stockIdentifiedUnit.findFirst({
    where: { companyId, id: codeOrId },
    select: { id: true },
  });
  return unit?.id ?? null;
}
