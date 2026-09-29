import type { PrismaClient } from "@prisma/client";

import { notFound } from "../api/errors";

const SENSITIVE_EVIDENCE_FIELD = /token|apikey|api_key|authorization|credentials|password|secret/i;

function sanitizeEvidence(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeEvidence);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) =>
      SENSITIVE_EVIDENCE_FIELD.test(key) ? [] : [[key, sanitizeEvidence(nested)]],
    ),
  );
}

function issuanceResponse(evidence: unknown): unknown {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return undefined;
  const issuance = (evidence as Record<string, unknown>).issuance;
  if (issuance && typeof issuance === "object" && !Array.isArray(issuance)) {
    return (issuance as Record<string, unknown>).response;
  }
  const reconciliation = (evidence as Record<string, unknown>).reconciliation;
  if (reconciliation && typeof reconciliation === "object" && !Array.isArray(reconciliation)) {
    const resp = (reconciliation as Record<string, unknown>).response as Record<string, unknown>;
    if (resp?.comprobantes && Array.isArray(resp.comprobantes) && resp.comprobantes[0]) {
      const cmp = (resp.comprobantes[0] as Record<string, unknown>).comprobante || resp.comprobantes[0];
      const rec = cmp as Record<string, unknown>;
      return {
        error: resp.error || "N",
        external_reference: rec.external_reference || (reconciliation as Record<string, unknown>).external_reference,
        comprobante_nro: rec.numero ? String(rec.numero) : rec.comprobante_nro,
        comprobante_pdf_url: rec.comprobante_pdf_url,
        cae: rec.cae,
      };
    }
    return (reconciliation as Record<string, unknown>).response;
  }
  return undefined;
}

function displayState(input: { environment: string; persistedState: string; externalReference: string; response: unknown }) {
  if (input.persistedState !== "UNKNOWN" || input.environment !== "DEV_ONLY" || !input.response || typeof input.response !== "object") {
    return input.persistedState;
  }
  const response = input.response as Record<string, unknown>;
  const nonEmptyString = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
  return response.error === "N"
    && response.external_reference === input.externalReference
    && nonEmptyString(response.comprobante_nro)
    && nonEmptyString(response.comprobante_pdf_url)
    && !nonEmptyString(response.cae)
    ? "SIMULATED"
    : "UNKNOWN";
}

export async function getFiscalEvidence(
  prisma: Pick<PrismaClient, "fiscalDocument">,
  companyId: string,
  invoiceId: string,
) {
  const document = await prisma.fiscalDocument.findFirst({
    where: { companyId, invoiceId },
    select: {
      id: true, environment: true, state: true, externalReference: true, snapshotHash: true,
      createdAt: true, submittedAt: true, authorizedAt: true,
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: { id: true, attemptNumber: true, state: true, externalReference: true, errorCode: true, errorMessage: true, responsePayload: true, createdAt: true, updatedAt: true },
      },
    },
  });
  if (!document) throw notFound("Fiscal evidence not found", "fiscal_evidence_not_found");

  const attempts = document.attempts.map((attempt) => ({
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    state: attempt.state,
    displayState: displayState({ environment: document.environment, persistedState: attempt.state, externalReference: attempt.externalReference, response: issuanceResponse(attempt.responsePayload) }),
    externalReference: attempt.externalReference,
    errorCode: attempt.errorCode,
    errorMessage: attempt.errorMessage,
    evidence: sanitizeEvidence(attempt.responsePayload),
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  }));
  const latestAttempt = document.attempts.at(-1);
  return {
    document: {
      id: document.id,
      environment: document.environment,
      state: document.state,
      displayState: displayState({ environment: document.environment, persistedState: document.state, externalReference: document.externalReference, response: issuanceResponse(latestAttempt?.responsePayload) }),
      externalReference: document.externalReference,
      snapshotHash: document.snapshotHash,
      createdAt: document.createdAt,
      submittedAt: document.submittedAt,
      authorizedAt: document.authorizedAt,
      lastErrorCode: latestAttempt?.errorCode ?? null,
      lastErrorMessage: latestAttempt?.errorMessage ?? null,
    },
    attempts,
  };
}
