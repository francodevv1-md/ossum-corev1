import { Prisma } from "@prisma/client";
import type { PrismaClient, StockMovementType } from "@prisma/client";
import { badRequest, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import type { StockAdjustmentCreateInput, StockAvailabilityQuery } from "../validators/stock";

type Db = PrismaClient | Prisma.TransactionClient;

export interface RecordStockMovementInput {
  companyId: string;
  articleId: string;
  movementType: StockMovementType;
  quantity: number | string | Prisma.Decimal;
  lotCode?: string | null;
  serialNumber?: string | null;
  expirationDate?: Date | string | null;
  location?: string | null;
  boxId?: string | null;
  receiptId?: string | null;
  receiptLineId?: string | null;
  remitoId?: string | null;
  remitoItemId?: string | null;
  consumoId?: string | null;
  consumoItemId?: string | null;
  devolucionId?: string | null;
  devolucionItemId?: string | null;
  surgeryId?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  createdById?: string | null;
}

export interface LotAvailability {
  id: string;
  deposit: string;
  location: string | null;
  lot: string | null;
  serial: string | null;
  expiry: string | null;
  physical: number;
  available: number;
  reserved: number;
  status: "Vigente" | "Próximo a vencer" | "Vencido" | "Reservado";
}

export interface StockMovementLedgerItem {
  id: string;
  date: string;
  type: string;
  movementType: StockMovementType;
  qty: number;
  lot: string | null;
  serial: string | null;
  expiry: string | null;
  location: string | null;
  ref: string | null;
  user: string;
  notes: string | null;
}

export interface ArticleStockAvailability {
  id: string;
  code: string;
  name: string;
  family: string;
  category: string;
  brand: string;
  articleType: string;
  unit: string;
  manufacturer: string;
  gtin: string;
  physical: number;
  reserved: number;
  inTransit: number;
  available: number;
  min: number;
  state: "Disponible" | "Bajo stock" | "Sin stock" | "En tránsito" | "Pendiente";
  masterStatus: "Activo" | "Inactivo";
  control: "cantidad" | "lote" | "serie";
  lotCount: number;
  hasExpiringLots: boolean;
  hasExpiredLots: boolean;
  lastMovementAt: string | null;
}

export interface StockSummaryKPIs {
  total: number;
  bajo: number;
  sinstock: number;
  transito: number;
  totalPhysical: number;
  totalAvailable: number;
  totalReserved: number;
  expiringCount: number;
}

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!company) throw notFound("Empresa no encontrada", "company_not_found");
  return company.organizationId;
}

function parseDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  const normalized = String(value).trim().replace(",", ".");
  return new Prisma.Decimal(normalized);
}

function parseDateOnly(value?: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateMovementDelta(type: StockMovementType, quantity: Prisma.Decimal): number {
  const num = quantity.toNumber();
  switch (type) {
    case "RECEIPT_IN":
    case "RETURN_IN":
      return Math.abs(num);
    case "DISPATCH_OUT":
      return -Math.abs(num);
    case "ADJUSTMENT":
    case "TRANSFER":
      return num; // Can be positive or negative
    default:
      return num;
  }
}

/**
 * Registra un movimiento inmutable en el ledger de stock.
 * Si cuenta con idempotencyKey, no duplica el movimiento en reintentos.
 */
export async function recordStockMovement(db: Db, input: RecordStockMovementInput) {
  const qty = parseDecimal(input.quantity);
  const expirationDate = parseDateOnly(input.expirationDate);

  if (input.idempotencyKey) {
    return db.stockMovement.upsert({
      where: {
        companyId_idempotencyKey: {
          companyId: input.companyId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      create: {
        companyId: input.companyId,
        articleId: input.articleId,
        movementType: input.movementType,
        quantity: qty,
        lotCode: input.lotCode?.trim() || null,
        serialNumber: input.serialNumber?.trim() || null,
        expirationDate,
        location: input.location?.trim() || null,
        boxId: input.boxId?.trim() || null,
        receiptId: input.receiptId || null,
        receiptLineId: input.receiptLineId || null,
        remitoId: input.remitoId || null,
        remitoItemId: input.remitoItemId || null,
        consumoId: input.consumoId || null,
        consumoItemId: input.consumoItemId || null,
        devolucionId: input.devolucionId || null,
        devolucionItemId: input.devolucionItemId || null,
        surgeryId: input.surgeryId || null,
        idempotencyKey: input.idempotencyKey,
        notes: input.notes?.trim() || null,
        metadata: input.metadata ?? undefined,
        createdById: input.createdById || null,
      },
      update: {}, // Immutable append-only ledger
    });
  }

  return db.stockMovement.create({
    data: {
      companyId: input.companyId,
      articleId: input.articleId,
      movementType: input.movementType,
      quantity: qty,
      lotCode: input.lotCode?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      expirationDate,
      location: input.location?.trim() || null,
      boxId: input.boxId?.trim() || null,
      receiptId: input.receiptId || null,
      receiptLineId: input.receiptLineId || null,
      remitoId: input.remitoId || null,
      remitoItemId: input.remitoItemId || null,
      consumoId: input.consumoId || null,
      consumoItemId: input.consumoItemId || null,
      devolucionId: input.devolucionId || null,
      devolucionItemId: input.devolucionItemId || null,
      surgeryId: input.surgeryId || null,
      notes: input.notes?.trim() || null,
      metadata: input.metadata ?? undefined,
      createdById: input.createdById || null,
    },
  });
}

/**
 * Consulta la disponibilidad canónica de stock agrupada por artículo para la empresa.
 */
export async function getStockAvailability(
  db: Db,
  companyId: string,
  query: StockAvailabilityQuery,
) {
  const organizationId = await getCompanyOrganization(db, companyId);

  // 1. Fetch catalog articles for organization
  const articles = await db.article.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(query.family ? { family: { equals: query.family, mode: "insensitive" } } : {}),
      ...(query.brand ? { brand: { equals: query.brand, mode: "insensitive" } } : {}),
      ...(query.articleType ? { articleType: { equals: query.articleType, mode: "insensitive" } } : {}),
    },
    include: {
      identifiers: { where: { isActive: true } },
      tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
    orderBy: { description: "asc" },
  });

  // 2. Fetch all movements for this company
  const movements = await db.stockMovement.findMany({
    where: { companyId },
    select: {
      articleId: true,
      movementType: true,
      quantity: true,
      lotCode: true,
      serialNumber: true,
      expirationDate: true,
      createdAt: true,
    },
  });

  // 3. Fetch in-transit Remito items for this company
  const activeRemitos = await db.remito.findMany({
    where: {
      companyId,
      state: { in: ["Emitido", "En tránsito", "En transito", "Enviado"] },
      deliveredAt: null,
    },
    select: {
      items: {
        select: {
          itemId: true,
          sku: true,
          quantity: true,
          returnedQuantity: true,
        },
      },
    },
  });

  // 4. Fetch reserved items from Draft/Pending Remitos
  const pendingRemitos = await db.remito.findMany({
    where: {
      companyId,
      state: { in: ["Borrador", "Pendiente"] },
    },
    select: {
      items: {
        select: {
          itemId: true,
          sku: true,
          quantity: true,
        },
      },
    },
  });

  // Build movement deltas per article
  const articlePhysicalMap = new Map<string, number>();
  const articleLotsMap = new Map<string, Set<string>>();
  const articleExpiringMap = new Map<string, boolean>();
  const articleExpiredMap = new Map<string, boolean>();
  const articleLastMovementMap = new Map<string, Date>();

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  for (const m of movements) {
    const delta = calculateMovementDelta(m.movementType, m.quantity);
    const current = articlePhysicalMap.get(m.articleId) || 0;
    articlePhysicalMap.set(m.articleId, current + delta);

    if (m.lotCode || m.serialNumber) {
      const set = articleLotsMap.get(m.articleId) || new Set<string>();
      set.add(m.lotCode || m.serialNumber || "");
      articleLotsMap.set(m.articleId, set);
    }

    if (m.expirationDate) {
      const exp = new Date(m.expirationDate);
      if (exp < now) {
        articleExpiredMap.set(m.articleId, true);
      } else if (exp <= ninetyDaysFromNow) {
        articleExpiringMap.set(m.articleId, true);
      }
    }

    const last = articleLastMovementMap.get(m.articleId);
    if (!last || m.createdAt > last) {
      articleLastMovementMap.set(m.articleId, m.createdAt);
    }
  }

  // Build in-transit map per article (by articleId or sku)
  const inTransitMap = new Map<string, number>();
  for (const remito of activeRemitos) {
    for (const item of remito.items) {
      const key = item.itemId || item.sku || "";
      if (!key) continue;
      const netTransit = Math.max(0, item.quantity.toNumber() - item.returnedQuantity.toNumber());
      inTransitMap.set(key, (inTransitMap.get(key) || 0) + netTransit);
    }
  }

  // Build reserved map per article
  const reservedMap = new Map<string, number>();
  for (const remito of pendingRemitos) {
    for (const item of remito.items) {
      const key = item.itemId || item.sku || "";
      if (!key) continue;
      reservedMap.set(key, (reservedMap.get(key) || 0) + item.quantity.toNumber());
    }
  }

  // 5. Aggregate projection for each article
  const allItems: ArticleStockAvailability[] = articles.map((article) => {
    const physical = articlePhysicalMap.get(article.id) || 0;
    const inTransit = inTransitMap.get(article.id) || inTransitMap.get(article.sku) || 0;
    const reserved = reservedMap.get(article.id) || reservedMap.get(article.sku) || 0;
    const available = Math.max(0, physical - inTransit - reserved);
    const minStock = 5; // Standard minimum threshold

    let state: ArticleStockAvailability["state"] = "Disponible";
    if (physical === 0) {
      state = inTransit > 0 ? "En tránsito" : "Sin stock";
    } else if (available <= minStock && available > 0) {
      state = "Bajo stock";
    } else if (available === 0 && physical > 0) {
      state = "Bajo stock";
    }

    const tracePolicy = article.tracePolicies[0]?.policy;
    let control: ArticleStockAvailability["control"] = "cantidad";
    if (tracePolicy === "SERIAL" || tracePolicy === "SERIAL_EXPIRY") control = "serie";
    else if (tracePolicy === "LOT" || tracePolicy === "LOT_EXPIRY" || tracePolicy === "LOT_SERIAL_EXPIRY") control = "lote";

    const gtin = article.identifiers.find((i) => i.type === "GTIN_EAN")?.value || "";
    const lotSet = articleLotsMap.get(article.id);
    const lastMovementAt = articleLastMovementMap.get(article.id)?.toISOString() || null;

    return {
      id: article.id,
      code: article.sku,
      name: article.description,
      family: article.family || "Insumos",
      category: article.family || "General",
      brand: article.brand || "—",
      articleType: article.articleType || "Insumo",
      unit: article.unit || "u",
      manufacturer: article.manufacturer || "—",
      gtin,
      physical,
      reserved,
      inTransit,
      available,
      min: minStock,
      state,
      masterStatus: article.isActive ? "Activo" : "Inactivo",
      control,
      lotCount: lotSet ? lotSet.size : 0,
      hasExpiringLots: Boolean(articleExpiringMap.get(article.id)),
      hasExpiredLots: Boolean(articleExpiredMap.get(article.id)),
      lastMovementAt,
    };
  });

  // 6. Compute KPIs across all articles
  const summary: StockSummaryKPIs = {
    total: allItems.length,
    bajo: allItems.filter((i) => i.available > 0 && i.available <= i.min).length,
    sinstock: allItems.filter((i) => i.physical === 0).length,
    transito: allItems.filter((i) => i.inTransit > 0).length,
    totalPhysical: allItems.reduce((acc, i) => acc + i.physical, 0),
    totalAvailable: allItems.reduce((acc, i) => acc + i.available, 0),
    totalReserved: allItems.reduce((acc, i) => acc + i.reserved, 0),
    expiringCount: allItems.filter((i) => i.hasExpiringLots || i.hasExpiredLots).length,
  };

  // 7. Apply search and filters
  let filtered = allItems;
  if (query.search) {
    const q = query.search.trim().toLowerCase();
    filtered = filtered.filter((i) => {
      const haystack = [i.code, i.name, i.brand, i.manufacturer, i.family, i.articleType, i.gtin]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (query.quickFilter === "bajo") {
    filtered = filtered.filter((i) => i.available > 0 && i.available <= i.min);
  } else if (query.quickFilter === "sinstock") {
    filtered = filtered.filter((i) => i.physical === 0);
  } else if (query.quickFilter === "transito") {
    filtered = filtered.filter((i) => i.inTransit > 0);
  }

  // 8. Sorting
  const sortDir = query.sortDir === "desc" ? -1 : 1;
  const sortKey = query.sortKey || "articulo";

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "codigo":
      case "code":
        cmp = a.code.localeCompare(b.code);
        break;
      case "articulo":
      case "name":
        cmp = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
        break;
      case "disponible":
      case "available":
        cmp = a.available - b.available;
        break;
      case "fisico":
      case "physical":
        cmp = a.physical - b.physical;
        break;
      case "reservado":
      case "reserved":
        cmp = a.reserved - b.reserved;
        break;
      case "transito":
      case "inTransit":
        cmp = a.inTransit - b.inTransit;
        break;
      default:
        cmp = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    }
    return cmp * sortDir;
  });

  // 9. Pagination
  const page = query.page || 1;
  const limit = query.limit || 50;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return {
    data: paginated,
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Consulta el detalle completo de stock, lotes/series y ledger de movimientos para un artículo.
 */
export async function getArticleStockDetail(db: Db, companyId: string, articleId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);

  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
    },
    include: {
      identifiers: { where: { isActive: true } },
      tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
      supplierMappings: true,
    },
  });

  if (!article) throw notFound("Artículo no encontrado", "article_not_found");

  // Fetch all movements for this article
  const movements = await db.stockMovement.findMany({
    where: {
      companyId,
      articleId,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      receipt: { select: { id: true, documentReference: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Group physical balances by lot/serial/location
  const lotGroups = new Map<
    string,
    {
      lot: string | null;
      serial: string | null;
      expiry: Date | null;
      location: string | null;
      physical: number;
    }
  >();

  let totalPhysical = 0;

  for (const m of movements) {
    const delta = calculateMovementDelta(m.movementType, m.quantity);
    totalPhysical += delta;

    const groupKey = `${m.lotCode || ""}||${m.serialNumber || ""}||${m.expirationDate ? m.expirationDate.toISOString().slice(0, 10) : ""}||${m.location || ""}`;
    const existing = lotGroups.get(groupKey) || {
      lot: m.lotCode || null,
      serial: m.serialNumber || null,
      expiry: m.expirationDate ? new Date(m.expirationDate) : null,
      location: m.location || "Depósito Central",
      physical: 0,
    };
    existing.physical += delta;
    lotGroups.set(groupKey, existing);
  }

  // Map active lot existences
  const lots: LotAvailability[] = [];
  let lotIdx = 1;
  for (const group of lotGroups.values()) {
    if (group.physical <= 0 && !group.lot && !group.serial) continue;

    let status: LotAvailability["status"] = "Vigente";
    if (group.expiry) {
      if (group.expiry < now) status = "Vencido";
      else if (group.expiry <= ninetyDaysFromNow) status = "Próximo a vencer";
    }

    lots.push({
      id: `lot-${lotIdx++}`,
      deposit: "Depósito Central",
      location: group.location,
      lot: group.lot,
      serial: group.serial,
      expiry: group.expiry ? group.expiry.toISOString().slice(0, 10) : null,
      physical: Math.max(0, group.physical),
      available: Math.max(0, group.physical),
      reserved: 0,
      status,
    });
  }

  // Format movements for ledger view
  const ledgerMovements: StockMovementLedgerItem[] = movements.map((m) => {
    let typeLabel = "Ajuste";
    let refLabel = m.notes || "—";

    switch (m.movementType) {
      case "RECEIPT_IN":
        typeLabel = "Recepción";
        refLabel = m.receipt?.documentReference ? `Remito ${m.receipt.documentReference}` : `Recepción ${m.receiptId || ""}`;
        break;
      case "DISPATCH_OUT":
        typeLabel = "Salida / Remito";
        refLabel = m.remitoId ? `Remito #${m.remitoId}` : "Salida";
        break;
      case "RETURN_IN":
        typeLabel = "Devolución";
        refLabel = m.devolucionId ? `Devolución #${m.devolucionId}` : "Devolución";
        break;
      case "TRANSFER":
        typeLabel = "Traspaso";
        break;
      case "ADJUSTMENT":
        typeLabel = "Ajuste de inventario";
        break;
    }

    const delta = calculateMovementDelta(m.movementType, m.quantity);
    const userName = m.createdBy
      ? `${m.createdBy.firstName} ${m.createdBy.lastName}`.trim() || m.createdBy.email
      : m.createdById || "Sistema";

    return {
      id: m.id,
      date: m.createdAt.toISOString(),
      type: typeLabel,
      movementType: m.movementType,
      qty: delta,
      lot: m.lotCode,
      serial: m.serialNumber,
      expiry: m.expirationDate ? m.expirationDate.toISOString().slice(0, 10) : null,
      location: m.location,
      ref: refLabel,
      user: userName,
      notes: m.notes,
    };
  });

  const available = Math.max(0, totalPhysical);
  let state = "Disponible";
  if (totalPhysical === 0) state = "Sin stock";
  else if (available <= 5) state = "Bajo stock";

  return {
    article: {
      id: article.id,
      code: article.sku,
      name: article.description,
      family: article.family,
      brand: article.brand,
      articleType: article.articleType,
      unit: article.unit,
      manufacturer: article.manufacturer,
      vatTreatment: article.vatTreatment,
      vatRate: article.vatRate.toNumber(),
      identifiers: article.identifiers,
      suppliers: article.supplierMappings,
    },
    summary: {
      physical: totalPhysical,
      reserved: 0,
      inTransit: 0,
      available,
      minStock: 5,
      state,
    },
    lots,
    movements: ledgerMovements,
  };
}

/**
 * Crea un ajuste manual auditado en el ledger de stock.
 */
export async function createStockAdjustment(
  db: Db,
  companyId: string,
  input: StockAdjustmentCreateInput,
  actorUserId?: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);

  const article = await db.article.findFirst({
    where: { id: input.articleId, organizationId },
    select: { id: true, sku: true, description: true },
  });

  if (!article) throw notFound("Artículo no encontrado", "article_not_found");

  const qty = parseDecimal(input.quantity);
  if (qty.isZero()) throw badRequest("La cantidad del ajuste no puede ser 0", "invalid_adjustment_quantity");

  const movement = await recordStockMovement(db, {
    companyId,
    articleId: article.id,
    movementType: "ADJUSTMENT",
    quantity: qty,
    lotCode: input.lotCode,
    serialNumber: input.serialNumber,
    expirationDate: input.expirationDate,
    location: input.location,
    boxId: input.boxId,
    notes: input.reason,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
    createdById: actorUserId,
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId || "system",
    entityType: "StockMovement",
    entityId: movement.id,
    action: "STOCK_ADJUSTMENT_CREATED",
    module: "stock",
    detail: `Ajuste de inventario para artículo ${article.sku}: ${qty.toString()}`,
    metadata: {
      articleId: article.id,
      sku: article.sku,
      quantity: qty.toString(),
      reason: input.reason,
      lotCode: input.lotCode,
    },
  });

  try {
    const { emitCrossDomainNotification } = await import("./internal-notifications.service");
    await emitCrossDomainNotification(db, {
      companyId,
      actorUserId: actorUserId || "system",
      type: "stock_difference" as any,
      domain: "STOCK",
      severity: "WARNING",
      title: `Ajuste de stock: ${article.sku}`,
      body: `Ajuste manual ${qty.gt(0) ? "+" : ""}${qty.toString()} (${input.reason}).`,
      sourceEntityId: movement.id,
      linkHref: `/stock`,
      metadata: { articleId: article.id, reason: input.reason, qty: qty.toString() },
    });
  } catch (e) {
    console.warn("[notification] Failed to emit stock adjustment notification", e);
  }

  return movement;
}
