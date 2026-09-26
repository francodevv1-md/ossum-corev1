import QRCode from "qrcode"
import { notFound } from "@/lib/api/errors"
import { renderCode128BSvg } from "@/lib/code128"
import { normalizeRemitoLocator } from "@/lib/remito-identifiers"
import {
  deriveRemitoPublicToken,
  timingSafeRemitoTokenHashMatches,
  type RemitoTokenKeyring,
} from "@/lib/remito-verification/token"
import { REMITO_READ_ROLES } from "@/lib/services/remito.service"
import type { RemitoPrintCodesDto } from "@/lib/api/remito-print-codes"
import type { RemitoActivationGate } from "@/lib/remito-verification/activation"

type PrintRow = {
  locator: string
  remitoId: string
  remito: {
    state: string
    issuedAt: Date | null
    verificationPublications: Array<{
      status: string
      currentSlot: number | null
      accesses: Array<{
        status: string
        currentSlot: number | null
        tokenNonce: string
        tokenKeyVersion: number
        tokenHash: string
      }>
    }>
  }
}

type PrintCodeDb = {
  remitoScanLocator: { findFirst(input: unknown): Promise<PrintRow | null> }
  auditEvent: { create(input: unknown): Promise<unknown> }
}

export type RemitoPrintCodeDependencies = {
  prisma: PrintCodeDb & { $transaction<T>(callback: (tx: PrintCodeDb) => Promise<T>): Promise<T> }
  keyring: RemitoTokenKeyring
  internalOrigin: URL
  publicOrigin: URL
  activation: RemitoActivationGate
}

const unavailable = () => notFound("Remito print codes unavailable", "remito_print_codes_unavailable")

function requireHttpsOrigin(value: URL, field: string): URL {
  if (!(value instanceof URL) || value.protocol !== "https:" || value.origin === "null"
    || value.username || value.password || value.pathname !== "/" || value.search || value.hash) {
    throw new Error(`${field} must be an absolute HTTPS origin-only URL`)
  }
  return value
}

export async function getRemitoPrintCodes(
  deps: RemitoPrintCodeDependencies,
  input: { companyId: string; remitoShortCode: string; actorId: string; role: string },
): Promise<RemitoPrintCodesDto> {
  if (!(REMITO_READ_ROLES as readonly string[]).includes(input.role)
    || !deps.activation?.flags.remitoPrintCodes) throw unavailable()
  const locator = normalizeRemitoLocator(input.remitoShortCode)
  if (!locator) throw unavailable()
  const internalOrigin = requireHttpsOrigin(deps.internalOrigin, "internalOrigin")
  const publicOrigin = requireHttpsOrigin(deps.publicOrigin, "publicOrigin")
  if (!deps.keyring?.keys) throw new Error("Remito print token keyring is not configured")

  return deps.prisma.$transaction(async (tx) => {
    const row = await tx.remitoScanLocator.findFirst({
      where: { companyId: input.companyId, locator },
      select: {
        locator: true,
        remitoId: true,
        remito: { select: {
          state: true,
          issuedAt: true,
          verificationPublications: {
            where: { status: "current", currentSlot: 1 },
            take: 1,
            select: { status: true, currentSlot: true, accesses: {
              where: { status: "current", currentSlot: 1 },
              take: 1,
              select: { status: true, currentSlot: true, tokenNonce: true, tokenKeyVersion: true, tokenHash: true },
            } },
          },
        } },
      },
    })
    const publication = row?.remito.verificationPublications[0]
    const access = publication?.accesses[0]
    if (!row || !row.remito.issuedAt || row.remito.state === "Borrador"
      || !deps.activation.isCompanyDateEligible(input.companyId, row.remito.issuedAt)
      || publication?.status !== "current" || publication.currentSlot !== 1
      || access?.status !== "current" || access.currentSlot !== 1) throw unavailable()

    const token = deriveRemitoPublicToken(deps.keyring, access.tokenKeyVersion, access.tokenNonce)
    if (!timingSafeRemitoTokenHashMatches(token, access.tokenHash)) throw unavailable()
    const internalUrl = new URL(`/remitos/scan/${encodeURIComponent(row.locator)}`, internalOrigin).href
    const publicUrl = new URL(`/verificar/remito/${encodeURIComponent(token)}`, publicOrigin).href
    const [internalQrDataUrl, publicQrDataUrl] = await Promise.all([
      QRCode.toDataURL(internalUrl, { errorCorrectionLevel: "M", margin: 4 }),
      QRCode.toDataURL(publicUrl, { errorCorrectionLevel: "M", margin: 4 }),
    ])
    const dto: RemitoPrintCodesDto = {
      remitoShortCode: row.locator,
      internalQrDataUrl,
      publicQrDataUrl,
      code128Svg: renderCode128BSvg(row.locator),
      labels: { internal: "Internal OSSUM access", public: "Public verification" },
    }
    await tx.auditEvent.create({ data: {
      companyId: input.companyId,
      userId: input.actorId,
      entityType: "Remito",
      entityId: row.remitoId,
      action: "remito.print_codes_distributed",
      module: "remito",
    } })
    return dto
  })
}
