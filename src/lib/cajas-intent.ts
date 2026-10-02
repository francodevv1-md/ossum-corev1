import {
  getBoxAssignmentApi,
  listSurgeryBoxAssignmentsApi,
  type BoxAssignmentDetail,
} from "./api/cajas-assignments";

export interface BuildDispatchIntentItem {
  id: string; // remitoItemId
  sku?: string | null;
  articleId?: string | null;
  itemId?: string | null;
  preparationLineId?: string | null;
  description?: string | null;
  quantity: string | number;
  lotNumber?: string | null;
  serialNumber?: string | null;
}

export interface BuildDispatchIntentRemito {
  id: string;
  items?: BuildDispatchIntentItem[];
}

export function buildCajasDispatchPayload(
  assignment: BoxAssignmentDetail,
  remito: BuildDispatchIntentRemito,
): {
  assignmentId: string;
  expectedVersion: number;
  idempotencyKey: string;
  lines: Array<{
    preparationLineId: string;
    remitoItemId: string;
    quantity: number;
  }>;
} | null {
  if (!assignment.preparation || !assignment.preparation.lines || !assignment.preparation.lines.length) {
    return null;
  }
  const remitoItems = remito.items ?? [];
  if (!remitoItems.length) {
    return null;
  }

  const lines = remitoItems.map((item) => {
    let prepLine: NonNullable<BoxAssignmentDetail["preparation"]>["lines"][number] | undefined;

    if (item.preparationLineId) {
      // 1. Explicit preparationLineId must exist and be active; never fall back to SKU matching
      prepLine = assignment.preparation!.lines.find((l) => l.id === item.preparationLineId && l.isActive);
      if (!prepLine) {
        throw new Error(
          `Explicit preparation line "${item.preparationLineId}" not found or inactive in assignment ${assignment.id}.`
        );
      }
    } else {
      // 2. Match active candidate preparation lines by SKU or articleId
      const candidates = assignment.preparation!.lines.filter((l) => {
        if (!l.isActive) return false;
        const itemSku = item.sku?.trim().toLowerCase();
        const lineSku = l.sku?.trim().toLowerCase();
        if (itemSku && lineSku && itemSku === lineSku) return true;
        const itemArtId = item.articleId ?? item.itemId;
        if (itemArtId && (l.articleId === itemArtId || l.articleReference?.sourceArticleId === itemArtId)) return true;
        return false;
      });

      if (candidates.length === 0) {
        throw new Error(
          `No matching preparation line found for item "${item.description || item.sku || item.id}" in assignment ${assignment.id}.`
        );
      }

      if (candidates.length === 1) {
        prepLine = candidates[0];
      } else {
        // Disambiguate by lot and/or serial number if available
        let refined = candidates;
        if (item.lotNumber) {
          refined = refined.filter((l) => (l.lotNumberSnapshot ?? "") === item.lotNumber);
        }
        if (item.serialNumber) {
          refined = refined.filter((l) => (l.serialNumberSnapshot ?? "") === item.serialNumber);
        }

        if (refined.length === 1) {
          prepLine = refined[0];
        } else if (refined.length > 1) {
          throw new Error(
            `Ambiguous preparation line association for item "${item.sku || item.description || item.id}": multiple preparation lines match in assignment ${assignment.id}.`
          );
        } else {
          throw new Error(
            `No matching preparation line found for item "${item.sku || item.description || item.id}" with specified lot/serial in assignment ${assignment.id}.`
          );
        }
      }
    }

    // 3. Universal traceability validation across all paths
    if (item.lotNumber && (prepLine.lotNumberSnapshot ?? "") !== item.lotNumber) {
      throw new Error(
        `Incompatible lot number "${item.lotNumber}" for preparation line "${prepLine.id}" (expected "${prepLine.lotNumberSnapshot ?? ""}").`
      );
    }
    if (item.serialNumber && (prepLine.serialNumberSnapshot ?? "") !== item.serialNumber) {
      throw new Error(
        `Incompatible serial number "${item.serialNumber}" for preparation line "${prepLine.id}" (expected "${prepLine.serialNumberSnapshot ?? ""}").`
      );
    }

    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(
        `Invalid quantity "${item.quantity}" for item "${item.id}": quantity must be a positive finite number.`
      );
    }

    return {
      preparationLineId: prepLine.id,
      remitoItemId: item.id,
      quantity: qty,
    };
  });

  return {
    assignmentId: assignment.id,
    expectedVersion: assignment.preparation.version,
    idempotencyKey: `dispatch-${assignment.id}-${remito.id}`,
    lines,
  };
}

export type CajasDispatchIntentPayload = NonNullable<ReturnType<typeof buildCajasDispatchPayload>>;

export interface BuildAccountingIntentItem {
  id: string; // sourceItemId (consumoItemId or devolucionItemId)
  remitoItemId?: string | null;
  dispatchLineId?: string | null;
  consumedQuantity?: number | string | null;
  returnedQuantity?: number | string | null;
  recognizedReturnDispositionId?: string | null;
}

export interface BuildAccountingIntentDoc {
  id: string;
  items?: BuildAccountingIntentItem[];
}

export interface CajasDispatchWithLines {
  id: string;
  remitoId: string;
  lines?: Array<{
    id: string;
    remitoItemId: string;
    quantity: number | string;
    unit: string;
  }>;
}

export function buildCajasAccountingPayload(
  dispatch: CajasDispatchWithLines,
  doc: BuildAccountingIntentDoc,
  owner: "consumption" | "return",
  dispositionKind: "consumed" | "unchanged" | "missing" | "damaged" | "underReview" = owner === "consumption" ? "consumed" : "unchanged",
): {
  dispatchId: string;
  idempotencyKey: string;
  lines: Array<{
    dispatchLineId: string;
    sourceItemId: string;
    quantity: number;
    kind: "consumed" | "unchanged" | "missing" | "damaged" | "underReview";
    recognizedReturnDispositionId?: string;
  }>;
} | null {
  if (!dispatch.lines || !dispatch.lines.length) return null;
  const docItems = doc.items ?? [];
  if (!docItems.length) return null;

  const lines: Array<{
    dispatchLineId: string;
    sourceItemId: string;
    quantity: number;
    kind: typeof dispositionKind;
    recognizedReturnDispositionId?: string;
  }> = [];

  for (const item of docItems) {
    const rawQty = owner === "consumption" ? item.consumedQuantity : item.returnedQuantity;
    const qty = Number(rawQty ?? 0);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error(`Invalid quantity "${rawQty}" on document item "${item.id}": must be a non-negative number.`);
    }
    // Items with zero quantity do not generate accounting lines
    if (qty === 0) continue;

    let dispatchLine: NonNullable<CajasDispatchWithLines["lines"]>[number] | undefined;

    if (item.dispatchLineId) {
      dispatchLine = dispatch.lines.find((l) => l.id === item.dispatchLineId);
      if (!dispatchLine) {
        throw new Error(`Dispatch line "${item.dispatchLineId}" not found in dispatch "${dispatch.id}".`);
      }
    } else {
      if (!item.remitoItemId) {
        throw new Error(`Missing remitoItemId on document item "${item.id}" required for Cajas accounting association.`);
      }
      const matches = dispatch.lines.filter((l) => l.remitoItemId === item.remitoItemId);
      if (matches.length === 0) {
        throw new Error(`No matching dispatch line found for remitoItemId "${item.remitoItemId}" in dispatch "${dispatch.id}".`);
      }
      if (matches.length > 1) {
        throw new Error(
          `Ambiguous dispatch line association for remitoItemId "${item.remitoItemId}": multiple (${matches.length}) dispatch lines match in dispatch "${dispatch.id}".`
        );
      }
      dispatchLine = matches[0];
    }

    lines.push({
      dispatchLineId: dispatchLine.id,
      sourceItemId: item.id,
      quantity: qty,
      kind: dispositionKind,
      ...(item.recognizedReturnDispositionId ? { recognizedReturnDispositionId: item.recognizedReturnDispositionId } : {}),
    });
  }

  if (!lines.length) return null;

  return {
    dispatchId: dispatch.id,
    idempotencyKey: `${owner}-acc-${doc.id}`,
    lines,
  };
}

export type CajasAccountingIntentPayload = NonNullable<ReturnType<typeof buildCajasAccountingPayload>>;

export async function findCajasDispatchForRemito(
  companyId: string,
  surgeryId: string,
  remitoId: string,
): Promise<{ assignment: BoxAssignmentDetail; dispatch: CajasDispatchWithLines } | null> {
  // Let network / API errors throw so callers stop the affected submission and display the error
  const assignments = await listSurgeryBoxAssignmentsApi(companyId, surgeryId);
  const matching: Array<{ assignment: BoxAssignmentDetail; dispatch: CajasDispatchWithLines }> = [];

  for (const a of assignments) {
    const detail = await getBoxAssignmentApi(companyId, a.id);
    if (detail.dispatches) {
      const dispatchesForRemito = detail.dispatches.filter((d) => d.remitoId === remitoId);
      for (const d of dispatchesForRemito) {
        matching.push({ assignment: detail, dispatch: d as unknown as CajasDispatchWithLines });
      }
    }
  }

  if (matching.length === 0) {
    return null; // Confirmed no Cajas dispatch for this remito
  }

  if (matching.length > 1) {
    throw new Error(
      `Ambiguous Cajas dispatch for remito "${remitoId}": multiple (${matching.length}) matching dispatches found across box assignments.`
    );
  }

  return matching[0];
}

export async function findActiveCajasAssignmentForSurgery(
  companyId: string,
  surgeryId: string,
): Promise<BoxAssignmentDetail | null> {
  // Let network / API errors throw so callers stop the affected submission and display the error
  const assignments = await listSurgeryBoxAssignmentsApi(companyId, surgeryId);
  const activeAssignments = assignments.filter((a) => a.isActive);

  if (activeAssignments.length === 0) {
    return null; // Confirmed no active Cajas assignment for this surgery
  }

  if (activeAssignments.length > 1) {
    throw new Error(
      `Ambiguous active Cajas assignments for surgery "${surgeryId}": multiple (${activeAssignments.length}) active assignments found.`
    );
  }

  return await getBoxAssignmentApi(companyId, activeAssignments[0].id);
}
