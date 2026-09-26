import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"

import InvoicePDFDocument, { type InvoicePDFData } from "@/components/facturacion/InvoicePDFDocument"
import { createAuditEvent } from "@/lib/audit"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { ApiError, badRequest, notFound } from "@/lib/api/errors"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { buildOutboundEmailIdempotencyKey, parseOutboundEmailInput, sendResendEmail } from "@/lib/outbound-email"
import prisma from "@/lib/prisma"
import { getInvoice, INVOICE_MUTATION_ROLES } from "@/lib/services/invoice.service"

type RouteContext = { params: Promise<{ companyId: string; invoiceId: string }> }
type DeliverableState = InvoicePDFData["state"]

const DELIVERABLE_STATES = new Set<string>(["Emitida", "Parcialmente_cobrada", "Cobrada"])

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(value)
}

function toPdfData(invoice: Awaited<ReturnType<typeof getInvoice>>): InvoicePDFData {
  return {
    documentKind: "operational_invoice",
    fiscalStatus: "non_fiscal",
    documentNumber: `Factura-${invoice.visibleNumber}`,
    invoiceId: invoice.id,
    issuedAt: formatDate(invoice.issuedAt!),
    state: invoice.state as DeliverableState,
    type: invoice.type,
    currency: invoice.currency,
    base: invoice.base,
    surgeryId: invoice.surgeryId,
    items: invoice.items.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      discount: String(item.discount),
      tax: String(item.tax),
      total: String(item.total),
    })),
    subtotal: String(invoice.subtotal),
    discountTotal: String(invoice.discountTotal),
    taxTotal: String(invoice.taxTotal),
    total: String(invoice.total),
    paidTotal: String(invoice.paidTotal),
    balance: String(invoice.balance),
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found")
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, INVOICE_MUTATION_ROLES)
    const input = parseOutboundEmailInput(await request.json())
    const invoice = await getInvoice({ companyId: ctx.companyId, invoiceId, prisma })

    if (invoice.state === "Borrador") throw badRequest("Emití la factura operativa antes de enviarla por correo", "invoice_email_requires_issued")
    if (!DELIVERABLE_STATES.has(invoice.state)) throw badRequest("La factura operativa no se puede enviar en su estado actual", "invoice_email_state_not_deliverable")
    if (invoice.visibleNumber == null || invoice.issuedAt == null) throw badRequest("La factura operativa debe tener número y fecha de emisión", "invoice_email_requires_issued")

    const pdf = await renderToBuffer(React.createElement(InvoicePDFDocument, { data: toPdfData(invoice) }) as Parameters<typeof renderToBuffer>[0])
    const result = await sendResendEmail({
      to: input.to,
      cc: input.copyMe ? ctx.user.email : undefined,
      subject: input.subject,
      message: input.message,
      idempotencyKey: buildOutboundEmailIdempotencyKey("invoice", ctx.companyId, invoice.id, input.idempotencyKey),
      attachments: [{ filename: `Factura-${invoice.visibleNumber}.pdf`, content: pdf }],
    })

    let auditRecorded = true
    try {
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Invoice",
        entityId: invoice.id,
        action: "invoice_email_accepted",
        module: "invoice",
        metadata: { to: input.to, copyTo: input.copyMe ? ctx.user.email : null, provider: result.provider, providerMessageId: result.providerMessageId, documentKind: "operational_invoice", fiscalStatus: "non_fiscal" },
      })
    } catch (auditError) {
      auditRecorded = false
      console.error("[invoice.email.POST] Email accepted but audit failed", {
        name: auditError instanceof Error ? auditError.name : "UnknownError",
        code: auditError instanceof ApiError ? auditError.code : "audit_write_failed",
      })
    }
    return ok({ ...result, auditRecorded })
  } catch (error) {
    console.error("[invoice.email.POST]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error instanceof ApiError ? error.code : "unhandled_error",
    })
    return errorResponse(error)
  }
}
