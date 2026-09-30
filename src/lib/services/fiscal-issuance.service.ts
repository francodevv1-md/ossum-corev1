import type { PrismaClient } from "@prisma/client";
import { notFound, badRequest } from "../api/errors";
import { FiscalError } from "./fiscal.service";
import {
  getTusFacturasDevConfig,
  buildDeterministicExternalReference,
  calculateFiscalSnapshotHash,
  mapInvoiceToTusFacturasRequest,
  sanitizeTusFacturasFiscalPayload,
  withTusFacturasDevCredentials,
  callTusFacturasNewInvoice,
  callTusFacturasReconcile,
  type TusFacturasDevConfig,
} from "./fiscal-tusfacturas.service";
import { getFiscalEvidence } from "./fiscal-evidence-read.service";
import type { TusFacturasWebhookPayload } from "../validators/fiscal-tusfacturas";

function extractContactVatCondition(contact: unknown): string | null {
  if (!contact || typeof contact !== "object") return null;
  const rec = contact as Record<string, unknown>;
  const links = Array.isArray(rec.companyLinks) ? rec.companyLinks : [];
  const linkVat = (links[0] as Record<string, unknown> | undefined)?.vatCondition;
  const raw = linkVat || rec.vatCondition || rec.taxCondition;
  if (!raw || typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase();
  if (upper === "RI" || upper.includes("RESPONSABLE INSCRIPTO") || upper.includes("INSCRIPTO")) return "RI";
  if (upper === "MT" || upper.includes("MONOTRIBUTO")) return "MT";
  if (upper === "CF" || upper.includes("CONSUMIDOR FINAL")) return "CF";
  if (upper === "EX" || upper.includes("EXENTO")) return "EX";
  if (upper === "RNI" || upper.includes("NO INSCRIPTO")) return "RNI";
  return upper;
}

export async function issueFiscalInvoiceDev(
  prisma: PrismaClient,
  companyId: string,
  invoiceId: string,
  userId?: string | null,
  options: {
    config?: TusFacturasDevConfig;
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  const config = options.config ?? getTusFacturasDevConfig();
  if (!config) {
    throw new FiscalError(
      "fiscal_dev_config_missing",
      "La configuración DEV de TusFacturas (API Key, API Token o User Token) no está configurada en el servidor.",
      422,
    );
  }

  // Fetch invoice with items and relations
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      items: true,
      surgery: {
        include: {
          patient: {
            include: {
              companyLinks: true,
            },
          },
          payer: {
            include: {
              companyLinks: true,
            },
          },
        },
      },
      company: true,
    },
  });

  if (!invoice) {
    throw notFound(`Factura ${invoiceId} no encontrada`, "invoice_not_found");
  }

  if (invoice.state === "Anulada") {
    throw badRequest("No se puede emitir fiscalmente una factura anulada", "invoice_cancelled");
  }

  // Determine client data and VAT condition
  const payer = invoice.surgery?.payer;
  const patient = invoice.surgery?.patient;
  const clientName =
    payer?.legalName ||
    payer?.tradeName ||
    (payer?.firstName && payer?.lastName ? `${payer.firstName} ${payer.lastName}` : null) ||
    patient?.legalName ||
    (patient?.firstName && patient?.lastName ? `${patient.firstName} ${patient.lastName}` : null);
  const clientDocType = payer?.documentType || patient?.documentType || "CUIT";
  const clientDocNumber = payer?.documentNumber || patient?.documentNumber || "";
  const clientEmail = payer?.email || patient?.email || "";
  const clientVatCondition = extractContactVatCondition(payer) || extractContactVatCondition(patient) || null;

  const regeneratedPayload = mapInvoiceToTusFacturasRequest({
    companyId,
    invoiceId,
    visibleNumber: invoice.visibleNumber,
    invoiceType: invoice.type,
    issueDate: null, // DEV issuance uses current date; no fake historical date
    total: Number(invoice.total),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      vatTreatment: item.vatTreatment,
      vatRate: item.vatRate,
      sku: item.sku,
    })),
    client: {
      name: clientName,
      legalName: clientName,
      documentType: clientDocType,
      documentNumber: clientDocNumber,
      email: clientEmail,
      condicionIva: clientVatCondition,
    },
    config,
  });

  const regeneratedSnapshot = sanitizeTusFacturasFiscalPayload(regeneratedPayload);
  const snapshotHash = calculateFiscalSnapshotHash(regeneratedSnapshot);
  const externalReference = buildDeterministicExternalReference(companyId, invoiceId);

  // Check existing fiscal document
  const existingDoc = await prisma.fiscalDocument.findFirst({
    where: { companyId, invoiceId },
    include: {
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
  });

  if (existingDoc) {
    if (existingDoc.state === "AUTHORIZED") {
      throw new FiscalError(
        "fiscal_already_authorized",
        "La factura ya fue emitida y autorizada fiscalmente con CAE.",
        409,
      );
    }

    // Verify snapshot immutability
    const persistedSnapshot = sanitizeTusFacturasFiscalPayload(existingDoc.snapshot as Record<string, unknown>);
    if (persistedSnapshot && calculateFiscalSnapshotHash(persistedSnapshot) !== snapshotHash) {
      throw new FiscalError("fiscal_snapshot_mismatch", "La factura cambió desde la creación de su evidencia fiscal y no puede reemitirse.", 409);
    }

    // If existing document is in SUBMITTED, UNKNOWN, PENDING or REJECTED, do NOT send to provider
    if (["SUBMITTED", "UNKNOWN", "PENDING", "REJECTED"].includes(existingDoc.state)) {
      // Reconcile with TusFacturas
      const autoReconcile = await callTusFacturasReconcile(existingDoc.externalReference, config, options);
      if (autoReconcile.found && autoReconcile.state === "AUTHORIZED") {
        const lastAttempt = existingDoc.attempts[0];
        const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
        const reconcilePayloadWrapper = {
          reconciliation: {
            external_reference: existingDoc.externalReference,
            response: sanitizeTusFacturasFiscalPayload((autoReconcile.rawResponse ?? {}) as Record<string, unknown>),
          },
        };

        await prisma.fiscalIssuanceAttempt.create({
          data: {
            companyId,
            fiscalDocumentId: existingDoc.id,
            attemptNumber,
            state: "AUTHORIZED",
            externalReference: existingDoc.externalReference,
            requestPayload: { query: "consulta_avanzada", external_reference: existingDoc.externalReference } as object,
            responsePayload: reconcilePayloadWrapper as object,
            errorCode: null,
            errorMessage: null,
          },
        });

        await prisma.fiscalDocument.update({
          where: { id: existingDoc.id },
          data: {
            state: "AUTHORIZED",
            authorizedAt: new Date(),
          },
        });

        await prisma.invoice?.updateMany?.({
          where: { id: invoiceId, state: "Borrador" },
          data: { state: "Emitido" },
        });

        return getFiscalEvidence(prisma, companyId, invoiceId);
      }

      // Reconciliation did not confirm CAE authorization -> conflict / reconciliation required
      throw new FiscalError(
        "fiscal_issuance_in_progress",
        "Existe un documento fiscal previo sin confirmación de CAE. Reconciliá el estado antes de volver a emitir.",
        409,
      );
    }

    // If existingDoc is in READY or another claimable state, claim with conditional updateMany
    const claimed = await prisma.fiscalDocument.updateMany({
      where: { id: existingDoc.id, state: "READY" },
      data: {
        state: "SUBMITTED",
        submittedAt: new Date(),
        snapshotHash,
        snapshot: regeneratedSnapshot as object,
      },
    });

    if (claimed.count === 0) {
      throw new FiscalError(
        "fiscal_issuance_in_progress",
        "Existe una emisión fiscal en curso para esta factura. Por favor aguardá la respuesta de ARCA o reconciliá el estado.",
        409,
      );
    }
  }

  let fiscalDocId: string;
  if (existingDoc) {
    fiscalDocId = existingDoc.id;
  } else {
    try {
      const created = await prisma.fiscalDocument.create({
        data: {
          companyId,
          invoiceId,
          environment: "DEV_ONLY",
          state: "SUBMITTED",
          externalReference,
          snapshotHash,
          snapshot: regeneratedSnapshot as object,
          submittedAt: new Date(),
          createdById: userId ?? null,
        },
      });
      fiscalDocId = created.id;
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj?.code === "P2002" || errObj?.message?.includes("Unique constraint")) {
        throw new FiscalError(
          "fiscal_issuance_in_progress",
          "Existe una emisión fiscal en curso para esta factura. Por favor aguardá la respuesta de ARCA o reconciliá el estado.",
          409,
        );
      }
      throw err;
    }
  }

  const payload = withTusFacturasDevCredentials(regeneratedSnapshot, config);

  // Call TusFacturas API
  const response = await callTusFacturasNewInvoice(payload, {
    apiUrl: config.apiUrl,
    timeoutMs: options.timeoutMs,
    fetchFn: options.fetchFn,
  });

  // Classify response strictly: UNKNOWN, AUTHORIZED or REJECTED (never persist SIMULATED)
  let finalState: "AUTHORIZED" | "UNKNOWN" | "REJECTED" = "UNKNOWN";
  let isAuthorized = false;

  if (response.error === "N") {
    const hasCae = Boolean(response.cae && response.cae.trim());
    if (hasCae) {
      finalState = "AUTHORIZED";
      isAuthorized = true;
    } else {
      // DEV simulation without CAE persists UNKNOWN; displayState will derive SIMULATED
      finalState = "UNKNOWN";
      isAuthorized = false;
    }
  } else {
    const errorCode = response.error_cod?.[0];
    if (errorCode === "TIMEOUT" || errorCode === "NETWORK_ERROR") {
      finalState = "UNKNOWN";
    } else {
      finalState = "REJECTED";
    }
  }

  const responsePayloadWrapper = {
    issuance: {
      request: sanitizeTusFacturasFiscalPayload(payload),
      response: sanitizeTusFacturasFiscalPayload(response),
    },
  };

  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  if (response.error === "S") {
    if (response.error_cod && response.error_cod.length > 0) {
      errorCode = String(response.error_cod[0]);
    } else if (response.error_details && response.error_details.length > 0) {
      try {
        const parsedDetail = JSON.parse(response.error_details[0]);
        errorCode = parsedDetail.code || "ERROR";
      } catch {
        errorCode = "ERROR";
      }
    } else {
      errorCode = "ERROR";
    }
    errorMessage = response.errores?.[0] || "Error en emisión fiscal";
  }

  // Calculate next attemptNumber
  const lastAttempt = await prisma.fiscalIssuanceAttempt.findFirst({
    where: { fiscalDocumentId: fiscalDocId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

  // Persist attempt
  await prisma.fiscalIssuanceAttempt.create({
    data: {
      companyId,
      fiscalDocumentId: fiscalDocId,
      attemptNumber,
      state: finalState,
      externalReference,
      requestPayload: sanitizeTusFacturasFiscalPayload(payload) as object,
      responsePayload: responsePayloadWrapper as object,
      errorCode,
      errorMessage,
    },
  });

  // Update FiscalDocument
  await prisma.fiscalDocument.update({
    where: { id: fiscalDocId },
    data: {
      state: finalState,
      authorizedAt: isAuthorized ? new Date() : null,
    },
  });

  // Sincronizar estado operativo de la factura a 'Emitido' si obtuvo CAE
  if (isAuthorized) {
    await prisma.invoice?.updateMany?.({
      where: { id: invoiceId, state: "Borrador" },
      data: { state: "Emitido" },
    });
  }

  return getFiscalEvidence(prisma, companyId, invoiceId);
}

export async function reconcileFiscalInvoiceDev(
  prisma: PrismaClient,
  companyId: string,
  invoiceId: string,
  _userId?: string | null,
  options: {
    config?: TusFacturasDevConfig;
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  const config = options.config ?? getTusFacturasDevConfig();
  if (!config) {
    throw new FiscalError(
      "fiscal_dev_config_missing",
      "La configuración DEV de TusFacturas no está configurada en el servidor.",
      422,
    );
  }

  const fiscalDoc = await prisma.fiscalDocument.findFirst({
    where: { companyId, invoiceId },
    include: {
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!fiscalDoc) {
    throw notFound("Documento fiscal no encontrado para reconciliar", "fiscal_document_not_found");
  }

  const reconcileResult = await callTusFacturasReconcile(fiscalDoc.externalReference, config, options);

  if (reconcileResult.found) {
    const lastAttempt = fiscalDoc.attempts[0];
    const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

    const reconcilePayloadWrapper = {
      reconciliation: {
        external_reference: fiscalDoc.externalReference,
        response: sanitizeTusFacturasFiscalPayload((reconcileResult.rawResponse ?? {}) as Record<string, unknown>),
      },
    };

    let newState: "AUTHORIZED" | "UNKNOWN" | "REJECTED" | "PENDING" = "UNKNOWN";
    if (reconcileResult.state === "AUTHORIZED") {
      newState = "AUTHORIZED";
    } else if (reconcileResult.state === "REJECTED") {
      newState = "REJECTED";
    } else {
      newState = "UNKNOWN";
    }

    await prisma.fiscalIssuanceAttempt.create({
      data: {
        companyId,
        fiscalDocumentId: fiscalDoc.id,
        attemptNumber,
        state: newState,
        externalReference: fiscalDoc.externalReference,
        requestPayload: { query: "consulta_avanzada", external_reference: fiscalDoc.externalReference } as object,
        responsePayload: reconcilePayloadWrapper as object,
        errorCode: reconcileResult.error || null,
        errorMessage: reconcileResult.error || null,
      },
    });

    const isAuthorized = newState === "AUTHORIZED";

    await prisma.fiscalDocument.update({
      where: { id: fiscalDoc.id },
      data: {
        state: newState,
        authorizedAt: isAuthorized ? (fiscalDoc.authorizedAt ?? new Date()) : null,
      },
    });

    if (isAuthorized) {
      await prisma.invoice?.updateMany?.({
        where: { id: invoiceId, state: "Borrador" },
        data: { state: "Emitido" },
      });
    }
  }

  return getFiscalEvidence(prisma, companyId, invoiceId);
}

export async function handleTusFacturasWebhookDev(
  prisma: PrismaClient,
  payload: TusFacturasWebhookPayload,
) {
  // Graceful support for webhook test handshake
  if (payload.evento === "test") {
    return { success: true, test: true, received: true };
  }

  if (!payload.external_reference) {
    return { ignored: true, reason: "missing_external_reference" };
  }

  const fiscalDoc = await prisma.fiscalDocument.findFirst({
    where: { externalReference: payload.external_reference },
    include: {
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!fiscalDoc) {
    return { ignored: true, reason: "document_not_found" };
  }

  const correlationId = calculateFiscalSnapshotHash(
    payload.hook_id ? { hook_id: payload.hook_id, external_reference: payload.external_reference } : payload,
  );
  const duplicate = await prisma.fiscalIssuanceAttempt.findFirst({
    where: { fiscalDocumentId: fiscalDoc.id, correlationId },
    select: { id: true },
  });
  if (duplicate) return { ignored: true, reason: "duplicate_webhook" };

  let nextState: "AUTHORIZED" | "UNKNOWN" | "REJECTED" | "PENDING" = "UNKNOWN";
  let isAuthorized = false;

  if (payload.evento === "emitido") {
    if (payload.cae && payload.cae.trim()) {
      nextState = "AUTHORIZED";
      isAuthorized = true;
    } else {
      nextState = "UNKNOWN";
      isAuthorized = false;
    }
  } else if (payload.evento === "error") {
    nextState = "REJECTED";
  } else if (payload.evento === "encolado") {
    nextState = "PENDING";
  }

  const lastAttempt = fiscalDoc.attempts[0];
  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

  await prisma.fiscalIssuanceAttempt.create({
    data: {
      companyId: fiscalDoc.companyId,
      fiscalDocumentId: fiscalDoc.id,
      attemptNumber,
      state: nextState,
      externalReference: fiscalDoc.externalReference,
      correlationId,
      requestPayload: { webhook_event: payload.evento } as object,
      responsePayload: {
        webhook: {
          receivedAt: new Date().toISOString(),
          payload: sanitizeTusFacturasFiscalPayload(payload),
        },
      } as object,
      errorCode: payload.error || null,
      errorMessage: payload.mensaje || null,
    },
  });

  await prisma.fiscalDocument.update({
    where: { id: fiscalDoc.id },
    data: {
      state: nextState,
      authorizedAt: isAuthorized ? (fiscalDoc.authorizedAt ?? new Date()) : null,
    },
  });

  if (isAuthorized && fiscalDoc.invoiceId) {
    await prisma.invoice?.updateMany?.({
      where: { id: fiscalDoc.invoiceId, state: "Borrador" },
      data: { state: "Emitido" },
    });
  }

  return { success: true, state: nextState };
}
