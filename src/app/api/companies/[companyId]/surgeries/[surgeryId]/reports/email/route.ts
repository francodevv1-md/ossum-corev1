import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"

import SurgeryReportPDFDocument, { type SurgeryReportPDFData } from "@/components/coordinadores/SurgeryReportPDFDocument"
import { createAuditEvent } from "@/lib/audit"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { ApiError, notFound } from "@/lib/api/errors"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { buildOutboundEmailIdempotencyKey, parseOutboundEmailInput, sendResendEmail } from "@/lib/outbound-email"
import prisma from "@/lib/prisma"
import { getSurgeryById } from "@/lib/services/surgery.service"

const SURGERY_REPORT_EMAIL_ROLES = ["admin", "coordinator", "coordinador"] as const
type RouteContext = { params: Promise<{ companyId: string; surgeryId: string }> }

function contactName(contact: { firstName?: string | null; lastName?: string | null; legalName?: string | null } | null | undefined) {
  return contact?.legalName?.trim() || [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() || "Sin definir"
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Sin definir"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Sin definir" : new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(parsed)
}

function reportData(surgery: NonNullable<Awaited<ReturnType<typeof getSurgeryById>>>): SurgeryReportPDFData {
  const assignment = surgery.coordinatorAssignment
  const coordinator = assignment.status === "resolved" ? assignment.resolved.label : "Sin definir"
  return {
    surgeryNumber: surgery.visibleNumber ?? surgery.id,
    patient: contactName(surgery.patient),
    doctor: contactName(surgery.doctor),
    institution: contactName(surgery.institution),
    payer: contactName(surgery.payer),
    date: formatDate(surgery.surgeryDate ?? surgery.scheduledDate ?? surgery.probableDate),
    status: surgery.cxStatus ?? "Sin definir",
    preparationStatus: surgery.prepStatus ?? "Sin definir",
    coordinator,
    classification: surgery.classification ?? "Sin definir",
    description: surgery.description ?? "Sin definir",
    observations: surgery.notes ?? "",
    generatedAt: formatDate(new Date()),
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    if (!surgeryId) throw notFound("Surgery id is required", "surgery_not_found")
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, SURGERY_REPORT_EMAIL_ROLES)
    const input = parseOutboundEmailInput(await request.json())
    const surgery = await getSurgeryById(prisma, ctx.companyId, surgeryId)
    if (!surgery) throw notFound("Surgery not found", "surgery_not_found")

    const data = reportData(surgery)
    const pdf = await renderToBuffer(React.createElement(SurgeryReportPDFDocument, { data }) as Parameters<typeof renderToBuffer>[0])
    const result = await sendResendEmail({
      to: input.to,
      cc: input.copyMe ? ctx.user.email : undefined,
      subject: input.subject,
      message: input.message,
      idempotencyKey: buildOutboundEmailIdempotencyKey("surgery-report", ctx.companyId, surgery.id, input.idempotencyKey),
      attachments: [{ filename: `reporte-${data.surgeryNumber}.pdf`, content: pdf }],
    })

    let auditRecorded = true
    try {
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Surgery",
        entityId: surgery.id,
        action: "surgery_report_email_accepted",
        module: "surgery",
        metadata: { reportType: "operational_summary", to: input.to, copyTo: input.copyMe ? ctx.user.email : null, provider: result.provider, providerMessageId: result.providerMessageId },
      })
    } catch (auditError) {
      auditRecorded = false
      console.error("[surgery-report.email.POST] Email accepted but audit failed", {
        name: auditError instanceof Error ? auditError.name : "UnknownError",
        code: auditError instanceof ApiError ? auditError.code : "audit_write_failed",
      })
    }
    return ok({ ...result, auditRecorded })
  } catch (error) {
    console.error("[surgery-report.email.POST]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error instanceof ApiError ? error.code : "unhandled_error",
    })
    return errorResponse(error)
  }
}
