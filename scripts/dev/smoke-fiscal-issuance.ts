import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { default: prisma } = await import("../../src/lib/prisma");
  const { isTusFacturasDevConfigured } = await import("../../src/lib/services/fiscal-tusfacturas.service");
  const { issueFiscalInvoiceDev, reconcileFiscalInvoiceDev } = await import("../../src/lib/services/fiscal-issuance.service");
  const { assertFiscalCancellationAllowed } = await import("../../src/lib/services/fiscal.service");

  try {
    const isConfigured = isTusFacturasDevConfigured();
    console.log(JSON.stringify({ step: "check_config", isConfigured }));

    if (!isConfigured) {
      console.log(JSON.stringify({
        step: "config_missing",
        message: "Variables de TusFacturas DEV incompletas en .env.local. Deteniendo ejecución sin llamar al proveedor.",
      }));
      process.exit(1);
    }

    // Check active company
    const company = await prisma.company.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (!company) {
      console.error("No se encontró empresa activa en la base DEV");
      process.exit(1);
    }

    console.log(JSON.stringify({ step: "company_found", companyId: company.id, name: company.name }));

    const smokeDescription = "TF-DEV-SMOKE-001 - Material Quirúrgico de Prueba (DEV Sandbox)";

    // Find or create smoke fixture invoice
    let invoice = await prisma.invoice.findFirst({
      where: {
        companyId: company.id,
        items: {
          some: { description: smokeDescription },
        },
      },
      include: {
        items: true,
        fiscalDocument: true,
      },
    });

    if (invoice && invoice.fiscalDocument) {
      console.log(JSON.stringify({
        step: "existing_smoke_invoice_found",
        invoiceId: invoice.id,
        visibleNumber: invoice.visibleNumber,
        state: invoice.state,
        fiscalDocState: invoice.fiscalDocument.state,
        externalReference: invoice.fiscalDocument.externalReference,
      }));
    } else if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          companyId: company.id,
          visibleNumber: 9901,
          base: "manual",
          state: "Emitida",
          type: "FV",
          currency: "ARS",
          subtotal: 1000,
          total: 1000,
          balance: 1000,
          items: {
            create: [
              {
                sku: "SMOKE-DEV-01",
                description: smokeDescription,
                quantity: 1,
                unitPrice: 1000,
                total: 1000,
              },
            ],
          },
        },
        include: {
          items: true,
          fiscalDocument: true,
        },
      });
      console.log(JSON.stringify({ step: "created_smoke_invoice", invoiceId: invoice.id, visibleNumber: invoice.visibleNumber }));
    }

    if (invoice.fiscalDocument && (invoice.fiscalDocument.state === "AUTHORIZED" || invoice.fiscalDocument.authorizedAt !== null)) {
      console.log(JSON.stringify({
        step: "already_authorized",
        message: "El documento fiscal ya está autorizado. No se duplicará emisión.",
      }));
      process.exit(0);
    }

    // Execute ONE controlled issuance
    console.log(JSON.stringify({ step: "executing_single_issuance", invoiceId: invoice.id }));
    let result = await issueFiscalInvoiceDev(prisma, company.id, invoice.id, null);

    console.log(JSON.stringify({
      step: "issuance_result",
      documentDisplayState: result.document.displayState,
      documentState: result.document.state,
      externalReference: result.document.externalReference,
      attemptsCount: result.attempts.length,
      latestAttempt: result.attempts[result.attempts.length - 1],
    }));

    // Safety check: if CAE was returned, report immediately
    const latestAttempt = result.attempts[result.attempts.length - 1];
    const latestResponse = (latestAttempt?.evidence as any)?.issuance?.response;
    if (latestResponse?.cae && String(latestResponse.cae).trim().length > 0) {
      console.warn("ALERTA: Se detectó CAE devuelto por el proveedor. Verificar si el punto de venta es sandbox.");
    }

    // If result was UNKNOWN or TIMEOUT, execute exactly one reconciliation
    if (result.document.state === "UNKNOWN" || result.document.state === "PENDING") {
      console.log(JSON.stringify({ step: "reconciling_unknown_state", externalReference: result.document.externalReference }));
      result = await reconcileFiscalInvoiceDev(prisma, company.id, invoice.id, null);
      console.log(JSON.stringify({
        step: "reconcile_result",
        documentDisplayState: result.document.displayState,
        documentState: result.document.state,
        attemptsCount: result.attempts.length,
        latestAttempt: result.attempts[result.attempts.length - 1],
      }));
    }

    // Verification 1: Audit snapshot in DB for secret leaks
    const savedDoc = await prisma.fiscalDocument.findFirst({
      where: { invoiceId: invoice.id },
      include: { attempts: true },
    });

    const snapshotStr = JSON.stringify(savedDoc?.snapshot ?? {});
    const leaksSecret = /token|apikey|api_key|password|secret/i.test(snapshotStr);

    console.log(JSON.stringify({
      step: "snapshot_audit",
      snapshotHash: savedDoc?.snapshotHash,
      leaksSecret,
    }));

    // Verification 2: Verify cancellation guard blocks operational cancellation
    let cancellationBlocked = false;
    try {
      await prisma.$transaction(async (tx) => {
        await assertFiscalCancellationAllowed(tx, company.id, invoice.id);
      });
    } catch (err: any) {
      if (err?.code === "fiscal_cancellation_blocked") {
        cancellationBlocked = true;
      }
    }

    console.log(JSON.stringify({
      step: "cancellation_guard_audit",
      cancellationBlocked,
    }));

  } catch (err: any) {
    console.error("Error durante smoke test fiscal DEV:", err?.message || err);
    if (err?.code) console.error("Error code:", err.code);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
