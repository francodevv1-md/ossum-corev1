import { Prisma, type PrismaClient } from "@prisma/client";
import { requireCompanyId } from "../tenant";
import { calculateMovementDelta } from "./stock-ledger.service";

export interface ComprasForecastItem {
  articleId: string;
  articleCode: string;
  articleName: string;
  category: string;
  currentStock: number;
  minStock: number;
  expiringIn60Days: number;
  openNeedsQty: number;
  incomingOcQty: number;
  upcomingSurgeryDemand: number;
  suggestedOrderQty: number;
  suggestedSupplierId: string | null;
  suggestedSupplierName: string | null;
  urgency: "critica" | "alta" | "media" | "normal";
  rationale: string[];
}

export interface ComprasForecastSummary {
  totalArticlesEvaluated: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  totalSuggestedOrderQty: number;
  items: ComprasForecastItem[];
}

export async function getComprasForecast(input: {
  prisma: PrismaClient;
  companyId: string;
}): Promise<ComprasForecastSummary> {
  const companyId = requireCompanyId(input.companyId);

  const company = await input.prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  });

  const organizationId = company?.organizationId || "";

  // 1. Fetch active articles for the organization
  const articles = await input.prisma.article.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    select: {
      id: true,
      sku: true,
      description: true,
      family: true,
      brand: true,
      articleType: true,
    },
  });

  // 2. Fetch stock ledger movements to calculate current stock and expiring lots
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const movements = await input.prisma.stockMovement.findMany({
    where: { companyId },
    select: {
      articleId: true,
      movementType: true,
      quantity: true,
      expirationDate: true,
    },
  });

  // Aggregate current physical stock and expiring stock per article
  const currentStockMap = new Map<string, number>();
  const expiringStockMap = new Map<string, number>();

  for (const m of movements) {
    const delta = calculateMovementDelta(m.movementType, m.quantity);
    const prev = currentStockMap.get(m.articleId) || 0;
    currentStockMap.set(m.articleId, prev + delta);

    if (
      m.expirationDate &&
      m.expirationDate > now &&
      m.expirationDate <= sixtyDaysFromNow &&
      delta > 0
    ) {
      const prevExp = expiringStockMap.get(m.articleId) || 0;
      expiringStockMap.set(m.articleId, prevExp + delta);
    }
  }

  // 3. Fetch open purchase needs (Pendiente / En_OC)
  const openNeeds = await input.prisma.necesidadCompra.findMany({
    where: {
      companyId,
      state: { in: ["Pendiente", "En_OC"] },
      articleId: { not: null },
    },
    select: {
      articleId: true,
      quantity: true,
    },
  });

  const openNeedsMap = new Map<string, number>();
  for (const n of openNeeds) {
    if (n.articleId) {
      const prev = openNeedsMap.get(n.articleId) || 0;
      openNeedsMap.set(n.articleId, prev + Number(n.quantity));
    }
  }

  // 4. Fetch incoming purchase orders (Emitida / Enviada / Parcialmente_recibida)
  const openPOs = await input.prisma.ordenCompra.findMany({
    where: {
      companyId,
      state: { in: ["Emitida", "Enviada", "Parcialmente_recibida"] },
    },
    include: {
      items: {
        select: {
          stockItemId: true,
          quantity: true,
          received: true,
        },
      },
    },
  });

  const incomingOcMap = new Map<string, number>();
  for (const po of openPOs) {
    for (const item of po.items) {
      const pending = Math.max(0, Number(item.quantity) - Number(item.received));
      if (pending > 0) {
        const prev = incomingOcMap.get(item.stockItemId) || 0;
        incomingOcMap.set(item.stockItemId, prev + pending);
      }
    }
  }

  // 5. Build deterministic items
  const items: ComprasForecastItem[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let totalSuggested = 0;

  for (const art of articles) {
    const stock = Math.max(0, currentStockMap.get(art.id) || 0);
    const minStock = 5; // Default safety threshold per article
    const expiring = expiringStockMap.get(art.id) || 0;
    const needsQty = openNeedsMap.get(art.id) || 0;
    const incomingOc = incomingOcMap.get(art.id) || 0;
    const surgeryDemand = 0; // Deterministic baseline demand

    const totalRequired = minStock + needsQty + surgeryDemand;
    const totalCovered = stock + incomingOc;
    const deficit = Math.max(0, totalRequired - totalCovered);

    const rationale: string[] = [];

    if (stock === 0) {
      rationale.push("Stock físico en cero");
    } else if (stock < minStock) {
      rationale.push(`Stock actual (${stock}) por debajo del mínimo de seguridad (${minStock})`);
    }

    if (expiring > 0) {
      rationale.push(`${expiring} unidades vencen en menos de 60 días`);
    }

    if (needsQty > 0) {
      rationale.push(`${needsQty} unidades solicitadas en necesidades de compra abiertas`);
    }

    if (incomingOc > 0) {
      rationale.push(`${incomingOc} unidades ya en tránsito en Órdenes de Compra activas`);
    }

    let urgency: "critica" | "alta" | "media" | "normal" = "normal";

    if (stock === 0 && (needsQty > 0 || minStock > 0)) {
      urgency = "critica";
      criticalCount++;
    } else if (stock < minStock && incomingOc === 0) {
      urgency = "alta";
      highCount++;
    } else if (deficit > 0 || expiring > 0) {
      urgency = "media";
      mediumCount++;
    }

    const suggestedOrderQty = deficit > 0 ? deficit : expiring > stock / 2 ? expiring : 0;
    totalSuggested += suggestedOrderQty;

    // Include all items with suggested order qty or non-normal urgency
    if (suggestedOrderQty > 0 || urgency !== "normal") {
      items.push({
        articleId: art.id,
        articleCode: art.sku,
        articleName: art.description,
        category: art.family || art.articleType || "General",
        currentStock: stock,
        minStock,
        expiringIn60Days: expiring,
        openNeedsQty: needsQty,
        incomingOcQty: incomingOc,
        upcomingSurgeryDemand: surgeryDemand,
        suggestedOrderQty,
        suggestedSupplierId: null,
        suggestedSupplierName: null,
        urgency,
        rationale,
      });
    }
  }

  // Sort by urgency priority (critica -> alta -> media -> normal)
  const urgencyWeight = { critica: 3, alta: 2, media: 1, normal: 0 };
  items.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency] || b.suggestedOrderQty - a.suggestedOrderQty);

  return {
    totalArticlesEvaluated: articles.length,
    criticalCount,
    highCount,
    mediumCount,
    totalSuggestedOrderQty: totalSuggested,
    items,
  };
}
