import type { PrismaClient } from "@prisma/client";

import { notFound } from "../api/errors";
import { deriveTusFacturasDevDisplayState } from "./fiscal-tusfacturas.service";

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
  if (!issuance || typeof issuance !== "object" || Array.isArray(issuance)) return undefined;
  return (issuance as Record<string, unknown>).response;
}

export async function getFiscalEvidence(
  prisma: Pick<PrismaClient, "fiscalDocument">,
  companyId: string,
  invoiceId: string,
) {
  const document = await prisma.fiscalDocument.findFirst({
    where: { companyId, invoiceId },
    select: {
      id: true,
      environment: true,
      state: true,
      externalReference: true,
      snapshotHash: true,
      createdAt: true,
      submittedAt: true,
      authorizedAt: true,
      attempts: {
        orderBy: { attemptNumber: "asc" },
        select: {
          id: true,
          attemptNumber: true,
          state: true,
          externalReference: true,
          errorCode: true,
          responsePayload: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!document) throw notFound("Fiscal evidence not found", "fiscal_evidence_not_found");

  const attempts = document.attempts.map((attempt) => ({
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    state: attempt.state,
    displayState: deriveTusFacturasDevDisplayState({
      environment: document.environment,
      persistedState: attempt.state,
      externalReference: attempt.externalReference,
      response: issuanceResponse(attempt.responsePayload),
    }),
    externalReference: attempt.externalReference,
    errorCode: attempt.errorCode,
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
      displayState: deriveTusFacturasDevDisplayState({
        environment: document.environment,
        persistedState: document.state,
        externalReference: document.externalReference,
        response: issuanceResponse(latestAttempt?.responsePayload),
      }),
      externalReference: document.externalReference,
      snapshotHash: document.snapshotHash,
      createdAt: document.createdAt,
      submittedAt: document.submittedAt,
      authorizedAt: document.authorizedAt,
    },
    attempts,
  };
}
