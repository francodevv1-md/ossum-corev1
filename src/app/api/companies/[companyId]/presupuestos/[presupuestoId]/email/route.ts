import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"

import PresupuestoPDFDocument, { type PresupuestoPDFData } from "@/components/presupuestos/PresupuestoPDFDocument"
import { createAuditEvent } from "@/lib/audit"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { ApiError, badRequest, notFound } from "@/lib/api/errors"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { buildOutboundEmailIdempotencyKey, parseOutboundEmailInput, sendResendEmail } from "@/lib/outbound-email"
import { canEmailPresupuestoState } from "@/lib/permissions/financial-document-email"
import prisma from "@/lib/prisma"
import { getPresupuesto, PRESUPUESTO_MUTATION_ROLES } from "@/lib/services/presupuesto.service"

type RouteContext = { params: Promise<{ companyId: string; presupuestoId: string }> }

export function formatPresupuestoDocumentDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: "UTC" }).format(parsed)
}

function pdfData(presupuesto: Awaited<ReturnType<typeof getPresupuesto>>): PresupuestoPDFData {
  const snapshot = presupuesto.commercialSnapshot && typeof presupuesto.commercialSnapshot === "object" && !Array.isArray(presupuesto.commercialSnapshot)
    ? presupuesto.commercialSnapshot as Record<string, unknown>
    : {}
  const label = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "—"
    const row = value as Record<string, unknown>
    return String(row.legalName || [row.firstName, row.lastName].filter(Boolean).join(" ") || row.name || "—")
  }
  return {
    documentNumber: presupuesto.visibleNumber == null ? presupuesto.id : `P-${String(presupuesto.visibleNumber).padStart(4, "0")}`,
    presupuestoId: presupuesto.id,
    state: presupuesto.state,
    versionNumber: presupuesto.versionNumber,
    title: presupuesto.title,
    currency: presupuesto.currency,
    surgeryLabel: presupuesto.surgeryId,
    companyLabel: label(snapshot.company),
    branchLabel: label(snapshot.branch),
    clientLabel: label(snapshot.client),
    payerLabel: label(snapshot.payer),
    responsibleLabel: label(snapshot.responsible),
    documentDate: formatPresupuestoDocumentDate(presupuesto.documentDate),
    issuedAt: formatPresupuestoDocumentDate(presupuesto.issuedAt),
    validUntil: formatPresupuestoDocumentDate(presupuesto.validUntil),
    createdAt: formatPresupuestoDocumentDate(presupuesto.createdAt),
    subtotal: String(presupuesto.subtotal),
    discountTotal: String(presupuesto.discountTotal),
    taxTotal: String(presupuesto.taxTotal),
    total: String(presupuesto.total),
    paymentTerms: presupuesto.paymentTerms,
    priceListCode: presupuesto.priceListCode,
    legend: presupuesto.legend,
    notes: presupuesto.notes,
    items: presupuesto.items.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      discount: String(item.discount),
      tax: String(item.tax),
      total: String(item.total),
    })),
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params
    if (!presupuestoId) throw notFound("Presupuesto id is required", "presupuesto_not_found")
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES)
    const input = parseOutboundEmailInput(await request.json())
    const presupuesto = await getPresupuesto({ companyId: ctx.companyId, presupuestoId, prisma })
    if (!canEmailPresupuestoState(presupuesto.state)) throw badRequest("Solo presupuestos emitidos o aprobados pueden enviarse por correo", "presupuesto_email_state_not_allowed")

    const data = pdfData(presupuesto)
    const pdf = await renderToBuffer(React.createElement(PresupuestoPDFDocument, { data }) as Parameters<typeof renderToBuffer>[0])
    const result = await sendResendEmail({
      to: input.to,
      cc: input.copyMe ? ctx.user.email : undefined,
      subject: input.subject,
      message: input.message,
      idempotencyKey: buildOutboundEmailIdempotencyKey("presupuesto", ctx.companyId, presupuesto.id, input.idempotencyKey),
      attachments: [{ filename: `${data.documentNumber}.pdf`, content: pdf }],
    })

    let auditRecorded = true
    try {
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Presupuesto",
        entityId: presupuesto.id,
        action: "presupuesto_email_accepted",
        module: "presupuesto",
        metadata: { to: input.to, copyTo: input.copyMe ? ctx.user.email : null, provider: result.provider, providerMessageId: result.providerMessageId },
      })
    } catch (auditError) {
      auditRecorded = false
      console.error("[presupuesto.email.POST] Email accepted but audit failed", {
        name: auditError instanceof Error ? auditError.name : "UnknownError",
        code: auditError instanceof ApiError ? auditError.code : "audit_write_failed",
      })
    }
    return ok({ ...result, auditRecorded })
  } catch (error) {
    console.error("[presupuesto.email.POST]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error instanceof ApiError ? error.code : "unhandled_error",
    })
    return errorResponse(error)
  }
}
