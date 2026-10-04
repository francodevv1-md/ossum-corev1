import { Prisma, type PrismaClient } from "@prisma/client";
import { badRequest, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { parseBarcode, type ParsedBarcode, type ReceiptCreateInput } from "../validators/receipt";
import { normalizeArticleIdentifier } from "../validators/article";
import { recordStockMovement } from "./stock-ledger.service";

type Db = PrismaClient | Prisma.TransactionClient;

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  });
  if (!company) throw notFound("Company not found", "company_not_found");
  return company.organizationId;
}

export interface FormattedUnitScan {
  id: string;
  rawValue: string;
  resolutionStatus: string;
  articleId: string | null;
  lotCode: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  quantity: string;
}

export interface FormattedReceiptLine {
  id: string;
  lineNumber: number;
  articleId: string | null;
  requestedQuantity: string;
  expectedQuantity: string | null;
  receivedQuantity: string;
  expectedCode: string | null;
  expectedDescription: string | null;
  lotCode: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  receivedLotCode: string | null;
  receivedSerialNumber: string | null;
  receivedExpirationDate: string | null;
  resolutionStatus: string;
  scans: FormattedUnitScan[];
}

export interface FormattedReceipt {
  id: string;
  companyId: string;
  status: string;
  documentReference: string | null;
  supplierId: string | null;
  idempotencyKey: string | null;
  notes: string | null;
  confirmedAt: string | null;
  confirmedById: string | null;
  createdAt: string;
  updatedAt: string;
  lines: FormattedReceiptLine[];
}

export interface ScanCandidate {
  id: string;
  sku: string;
  description: string;
}

export interface ScanResultResponse {
  event: FormattedUnitScan;
  status: "RESOLVED" | "PENDING";
  candidates: ScanCandidate[];
  line?: FormattedReceiptLine;
}

function formatUnitScan(scan: {
  id: string;
  rawValue: string;
  resolutionStatus: string;
  articleId: string | null;
  lotCode: string | null;
  serialNumber: string | null;
  expirationDate: Date | null;
  quantity: Prisma.Decimal | number;
}): FormattedUnitScan {
  return {
    id: scan.id,
    rawValue: scan.rawValue,
    resolutionStatus: scan.resolutionStatus,
    articleId: scan.articleId,
    lotCode: scan.lotCode,
    serialNumber: scan.serialNumber,
    expirationDate: scan.expirationDate ? scan.expirationDate.toISOString() : null,
    quantity: String(scan.quantity),
  };
}

function formatReceiptLine(line: {
  id: string;
  lineNumber: number;
  articleId: string | null;
  expectedQuantity: Prisma.Decimal | number | null;
  receivedQuantity: Prisma.Decimal | number;
  expectedCode: string | null;
  expectedDescription: string | null;
  lotCode: string | null;
  serialNumber: string | null;
  expirationDate: Date | null;
  resolutionStatus: string;
  scans?: Array<{
    id: string;
    rawValue: string;
    resolutionStatus: string;
    articleId: string | null;
    lotCode: string | null;
    serialNumber: string | null;
    expirationDate: Date | null;
    quantity: Prisma.Decimal | number;
  }>;
}): FormattedReceiptLine {
  const scans = (line.scans ?? []).map(formatUnitScan);
  const expQty = line.expectedQuantity != null ? String(line.expectedQuantity) : null;
  const lastScanWithLot = [...scans].reverse().find((s) => s.lotCode);
  const lastScanWithSerial = [...scans].reverse().find((s) => s.serialNumber);
  const lastScanWithExp = [...scans].reverse().find((s) => s.expirationDate);

  return {
    id: line.id,
    lineNumber: line.lineNumber,
    articleId: line.articleId,
    requestedQuantity: expQty ?? "0",
    expectedQuantity: expQty,
    receivedQuantity: String(line.receivedQuantity),
    expectedCode: line.expectedCode,
    expectedDescription: line.expectedDescription,
    lotCode: line.lotCode,
    serialNumber: line.serialNumber,
    expirationDate: line.expirationDate ? line.expirationDate.toISOString() : null,
    receivedLotCode: lastScanWithLot?.lotCode ?? line.lotCode,
    receivedSerialNumber: lastScanWithSerial?.serialNumber ?? line.serialNumber,
    receivedExpirationDate: lastScanWithExp?.expirationDate ?? (line.expirationDate ? line.expirationDate.toISOString() : null),
    resolutionStatus: line.resolutionStatus,
    scans,
  };
}

function formatReceipt(receipt: {
  id: string;
  companyId: string;
  status: string;
  documentReference: string | null;
  supplierId: string | null;
  idempotencyKey: string | null;
  notes: string | null;
  confirmedAt: Date | null;
  confirmedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    lineNumber: number;
    articleId: string | null;
    expectedQuantity: Prisma.Decimal | number | null;
    receivedQuantity: Prisma.Decimal | number;
    expectedCode: string | null;
    expectedDescription: string | null;
    lotCode: string | null;
    serialNumber: string | null;
    expirationDate: Date | null;
    resolutionStatus: string;
    scans?: Array<{
      id: string;
      rawValue: string;
      resolutionStatus: string;
      articleId: string | null;
      lotCode: string | null;
      serialNumber: string | null;
      expirationDate: Date | null;
      quantity: Prisma.Decimal | number;
    }>;
  }>;
}): FormattedReceipt {
  return {
    id: receipt.id,
    companyId: receipt.companyId,
    status: receipt.status,
    documentReference: receipt.documentReference,
    supplierId: receipt.supplierId,
    idempotencyKey: receipt.idempotencyKey,
    notes: receipt.notes,
    confirmedAt: receipt.confirmedAt ? receipt.confirmedAt.toISOString() : null,
    confirmedById: receipt.confirmedById,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
    lines: receipt.lines.map(formatReceiptLine),
  };
}

export async function createReceiptDraft(
  db: Db,
  companyId: string,
  input: ReceiptCreateInput,
  actorUserId: string
): Promise<FormattedReceipt> {
  const organizationId = await getCompanyOrganization(db, companyId);

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await db.receipt.findFirst({
      where: { companyId, idempotencyKey: input.idempotencyKey },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
          include: { scans: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (existing) {
      return formatReceipt(existing);
    }
  }

  // Check supplier if provided
  if (input.supplierId) {
    const supplierLink = await db.contactCompanyLink.findFirst({
      where: { companyId, contactId: input.supplierId, isActive: true },
    });
    if (!supplierLink) {
      throw badRequest("Supplier is not linked to the company", "supplier_not_found");
    }
  }

  // Pre-resolve articles for expected lines if codes are provided
  const linesToCreate: Prisma.ReceiptLineCreateWithoutReceiptInput[] = [];
  let lineNumber = 1;

  for (const line of input.expectedLines) {
    let resolvedArticleId: string | null = null;
    let resolvedDescription = line.description?.trim() || null;

    if (line.code?.trim()) {
      const code = line.code.trim();
      const normalized = normalizeArticleIdentifier(code);

      // Search by SKU or Identifiers in the same organization and eligible for company
      const article = await db.article.findFirst({
        where: {
          organizationId,
          isActive: true,
          stockEligibilities: { some: { companyId } },
          OR: [
            { sku: { equals: code, mode: "insensitive" } },
            { identifiers: { some: { normalizedValue: normalized, isActive: true } } },
          ],
        },
        select: { id: true, description: true },
      });

      if (article) {
        resolvedArticleId = article.id;
        if (!resolvedDescription) {
          resolvedDescription = article.description;
        }
      }
    }

    const expDate = line.expirationDate?.trim()
      ? new Date(line.expirationDate.trim())
      : null;

    linesToCreate.push({
      company: { connect: { id: companyId } },
      lineNumber: lineNumber++,
      article: resolvedArticleId ? { connect: { id: resolvedArticleId } } : undefined,
      expectedCode: line.code?.trim() || null,
      expectedDescription: resolvedDescription,
      expectedQuantity: new Prisma.Decimal(line.expectedQuantity),
      receivedQuantity: new Prisma.Decimal(0),
      lotCode: line.lotCode?.trim() || null,
      serialNumber: line.serialNumber?.trim() || null,
      expirationDate: expDate && !isNaN(expDate.getTime()) ? expDate : null,
      resolutionStatus: "RESOLVED" as const,
    });
  }

  const receipt = await db.receipt.create({
    data: {
      companyId,
      documentReference: input.documentReference?.trim() || null,
      supplierId: input.supplierId?.trim() || null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      notes: input.notes?.trim() || null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      status: "PREPARED",
      lines: {
        create: linesToCreate,
      },
    },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: { scans: true },
      },
    },
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "Receipt",
    entityId: receipt.id,
    action: "created",
    module: "stock",
    newValue: {
      documentReference: receipt.documentReference,
      expectedLinesCount: receipt.lines.length,
    },
  });

  return formatReceipt(receipt);
}

export async function getReceipt(
  db: Db,
  companyId: string,
  receiptId: string
): Promise<FormattedReceipt> {
  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, companyId },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: {
          scans: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!receipt) {
    throw notFound("Receipt not found", "receipt_not_found");
  }

  return formatReceipt(receipt);
}

export async function listReceipts(
  db: Db,
  companyId: string,
  options?: { take?: number; skip?: number }
): Promise<FormattedReceipt[]> {
  const receipts = await db.receipt.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 50,
    skip: options?.skip ?? 0,
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: { scans: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  return receipts.map(formatReceipt);
}

async function findArticleCandidates(
  db: Db,
  organizationId: string,
  companyId: string,
  parsed: ParsedBarcode,
  supplierId?: string | null
): Promise<ScanCandidate[]> {
  const candidatesMap = new Map<string, ScanCandidate>();

  const searchCodes = [
    parsed.gtin,
    parsed.articleCode,
    parsed.rawCode,
  ].filter((c): c is string => Boolean(c && c.trim()));

  for (const code of searchCodes) {
    const trimmed = code.trim();
    const normalized = normalizeArticleIdentifier(trimmed);

    // 1. Check ArticleIdentifier
    const byIdentifier = await db.articleIdentifier.findMany({
      where: {
        organizationId,
        isActive: true,
        normalizedValue: normalized,
        article: { stockEligibilities: { some: { companyId } } },
      },
      include: { article: true },
      take: 10,
    });

    for (const match of byIdentifier) {
      candidatesMap.set(match.article.id, {
        id: match.article.id,
        sku: match.article.sku,
        description: match.article.description,
      });
    }

    // 2. Check Article SKU directly
    const bySku = await db.article.findMany({
      where: {
        organizationId,
        isActive: true,
        stockEligibilities: { some: { companyId } },
        sku: { equals: trimmed, mode: "insensitive" },
      },
      take: 10,
    });

    for (const art of bySku) {
      candidatesMap.set(art.id, {
        id: art.id,
        sku: art.sku,
        description: art.description,
      });
    }

    // 3. Check Supplier Mapping if supplierId is present
    if (supplierId) {
      const bySupplier = await db.articleSupplierMapping.findMany({
        where: {
          organizationId,
          supplierId,
          normalizedCode: normalized,
          isActive: true,
          article: { stockEligibilities: { some: { companyId } } },
        },
        include: { article: true },
        take: 10,
      });

      for (const mapItem of bySupplier) {
        candidatesMap.set(mapItem.article.id, {
          id: mapItem.article.id,
          sku: mapItem.article.sku,
          description: mapItem.article.description,
        });
      }
    }
  }

  // If no direct exact match, perform a fuzzy description/SKU search
  if (candidatesMap.size === 0 && (parsed.articleCode || parsed.rawCode)) {
    const term = (parsed.articleCode || parsed.rawCode).slice(0, 30);
    const fuzzy = await db.article.findMany({
      where: {
        organizationId,
        isActive: true,
        stockEligibilities: { some: { companyId } },
        OR: [
          { sku: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    for (const art of fuzzy) {
      candidatesMap.set(art.id, {
        id: art.id,
        sku: art.sku,
        description: art.description,
      });
    }
  }

  return Array.from(candidatesMap.values());
}

export async function scanReceiptUnit(
  db: Db,
  companyId: string,
  receiptId: string,
  rawValue: string,
  actorUserId: string
): Promise<ScanResultResponse> {
  const organizationId = await getCompanyOrganization(db, companyId);

  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, companyId },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: { scans: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!receipt) {
    throw notFound("Receipt not found", "receipt_not_found");
  }

  if (receipt.status === "CONFIRMED" || receipt.status === "CANCELLED") {
    throw badRequest("Cannot scan on a closed receipt", "receipt_already_closed");
  }

  const parsed = parseBarcode(rawValue);
  const expDate = parsed.expirationDate ? new Date(parsed.expirationDate) : null;
  const validExpDate = expDate && !isNaN(expDate.getTime()) ? expDate : null;

  const candidates = await findArticleCandidates(
    db,
    organizationId,
    companyId,
    parsed,
    receipt.supplierId
  );

  // Exact single match found
  if (candidates.length === 1) {
    const matchedArticle = candidates[0];

    // Find or create matching line in receipt
    const existingLine = receipt.lines.find(
      (l) =>
        l.articleId === matchedArticle.id ||
        (l.expectedCode &&
          (normalizeArticleIdentifier(l.expectedCode) === normalizeArticleIdentifier(matchedArticle.sku) ||
            (parsed.gtin && normalizeArticleIdentifier(l.expectedCode) === normalizeArticleIdentifier(parsed.gtin))))
    );

    let targetLineId: string;

    if (existingLine) {
      targetLineId = existingLine.id;
      await db.receiptLine.update({
        where: { id: existingLine.id },
        data: {
          articleId: matchedArticle.id,
          receivedQuantity: { increment: 1 },
          lotCode: parsed.lotCode || existingLine.lotCode,
          serialNumber: parsed.serialNumber || existingLine.serialNumber,
          expirationDate: validExpDate || existingLine.expirationDate,
        },
      });
    } else {
      const maxLineNumber = receipt.lines.reduce(
        (max, l) => Math.max(max, l.lineNumber),
        0
      );
      const newLine = await db.receiptLine.create({
        data: {
          companyId,
          receiptId: receipt.id,
          lineNumber: maxLineNumber + 1,
          articleId: matchedArticle.id,
          expectedCode: matchedArticle.sku,
          expectedDescription: matchedArticle.description,
          expectedQuantity: null,
          receivedQuantity: new Prisma.Decimal(1),
          lotCode: parsed.lotCode || null,
          serialNumber: parsed.serialNumber || null,
          expirationDate: validExpDate,
          resolutionStatus: "RESOLVED",
        },
      });
      targetLineId = newLine.id;
    }

    const scan = await db.receiptScan.create({
      data: {
        companyId,
        receiptId: receipt.id,
        receiptLineId: targetLineId,
        rawValue: parsed.rawCode,
        resolutionStatus: "RESOLVED",
        articleId: matchedArticle.id,
        lotCode: parsed.lotCode || null,
        serialNumber: parsed.serialNumber || null,
        expirationDate: validExpDate,
        quantity: new Prisma.Decimal(1),
      },
    });

    if (receipt.status === "PREPARED") {
      await db.receipt.update({
        where: { id: receipt.id },
        data: { status: "IN_CONTROL" },
      });
    }

    const updatedLine = await db.receiptLine.findUniqueOrThrow({
      where: { id: targetLineId },
      include: { scans: { orderBy: { createdAt: "asc" } } },
    });

    await createAuditEvent({
      prisma: db,
      companyId,
      userId: actorUserId,
      entityType: "ReceiptScan",
      entityId: scan.id,
      action: "scanned_resolved",
      module: "stock",
      newValue: {
        rawValue: scan.rawValue,
        articleId: matchedArticle.id,
        lotCode: scan.lotCode,
        serialNumber: scan.serialNumber,
      },
    });

    return {
      event: formatUnitScan(scan),
      status: "RESOLVED",
      candidates: [matchedArticle],
      line: formatReceiptLine(updatedLine),
    };
  }

  // Unresolved or ambiguous match (PENDING)
  const scan = await db.receiptScan.create({
    data: {
      companyId,
      receiptId: receipt.id,
      receiptLineId: null,
      rawValue: parsed.rawCode,
      resolutionStatus: "PENDING",
      articleId: null,
      lotCode: parsed.lotCode || null,
      serialNumber: parsed.serialNumber || null,
      expirationDate: validExpDate,
      quantity: new Prisma.Decimal(1),
    },
  });

  if (receipt.status === "PREPARED") {
    await db.receipt.update({
      where: { id: receipt.id },
      data: { status: "IN_CONTROL" },
    });
  }

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "ReceiptScan",
    entityId: scan.id,
    action: "scanned_pending",
    module: "stock",
    newValue: {
      rawValue: scan.rawValue,
      lotCode: scan.lotCode,
      serialNumber: scan.serialNumber,
    },
  });

  return {
    event: formatUnitScan(scan),
    status: "PENDING",
    candidates,
    line: undefined,
  };
}

export async function resolvePendingScan(
  db: Db,
  companyId: string,
  receiptId: string,
  scanId: string,
  articleId: string,
  actorUserId: string
): Promise<{ event: FormattedUnitScan; line: FormattedReceiptLine }> {
  const organizationId = await getCompanyOrganization(db, companyId);

  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, companyId },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: { scans: true },
      },
    },
  });

  if (!receipt) {
    throw notFound("Receipt not found", "receipt_not_found");
  }

  if (receipt.status === "CONFIRMED" || receipt.status === "CANCELLED") {
    throw badRequest("Cannot resolve scans on a closed receipt", "receipt_already_closed");
  }

  const scan = await db.receiptScan.findFirst({
    where: { id: scanId, receiptId, companyId, resolutionStatus: "PENDING" },
  });

  if (!scan) {
    throw notFound("Pending scan not found", "pending_scan_not_found");
  }

  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
      isActive: true,
      stockEligibilities: { some: { companyId } },
    },
  });

  if (!article) {
    throw notFound("Article not found or not eligible for company", "article_not_found");
  }

  // Find or create matching line
  const existingLine = receipt.lines.find(
    (l) =>
      l.articleId === article.id ||
      (l.expectedCode &&
        normalizeArticleIdentifier(l.expectedCode) === normalizeArticleIdentifier(article.sku))
  );

  let targetLineId: string;

  if (existingLine) {
    targetLineId = existingLine.id;
    await db.receiptLine.update({
      where: { id: existingLine.id },
      data: {
        articleId: article.id,
        receivedQuantity: { increment: scan.quantity },
        lotCode: scan.lotCode || existingLine.lotCode,
        serialNumber: scan.serialNumber || existingLine.serialNumber,
        expirationDate: scan.expirationDate || existingLine.expirationDate,
      },
    });
  } else {
    const maxLineNumber = receipt.lines.reduce(
      (max, l) => Math.max(max, l.lineNumber),
      0
    );
    const newLine = await db.receiptLine.create({
      data: {
        companyId,
        receiptId: receipt.id,
        lineNumber: maxLineNumber + 1,
        articleId: article.id,
        expectedCode: article.sku,
        expectedDescription: article.description,
        expectedQuantity: null,
        receivedQuantity: scan.quantity,
        lotCode: scan.lotCode || null,
        serialNumber: scan.serialNumber || null,
        expirationDate: scan.expirationDate,
        resolutionStatus: "RESOLVED",
      },
    });
    targetLineId = newLine.id;
  }

  const updatedScan = await db.receiptScan.update({
    where: { id: scan.id },
    data: {
      resolutionStatus: "RESOLVED",
      articleId: article.id,
      receiptLineId: targetLineId,
    },
  });

  const updatedLine = await db.receiptLine.findUniqueOrThrow({
    where: { id: targetLineId },
    include: { scans: { orderBy: { createdAt: "asc" } } },
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "ReceiptScan",
    entityId: scan.id,
    action: "resolved",
    module: "stock",
    newValue: {
      articleId: article.id,
      receiptLineId: targetLineId,
    },
  });

  return {
    event: formatUnitScan(updatedScan),
    line: formatReceiptLine(updatedLine),
  };
}

export async function confirmReceiptInTransaction(
  tx: Prisma.TransactionClient,
  companyId: string,
  receiptId: string,
  notes?: string,
  actorUserId?: string,
  origin?: { location: string; metadata: Prisma.InputJsonObject; itemsByLine: Record<string, string>; lineMetadata?: Record<string, Prisma.InputJsonObject> }
): Promise<{ receipt: FormattedReceipt; confirmedNow: boolean }> {
  await tx.$queryRaw`SELECT "id" FROM "receipt" WHERE "id" = ${receiptId} AND "company_id" = ${companyId} FOR UPDATE`;
  const receipt = await tx.receipt.findFirst({
    where: { id: receiptId, companyId },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: { scans: { orderBy: { createdAt: "asc" } } },
      },
      scans: true,
    },
  });

  if (!receipt) {
    throw notFound("Receipt not found", "receipt_not_found");
  }

  // Idempotency: if already confirmed, return current state without creating movements again
  if (receipt.status === "CONFIRMED") {
    return { receipt: formatReceipt(receipt), confirmedNow: false };
  }

  if (receipt.status === "CANCELLED") {
    throw badRequest("Cannot confirm a cancelled receipt", "receipt_cancelled");
  }

  // Check not empty
  const totalReceived = receipt.lines.reduce(
    (sum, l) => sum + Number(l.receivedQuantity),
    0
  );

  if (totalReceived <= 0 && receipt.scans.length === 0) {
    throw badRequest("Cannot confirm an empty receipt with no received units", "receipt_empty");
  }

  // Check no pending unresolved scans
  const hasPendingScans = receipt.scans.some((s) => s.resolutionStatus === "PENDING");
  if (hasPendingScans) {
    throw badRequest(
      "Receipt has pending scans that must be resolved before confirmation",
      "receipt_has_pending_scans"
    );
  }

  // Verify all lines with received quantities have valid articleId
  const lineWithoutArticle = receipt.lines.find(
    (l) => Number(l.receivedQuantity) > 0 && !l.articleId
  );
  if (lineWithoutArticle) {
    throw badRequest(
      `Line ${lineWithoutArticle.lineNumber} has received quantity but no linked article`,
      "receipt_line_missing_article"
    );
  }

    const updated = await tx.receipt.update({
      where: { id: receipt.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: actorUserId || null,
        notes: notes !== undefined ? notes : receipt.notes,
      },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
          include: { scans: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    // Create StockMovements idempotently
    for (const line of updated.lines) {
      if (Number(line.receivedQuantity) <= 0 || !line.articleId) continue;

      if (line.scans && line.scans.length > 0) {
        for (const scan of line.scans) {
          if (!scan.articleId) continue;
          const idempotencyKey = `receipt:${receipt.id}:scan:${scan.id}`;

          await recordStockMovement(tx, {
              companyId,
              articleId: scan.articleId,
              movementType: "RECEIPT_IN",
              quantity: scan.quantity,
              lotCode: scan.lotCode,
              serialNumber: scan.serialNumber,
              expirationDate: scan.expirationDate,
              receiptId: receipt.id,
              receiptLineId: line.id,
              idempotencyKey,
              notes: `Ingreso por recepción ${receipt.documentReference || receipt.id}`,
              createdById: actorUserId || null,
              location: origin?.location,
               metadata: origin ? { ...origin.metadata, ...origin.lineMetadata?.[line.id], ordenCompraItemId: origin.itemsByLine[line.id] } : undefined,
          });
        }
      } else {
        // Line received without individual unit scans
        const idempotencyKey = `receipt:${receipt.id}:line:${line.id}`;
        await recordStockMovement(tx, {
            companyId,
            articleId: line.articleId,
            movementType: "RECEIPT_IN",
            quantity: line.receivedQuantity,
            lotCode: line.lotCode,
            serialNumber: line.serialNumber,
            expirationDate: line.expirationDate,
            receiptId: receipt.id,
            receiptLineId: line.id,
            idempotencyKey,
            notes: `Ingreso por recepción ${receipt.documentReference || receipt.id}`,
            createdById: actorUserId || null,
            location: origin?.location,
             metadata: origin ? { ...origin.metadata, ...origin.lineMetadata?.[line.id], ordenCompraItemId: origin.itemsByLine[line.id] } : undefined,
        });
      }
    }

    await createAuditEvent({
      prisma: tx,
      companyId,
      userId: actorUserId || "system",
      entityType: "Receipt",
      entityId: receipt.id,
      action: "confirmed",
      module: "stock",
      newValue: {
        confirmedAt: updated.confirmedAt,
        linesCount: updated.lines.length,
        totalReceived,
      },
    });

    return { receipt: formatReceipt(updated), confirmedNow: true };
}

export async function notifyReceiptConfirmed(db: PrismaClient, receipt: FormattedReceipt, actorUserId?: string, warnings?: readonly {
  readonly code: "EXPIRED_RECEIPT_ACCEPTED"; readonly itemId: string; readonly articleId: string;
  readonly expirationDate: string; readonly receivedOn: string; readonly lotCode?: string; readonly serialNumber?: string;
}[]) {
    try {
      const receiptWarnings = (warnings ?? []).slice(0, 1000).map(warning => ({
        code: warning.code, itemId: warning.itemId.slice(0, 128), articleId: warning.articleId.slice(0, 128),
        expirationDate: warning.expirationDate.slice(0, 10), receivedOn: warning.receivedOn.slice(0, 10),
        ...(warning.lotCode !== undefined ? { lotCode: warning.lotCode.slice(0, 120) } : {}),
        ...(warning.serialNumber !== undefined ? { serialNumber: warning.serialNumber.slice(0, 120) } : {}),
      }));
      const { emitCrossDomainNotification } = await import("./internal-notifications.service");
      await emitCrossDomainNotification(db, {
        companyId: receipt.companyId,
        actorUserId: actorUserId || "system",
        type: "stock_receipt_confirmed" as any,
        domain: "STOCK",
        severity: receiptWarnings.length ? "WARNING" : "SUCCESS",
        title: `Recepción confirmada: ${receipt.documentReference || receipt.id}`,
        body: receiptWarnings.length
          ? `Ingreso de mercadería registrado (${receipt.lines.length} líneas). Aviso: se aceptó material vencido (${receiptWarnings.length} advertencias).`
          : `Ingreso de mercadería registrado con éxito (${receipt.lines.length} líneas).`,
        sourceEntityId: receipt.id,
        linkHref: `/stock`,
        metadata: { receiptId: receipt.id, documentReference: receipt.documentReference,
          ...(receiptWarnings.length ? { expiredReceiptAccepted: true, receiptWarnings } : {}) },
      });
    } catch (e) {
      console.warn("[notification] Failed to emit receipt notification", e);
    }

}

export async function confirmReceipt(
  db: PrismaClient,
  companyId: string,
  receiptId: string,
  notes?: string,
  actorUserId?: string
): Promise<FormattedReceipt> {
  const { receipt, confirmedNow } = await db.$transaction(tx => confirmReceiptInTransaction(tx, companyId, receiptId, notes, actorUserId));
  if (confirmedNow) await notifyReceiptConfirmed(db, receipt, actorUserId);
  return receipt;
}
