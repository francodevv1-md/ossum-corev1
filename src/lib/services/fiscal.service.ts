import type { Prisma } from "@prisma/client";

export const FISCAL_CANCELLATION_GUARD_STATES = ["SUBMITTED", "PENDING", "UNKNOWN", "AUTHORIZED"] as const;

export class FiscalError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "FiscalError";
    this.code = code;
    this.status = status;
  }
}

export async function assertFiscalCancellationAllowed(
  tx: Prisma.TransactionClient,
  companyId: string,
  invoiceId: string,
) {
  const activeDocument = await tx.fiscalDocument.findFirst({
    where: { companyId, invoiceId, state: { in: [...FISCAL_CANCELLATION_GUARD_STATES] } },
    select: { id: true, state: true },
  });
  if (activeDocument) {
    throw new FiscalError(
      "fiscal_cancellation_blocked",
      `Invoice ${invoiceId} cannot be operationally cancelled while fiscal evidence is ${activeDocument.state}`,
    );
  }
}
