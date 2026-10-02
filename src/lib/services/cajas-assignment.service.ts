import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { ensureArticleReference } from "./cajas-formula.service";
import type {
  CajasAssignmentCreateInput,
  CajasAssignmentEndInput,
} from "../validators/cajas-assignment";
import crypto from "node:crypto";
import { cajasTransaction, lockCajasAssignment, openCajasDifferences, replayCajasCommand } from "./cajas-command.service";

type Db = PrismaClient | Prisma.TransactionClient;

function supportsTransactions(db: Db): db is PrismaClient {
  return "$connect" in db && typeof db.$connect === "function" &&
    "$transaction" in db && typeof db.$transaction === "function";
}

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  });
  if (!company) throw notFound("Empresa no encontrada", "company_not_found");
  return company.organizationId;
}

export async function ensureStockScopeReferenceForUnit(
  db: Db,
  companyId: string,
  articleReferenceId: string,
  unit: { id: string; unitCode: string; serialNumber: string | null },
  actorUserId: string,
) {
  const existing = await db.cajasStockScopeReference.findUnique({
    where: {
      companyId_sourceStockScopeId: {
        companyId,
        sourceStockScopeId: unit.id,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return db.cajasStockScopeReference.create({
    data: {
      companyId,
      articleReferenceId,
      sourceStockScopeId: unit.id,
      kind: "identifiedUnit",
      identifiedCodeSnapshot: unit.unitCode,
      serialNumberSnapshot: unit.serialNumber,
      verifiedAt: new Date(),
      verifiedById: actorUserId,
    },
  });
}

export async function assignBoxToSurgery(
  db: Db,
  companyId: string,
  surgeryId: string,
  input: CajasAssignmentCreateInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return cajasTransaction(db, (tx) =>
      assignBoxToSurgery(tx, companyId, surgeryId, input, actorUserId),
    );
  }

  const organizationId = await getCompanyOrganization(db, companyId);
  const semanticKey = input.idempotencyKey ?? `assignment:${input.physicalUnitId}:${surgeryId}`;
  const payload = { surgeryId, physicalUnitId: input.physicalUnitId, notes: input.notes?.trim() || null };
  const replay = await replayCajasCommand(db as Prisma.TransactionClient, companyId, surgeryId, "assignment", semanticKey, payload);
  if (replay) return getBoxAssignment(db, companyId, replay.resultEntityId);

  // 1. Validate surgery exists in company
  const surgery = await db.surgery.findFirst({
    where: { id: surgeryId, companyId },
    select: {
      id: true,
      visibleNumber: true,
      patient: { select: { firstName: true, lastName: true, tradeName: true, legalName: true } },
      institution: { select: { tradeName: true, legalName: true } },
    },
  });
  if (!surgery) {
    throw notFound("Cirugía no encontrada en esta empresa", "surgery_not_found");
  }

  // 2. Validate physical box unit exists in company and is ACTIVE
  const physicalUnit = await db.stockPhysicalUnit.findFirst({
    where: { id: input.physicalUnitId, companyId },
    include: {
      article: { select: { id: true, sku: true, description: true, unit: true, articleType: true } },
    },
  });
  if (!physicalUnit) {
    throw notFound("Caja identificada no encontrada en esta empresa", "physical_unit_not_found");
  }
  if (physicalUnit.status === "RETIRED") {
    throw badRequest("No se puede asignar una caja identificada retirada", "physical_unit_retired");
  }
  await (db as Prisma.TransactionClient).$queryRaw`SELECT id FROM stock_physical_unit WHERE company_id = ${companyId} AND id = ${physicalUnit.id} FOR UPDATE`;

  // 3. Ensure Article Reference for Box Article
  const { ref: boxArticleRef } = await ensureArticleReference(
    db,
    companyId,
    organizationId,
    physicalUnit.articleId,
    actorUserId,
  );

  // 4. Ensure Stock Scope Reference for this Physical Unit
  const stockScopeRef = await ensureStockScopeReferenceForUnit(
    db,
    companyId,
    boxArticleRef.id,
    physicalUnit,
    actorUserId,
  );

  // 5. Check if this box already has an active assignment
  const existingActiveAssignment = await db.cajasAssignment.findFirst({
    where: {
      companyId,
      boxStockScopeReferenceId: stockScopeRef.id,
      activeSlot: 1,
    },
    include: {
      surgery: { select: { id: true, visibleNumber: true } },
    },
  });
  if (existingActiveAssignment) {
    throw conflict(
      `La caja ${physicalUnit.unitCode} ya está asignada a otra cirugía activa (${existingActiveAssignment.surgery.visibleNumber || existingActiveAssignment.surgery.id})`,
      "box_already_assigned",
    );
  }

  // 6. Look up current Box Formula and active formula version
  const boxFormula = await db.cajasBoxFormula.findUnique({
    where: {
      companyId_boxArticleReferenceId: {
        companyId,
        boxArticleReferenceId: boxArticleRef.id,
      },
    },
    include: {
      currentSelector: {
        include: {
          currentFormulaVersion: {
            include: {
              lines: {
                orderBy: { lineNumber: "asc" },
                include: { articleReference: true },
              },
            },
          },
        },
      },
    },
  });

  const currentVersion = boxFormula?.currentSelector?.currentFormulaVersion;
  if (!boxFormula || !currentVersion || currentVersion.lines.length === 0) {
    throw badRequest(
      `El artículo caja ${physicalUnit.article.sku} no posee una fórmula de composición activa`,
      "missing_box_formula",
    );
  }

  // 7. Atomic creation of Assignment + Preparation + Lines
  const assignmentId = "ca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const preparationId = "cp_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const commandAcceptanceId = "cca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  // AuditEvent
  const auditEvent = await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "CajasAssignment",
    entityId: assignmentId,
    action: "created",
    module: "stock",
    newValue: {
      surgeryId,
      physicalUnitId: physicalUnit.id,
      unitCode: physicalUnit.unitCode,
      boxArticleSku: physicalUnit.article.sku,
      formulaVersionNumber: currentVersion.versionNumber,
      formulaVersionId: currentVersion.id,
      lineCount: currentVersion.lines.length,
      notes: input.notes?.trim() || null,
    },
  });

  const intentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  // CommandAcceptance
  const commandAcceptance = await db.cajasCommandAcceptance.create({
    data: {
      id: commandAcceptanceId,
      companyId,
      sourceOperationId: surgeryId,
      checkpoint: "assignment",
      semanticKey,
      intentHash,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      resultEntityType: "CajasAssignment",
      resultEntityId: assignmentId,
      auditEventId: auditEvent.id,
    },
  });

  // Assignment
  const assignment = await db.cajasAssignment.create({
    data: {
      id: assignmentId,
      companyId,
      surgeryId,
      boxStockScopeReferenceId: stockScopeRef.id,
      activeSlot: 1,
      assignedAt: new Date(),
      assignedById: actorUserId,
      assignmentCommandAcceptanceId: commandAcceptance.id,
    },
  });

  // Preparation
  const preparation = await db.cajasPreparation.create({
    data: {
      id: preparationId,
      companyId,
      assignmentId: assignment.id,
      formulaVersionId: currentVersion.id,
      version: 1,
      requiresRecontrol: false,
    },
  });

  // Preparation Lines (copying from formula version lines)
  for (const fLine of currentVersion.lines) {
    const prepLineId = "cpl_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    await db.cajasPreparationLine.create({
      data: {
        id: prepLineId,
        companyId,
        preparationId: preparation.id,
        lineKey: `line-${fLine.lineNumber}`,
        expectedFormulaLineId: fLine.id,
        role: "expected",
        articleReferenceId: fLine.articleReferenceId,
        quantity: fLine.expectedQuantity,
        unit: fLine.unit,
        isActive: true,
      },
    });
  }

  return getBoxAssignment(db, companyId, assignment.id);
}

export async function listSurgeryBoxAssignments(db: Db, companyId: string, surgeryId: string) {
  await getCompanyOrganization(db, companyId);

  const assignments = await db.cajasAssignment.findMany({
    where: { companyId, surgeryId },
    include: {
      boxStockScopeReference: {
        include: {
          articleReference: true,
        },
      },
      assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      endedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      preparation: {
        include: {
          formulaVersion: { select: { id: true, versionNumber: true, cause: true } },
          _count: { select: { lines: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return assignments.map((a) => {
    const assigner = a.assignedBy;
    const assignerName = assigner
      ? `${assigner.firstName || ""} ${assigner.lastName || ""}`.trim() || assigner.email
      : null;
    const ender = a.endedBy;
    const enderName = ender
      ? `${ender.firstName || ""} ${ender.lastName || ""}`.trim() || ender.email
      : null;

    return {
      id: a.id,
      companyId: a.companyId,
      surgeryId: a.surgeryId,
      boxStockScopeReferenceId: a.boxStockScopeReferenceId,
      physicalUnitId: a.boxStockScopeReference.sourceStockScopeId,
      unitCode: a.boxStockScopeReference.identifiedCodeSnapshot,
      serialNumber: a.boxStockScopeReference.serialNumberSnapshot,
      boxArticleId: a.boxStockScopeReference.articleReference.sourceArticleId,
      boxSku: a.boxStockScopeReference.articleReference.skuSnapshot,
      boxDescription: a.boxStockScopeReference.articleReference.descriptionSnapshot,
      isActive: a.activeSlot === 1,
      assignedAt: a.assignedAt.toISOString(),
      assignedById: a.assignedById,
      assignedByName: assignerName,
      endedAt: a.endedAt ? a.endedAt.toISOString() : null,
      endedById: a.endedById,
      endedByName: enderName,
      endCause: a.endCause,
      preparation: a.preparation
        ? {
            id: a.preparation.id,
            version: a.preparation.version,
            formulaVersionId: a.preparation.formulaVersionId,
            formulaVersionNumber: a.preparation.formulaVersion.versionNumber,
            formulaCause: a.preparation.formulaVersion.cause,
            lineCount: a.preparation._count.lines,
            requiresRecontrol: a.preparation.requiresRecontrol,
          }
        : null,
    };
  });
}

export async function listPhysicalUnitAssignments(db: Db, companyId: string, physicalUnitId: string) {
  await getCompanyOrganization(db, companyId);

  const assignments = await (db as any).cajasAssignment.findMany({
    where: {
      companyId,
      boxStockScopeReference: { sourceStockScopeId: physicalUnitId },
    },
    include: {
      surgery: {
        select: {
          id: true,
          visibleNumber: true,
          patient: { select: { firstName: true, lastName: true, tradeName: true, legalName: true } },
          institution: { select: { tradeName: true, legalName: true } },
        },
      },
      assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      endedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      preparation: {
        include: {
          formulaVersion: { select: { id: true, versionNumber: true } },
          _count: { select: { lines: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return assignments.map((a: any) => {
    const assigner = a.assignedBy;
    const assignerName = assigner
      ? `${assigner.firstName || ""} ${assigner.lastName || ""}`.trim() || assigner.email
      : null;

    const patientName = a.surgery?.patient
      ? `${a.surgery.patient.firstName || ""} ${a.surgery.patient.lastName || ""}`.trim() ||
        a.surgery.patient.tradeName ||
        a.surgery.patient.legalName
      : null;
    const institutionName = a.surgery?.institution
      ? a.surgery.institution.tradeName || a.surgery.institution.legalName
      : null;

    return {
      id: a.id,
      companyId: a.companyId,
      surgeryId: a.surgeryId,
      surgeryVisibleNumber: a.surgery?.visibleNumber || null,
      surgeryPatientName: patientName,
      surgeryInstitutionName: institutionName,
      isActive: a.activeSlot === 1,
      assignedAt: a.assignedAt.toISOString(),
      assignedByName: assignerName,
      endedAt: a.endedAt ? a.endedAt.toISOString() : null,
      endCause: a.endCause,
      formulaVersionNumber: a.preparation?.formulaVersion.versionNumber ?? null,
      lineCount: a.preparation?._count.lines ?? 0,
    };
  });
}

export async function getBoxAssignment(db: Db, companyId: string, assignmentId: string) {
  await getCompanyOrganization(db, companyId);

  const assignment = await db.cajasAssignment.findFirst({
    where: { id: assignmentId, companyId },
    include: {
      surgery: {
        select: {
          id: true,
          visibleNumber: true,
          patient: { select: { firstName: true, lastName: true, tradeName: true, legalName: true } },
          institution: { select: { tradeName: true, legalName: true } },
        },
      },
      boxStockScopeReference: {
        include: {
          articleReference: true,
        },
      },
      assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      endedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      preparation: {
        include: {
          formulaVersion: { select: { id: true, versionNumber: true, cause: true, acceptedAt: true } },
          lines: {
            orderBy: { lineKey: "asc" },
            include: { articleReference: true, stockScopeReference: true },
          },
        },
      },
      differences: { include: { resolutions: { orderBy: { sequence: "desc" } } } },
      controls: { include: { lines: true }, orderBy: { sequence: "desc" } },
      stockReservations: { orderBy: { createdAt: "asc" } },
      dispatches: { include: { lines: { include: { accounting: true, dispositions: true } }, returnConfirmations: true, consumptionConfirmations: true }, orderBy: { sequence: "asc" } },
    },
  });

  if (!assignment) {
    throw notFound("Asignación de caja no encontrada", "assignment_not_found");
  }

  const assigner = assignment.assignedBy;
  const assignerName = assigner
    ? `${assigner.firstName || ""} ${assigner.lastName || ""}`.trim() || assigner.email
    : null;
  const ender = assignment.endedBy;
  const enderName = ender
    ? `${ender.firstName || ""} ${ender.lastName || ""}`.trim() || ender.email
    : null;

  const patientName = assignment.surgery?.patient
    ? `${assignment.surgery.patient.firstName || ""} ${assignment.surgery.patient.lastName || ""}`.trim() ||
      assignment.surgery.patient.tradeName ||
      assignment.surgery.patient.legalName
    : null;
  const institutionName = assignment.surgery?.institution
    ? assignment.surgery.institution.tradeName || assignment.surgery.institution.legalName
    : null;

  return {
    id: assignment.id,
    companyId: assignment.companyId,
    surgeryId: assignment.surgeryId,
    surgeryVisibleNumber: assignment.surgery?.visibleNumber || null,
    surgeryPatientName: patientName,
    surgeryInstitutionName: institutionName,
    physicalUnitId: assignment.boxStockScopeReference.sourceStockScopeId,
    unitCode: assignment.boxStockScopeReference.identifiedCodeSnapshot,
    serialNumber: assignment.boxStockScopeReference.serialNumberSnapshot,
    boxArticleId: assignment.boxStockScopeReference.articleReference.sourceArticleId,
    boxSku: assignment.boxStockScopeReference.articleReference.skuSnapshot,
    boxDescription: assignment.boxStockScopeReference.articleReference.descriptionSnapshot,
    isActive: assignment.activeSlot === 1,
    assignedAt: assignment.assignedAt.toISOString(),
    assignedById: assignment.assignedById,
    assignedByName: assignerName,
    endedAt: assignment.endedAt ? assignment.endedAt.toISOString() : null,
    endedById: assignment.endedById,
    endedByName: enderName,
    endCause: assignment.endCause,
    differences: assignment.differences,
    controls: assignment.controls,
    reservations: assignment.stockReservations,
    dispatches: assignment.dispatches,
    preparation: assignment.preparation
      ? {
          id: assignment.preparation.id,
          version: assignment.preparation.version,
          formulaVersionId: assignment.preparation.formulaVersionId,
          formulaVersionNumber: assignment.preparation.formulaVersion.versionNumber,
          formulaCause: assignment.preparation.formulaVersion.cause,
          formulaAcceptedAt: assignment.preparation.formulaVersion.acceptedAt.toISOString(),
          requiresRecontrol: assignment.preparation.requiresRecontrol,
          lines: assignment.preparation.lines.map((l: any) => ({
            id: l.id,
            lineKey: l.lineKey,
            role: l.role,
            articleId: l.articleReference.sourceArticleId,
            sku: l.articleReference.skuSnapshot,
            description: l.articleReference.descriptionSnapshot,
            quantity: Number(l.quantity),
            unit: l.unit,
            isActive: l.isActive,
            stockScopeReferenceId: l.stockScopeReferenceId,
            stockScope: l.stockScopeReference,
            dispatchedQuantity: Number(l.dispatchedQuantity),
            version: l.version,
            lotNumber: l.lotNumberSnapshot,
            serialNumber: l.serialNumberSnapshot,
            expirationDate: l.expirationDateSnapshot,
          })),
        }
      : null,
    createdAt: assignment.createdAt ? assignment.createdAt.toISOString() : assignment.assignedAt.toISOString(),
  };
}

export async function endBoxAssignment(
  db: Db,
  companyId: string,
  assignmentId: string,
  input: CajasAssignmentEndInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return cajasTransaction(db, (tx) =>
      endBoxAssignment(tx, companyId, assignmentId, input, actorUserId),
    );
  }

  await getCompanyOrganization(db, companyId);

  await lockCajasAssignment(db as Prisma.TransactionClient, companyId, assignmentId);
  const semanticKey = input.idempotencyKey ?? `end-assignment:${assignmentId}`;
  const payload = { assignmentId, cause: input.cause.trim() };
  const replay = await replayCajasCommand(db as Prisma.TransactionClient, companyId, assignmentId, "assignment", semanticKey, payload);
  if (replay) return getBoxAssignment(db, companyId, assignmentId);

  const current = await db.cajasAssignment.findFirst({
    where: { id: assignmentId, companyId },
    include: {
      boxStockScopeReference: true,
      preparation: { include: { latestControl: true, lines: { where: { isActive: true } } } },
    },
  });

  if (!current) {
    throw notFound("Asignación de caja no encontrada", "assignment_not_found");
  }

  if (current.activeSlot === null) {
    throw badRequest("La asignación de caja ya fue finalizada previamente", "assignment_already_ended");
  }
  if (!current.preparation?.latestControl || current.preparation.requiresRecontrol || current.preparation.latestControl.result !== "clean" || current.preparation.latestControl.sourcePreparationVersion !== current.preparation.version) throw conflict("Control limpio vigente obligatorio", "cajas_closure_recontrol_required");
    if ((await openCajasDifferences(db, companyId, assignmentId)).length) throw conflict("Hay diferencias abiertas", "cajas_open_differences");
    if (current.preparation.lines.some((line) => line.stockScopeReferenceId && line.quantity.gt(line.dispatchedQuantity))) throw conflict("Queda contenido pendiente de despacho", "cajas_closure_pending_dispatch");
  const pending = await db.cajasDispatchLineAccounting.count({ where: { companyId, dispatchLine: { dispatch: { assignmentId } }, pendingQuantity: { gt: 0 } } });
  const activeReservations = await db.stockReservation.count({ where: { companyId, assignmentId, status: "ACTIVE" } });
  if (pending || activeReservations) throw conflict("Quedan saldos o reservas pendientes", "cajas_closure_pending");

  const endCommandAcceptanceId = "cca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  // AuditEvent
  const auditEvent = await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "CajasAssignment",
    entityId: current.id,
    action: "updated",
    module: "stock",
    oldValue: { activeSlot: current.activeSlot, endedAt: current.endedAt },
    newValue: { activeSlot: null, endedAt: new Date(), endCause: input.cause.trim() },
  });

  const intentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  // CommandAcceptance for ending assignment
  const commandAcceptance = await db.cajasCommandAcceptance.create({
    data: {
      id: endCommandAcceptanceId,
      companyId,
      sourceOperationId: current.id,
      checkpoint: "assignment",
      semanticKey,
      intentHash,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      resultEntityType: "CajasAssignment",
      resultEntityId: current.id,
      auditEventId: auditEvent.id,
    },
  });

  await db.cajasAssignment.update({
    where: { id: current.id },
    data: {
      activeSlot: null,
      endedAt: new Date(),
      endedById: actorUserId,
      endCause: input.cause.trim(),
      endCommandAcceptanceId: commandAcceptance.id,
    },
  });

  return getBoxAssignment(db, companyId, current.id);
}
