import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"

import RemitoPDFDocument, { type RemitoPDFData } from "@/components/remitos/RemitoPDFDocument"
import { createAuditEvent } from "@/lib/audit"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { ApiError, badRequest, notFound } from "@/lib/api/errors"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { getRemitoVisibleNumber } from "@/lib/api/remitos"
import { REMITO_DOCUMENT_THEME } from "@/lib/remito-document-theme"
import { getRemitoActivationGate } from "@/lib/remito-verification/activation"
import { getRemitoVerificationRuntime } from "@/lib/remito-verification/service"
import { buildOutboundEmailIdempotencyKey, parseOutboundEmailInput, sendResendEmail } from "@/lib/outbound-email"
import prisma from "@/lib/prisma"
import { getRemitoPrintCodes } from "@/lib/services/remito-print-code.service"
import { getRemito, REMITO_MUTATION_ROLES } from "@/lib/services/remito.service"

type RouteContext = { params: Promise<{ companyId: string; remitoId: string }> }

let logoDataUrlPromise: Promise<string> | null = null

function getLogoDataUrl() {
  logoDataUrlPromise ??= readFile(path.join(process.cwd(), "public", "logos", REMITO_DOCUMENT_THEME.brand.logoFileName))
    .then((buffer) => `data:image/png;base64,${(buffer as { toString(encoding: "base64"): string }).toString("base64")}`)
  return logoDataUrlPromise
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function date(value: Date | string | null | undefined) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(parsed)
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: "UTC" }).format(parsed)
}

function toPdfData(remito: Awaited<ReturnType<typeof getRemito>>, logoDataUrl: string, qrDataUrl: string): RemitoPDFData {
  const recipient = record(remito.destinatarioSnapshot)
  const address = record(remito.shippingAddressSnapshot)
  const transport = record(remito.transportSnapshot)
  const metadata = record(remito.metadata)
  return {
    documentNumber: getRemitoVisibleNumber(remito),
    state: remito.state,
    origin: remito.origin,
    salidaReason: remito.salidaReason,
    branchLabel: remito.issuedBranchLabel ?? remito.branchLabel ?? "—",
    surgeryLabel: remito.surgeryLabel ?? null,
    surgeryDescription: remito.surgeryDescription ?? null,
    surgeryDate: date(remito.surgeryDate),
    patient: remito.surgeryPatientName ?? null,
    doctor: remito.surgeryDoctorName ?? null,
    institution: remito.surgeryInstitutionName ?? null,
    client: remito.surgeryClientName ?? null,
    issuedAt: date(remito.issuedAt),
    deliveredAt: date(remito.deliveredAt),
    returnedAt: date(remito.returnedAt),
    createdAt: date(remito.createdAt),
    destinatario: {
      nombre: text(recipient.nombre) ?? "Sin destinatario",
      codigo: text(recipient.codigoContacto),
      cuitDni: text(recipient.cuitDni),
    },
    direccion: Object.keys(address).length ? {
      domicilio: text(address.domicilio),
      localidad: text(address.localidad),
      provincia: text(address.provincia),
    } : null,
    transporte: Object.keys(transport).length ? { nombre: text(transport.nombre) } : null,
    packageCount: remito.packageCount,
    declaredValue: remito.declaredValue == null ? null : String(remito.declaredValue),
    items: remito.items.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      returnedQuantity: String(item.returnedQuantity ?? 0),
    })),
    detailItems: remito.detailItems.map((item) => ({
      groupLabel: item.groupLabel,
      sku: item.sku,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      expirationDate: dateOnly(item.expirationDate),
      identifiedCode: item.identifiedCode,
    })),
    observations: text(metadata.observaciones) ?? null,
    qrDataUrl,
    logoDataUrl,
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params
    if (!remitoId) throw notFound("Remito id is required", "remito_not_found")
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES)
    const input = parseOutboundEmailInput(await request.json())
    const remito = await getRemito({ companyId: ctx.companyId, remitoId, prisma })
    if (remito.state === "Borrador") throw badRequest("Emití el remito antes de enviarlo por correo", "remito_email_requires_issued")

    const documentNumber = getRemitoVisibleNumber(remito)
    const runtime = getRemitoVerificationRuntime()
    const [logoDataUrl, activation] = await Promise.all([getLogoDataUrl(), getRemitoActivationGate()])
    const printCodes = await getRemitoPrintCodes({
      prisma: prisma as never,
      keyring: runtime.keyring,
      internalOrigin: runtime.internalOrigin,
      publicOrigin: runtime.publicOrigin,
      activation,
    }, { companyId: ctx.companyId, remitoShortCode: remito.remitoShortCode ?? "", actorId: ctx.actorUserId, role: ctx.role })
    const pdf = await renderToBuffer(React.createElement(RemitoPDFDocument, { data: toPdfData(remito, logoDataUrl, printCodes.publicQrDataUrl) }) as Parameters<typeof renderToBuffer>[0])
    const result = await sendResendEmail({
      to: input.to,
      cc: input.copyMe ? ctx.user.email : undefined,
      subject: input.subject,
      message: input.message,
      idempotencyKey: buildOutboundEmailIdempotencyKey("remito", ctx.companyId, remito.id, input.idempotencyKey),
      attachments: [{ filename: `${documentNumber}.pdf`, content: pdf }],
    })

    let auditRecorded = true
    try {
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Remito",
        entityId: remito.id,
        action: "remito_email_accepted",
        module: "remito",
        metadata: { to: input.to, copyTo: input.copyMe ? ctx.user.email : null, provider: result.provider, providerMessageId: result.providerMessageId },
      })
    } catch (auditError) {
      auditRecorded = false
      console.error("[remito.email.POST] Email accepted but audit failed", {
        name: auditError instanceof Error ? auditError.name : "UnknownError",
        code: auditError instanceof ApiError ? auditError.code : "audit_write_failed",
      })
    }
    return ok({ ...result, auditRecorded })
  } catch (error) {
    console.error("[remito.email.POST]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error instanceof ApiError ? error.code : "unhandled_error",
    })
    return errorResponse(error)
  }
}
