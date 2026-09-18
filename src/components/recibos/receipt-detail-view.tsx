"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Download, Eye, Link2, RefreshCcw, ShieldCheck, StopCircle } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ReceiptSignerBadge, ReceiptStatusBadge } from "@/components/recibos/receipt-status"
import { ReceiptVoucherCard } from "@/components/recibos/receipt-voucher-card"
import { StatsCard } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api/client"
import {
  getInternalDigitalReceiptDetail,
  issueInternalDigitalReceipt,
  reissueInternalDigitalReceiptAccess,
  revokeInternalDigitalReceipt,
  revokeInternalDigitalReceiptAccess,
} from "@/lib/digital-receipts/client"
import {
  clearDigitalReceiptPublicPreviewToken,
  resolveDigitalReceiptPublicPreviewState,
  storeDigitalReceiptPublicPreviewToken,
} from "@/lib/digital-receipts/public-preview-session"
import { formatCurrency } from "@/lib/formatters"
import {
  buildReceiptFlowQuery,
  getReceiptFlowContextItems,
  getReceiptFlowSourceLabel,
  mapDigitalReceiptToViewModel,
  resolveActorLabel,
  type ReceiptFlowContext,
} from "@/lib/digital-receipts/ui"

export function ReceiptDetailView({ receiptId, context }: { receiptId: string; context?: ReceiptFlowContext }) {
  const { activeCompany, currentUserLoading, isLoading } = useAuth()
  const { toast } = useToast()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getInternalDigitalReceiptDetail>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await getInternalDigitalReceiptDetail(activeCompany.id, receiptId)
      setDetail(data)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo cargar el detalle interno.")
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, receiptId])

  useEffect(() => {
    if (isLoading || currentUserLoading) return
    if (!activeCompany?.id) {
      setLoading(false)
      setError("No hay compañía activa para consultar el detalle interno.")
      return
    }
    void loadDetail()
  }, [activeCompany?.id, currentUserLoading, isLoading, loadDetail])

  const receipt = useMemo(() => (detail ? mapDigitalReceiptToViewModel(detail) : null), [detail])
  const queryString = buildReceiptFlowQuery(context)
  const artifactUrl = activeCompany?.id ? `/api/companies/${activeCompany.id}/digital-receipts/${receiptId}/artifact` : undefined
  const contextItems = getReceiptFlowContextItems(context)
  const sourceLabel = getReceiptFlowSourceLabel(context)

  const runAction = useCallback(
    async (key: string, handler: () => Promise<void>) => {
      setActionLoading(key)
      try {
        await handler()
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Acción no disponible",
          description: err instanceof ApiClientError ? err.message : "No se pudo completar la acción interna.",
        })
      } finally {
        setActionLoading(null)
      }
    },
    [toast]
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error || !detail || !receipt) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>No se pudo abrir el recibo</AlertTitle>
        <AlertDescription>{error ?? "El recibo interno no existe o no está disponible."}</AlertDescription>
      </Alert>
    )
  }

  const activeAccess = detail.accesses.find((access) => access.accessId === detail.receipt.activeAccessId)
  const publicPreviewState = resolveDigitalReceiptPublicPreviewState({
    receiptId,
    accessId: activeAccess?.accessId,
    tokenLastFour: activeAccess?.tokenLastFour,
    context,
  })
  const canOpenPublicPreview = publicPreviewState.status === "available"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ReceiptStatusBadge status={receipt.status} />
              <ReceiptSignerBadge role={receipt.signerRole} />
            </div>
            {contextItems.length > 0 && <p className="mt-3 text-xs font-medium text-slate-500">{sourceLabel} · {contextItems.join(" · ")}</p>}
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{receipt.receiptNumber}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Gestión interna conectada al backend real. La descarga ahora expone un artifact PDF generado desde el estado persistido del recibo.
              </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/ventas/recibos${queryString}`}>
                <ArrowLeft className="size-4" />
                Volver
              </Link>
            </Button>
            {canOpenPublicPreview ? (
              <Button variant="outline" asChild>
                <a href={publicPreviewState.href ?? undefined} target="_blank" rel="noreferrer">
                  <Eye className="size-4" />
                  Abrir preview pública
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Eye className="size-4" />
                Preview pública no disponible
              </Button>
            )}
            {artifactUrl ? (
              <Button asChild>
                <a href={artifactUrl}>
                  <Download className="size-4" />
                  {detail.receipt.status === "signed" ? "Descargar constancia PDF firmada" : "Descargar comprobante PDF"}
                </a>
              </Button>
            ) : (
              <Button disabled>
                <Download className="size-4" />
                Descargar comprobante PDF
              </Button>
            )}
          </div>
        </div>

        {contextItems.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-950">Entrada contextual:</span> {contextItems.join(" · ")}
          </div>
        )}

        <div className={`rounded-2xl px-4 py-3 text-sm ${canOpenPublicPreview ? "border border-emerald-200 bg-emerald-50/80 text-emerald-950" : publicPreviewState.status === "reissue_required" ? "border border-amber-200 bg-amber-50/80 text-amber-950" : "border border-slate-200 bg-slate-50/80 text-slate-700"}`}>
          <p className="font-medium">{publicPreviewState.label}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{publicPreviewState.detail}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Importe" value={formatCurrency(receipt.amount)} icon={ShieldCheck} />
          <StatsCard title="Visualizaciones" value={receipt.viewedCount} icon={Eye} />
          <StatsCard title="Link expira" value={`${receipt.expiresInHours} h`} icon={Clock3} />
          <StatsCard title="Canal" value={receipt.shareChannel} icon={Link2} />
        </div>
      </div>

      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="firma">Firma y acceso</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría interna</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <ReceiptVoucherCard receipt={receipt} />
        </TabsContent>

        <TabsContent value="firma" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardContent className="space-y-4 p-5">
                <PanelTitle title="Control de firma" subtitle="Estado real del recibo interno" />
                <DetailLine label="Firmante habilitado" value={receipt.signer.name} />
                <DetailLine label="Rol" value={receipt.signer.relationLabel} />
                <DetailLine label="DNI requerido" value={receipt.signer.document} />
                <DetailLine label="Token activo" value={receipt.activeAccessTokenLastFour ? `****${receipt.activeAccessTokenLastFour}` : "Sin acceso activo"} />
                <DetailLine label="Preview pública" value={publicPreviewState.status === "available" ? "Real y disponible en este navegador" : publicPreviewState.status === "reissue_required" ? "Reemitir acceso en este navegador" : "Emitir acceso para habilitarla"} />
                <DetailLine label="Descarga disponible" value={detail.receipt.status === "signed" ? "Constancia PDF firmada" : "Comprobante PDF actual"} />
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  El artifact se genera on-demand desde snapshot, metadata y evidencia persistida. Si hace falta el fallback previo, la misma ruta soporta <code>?format=html</code>. La preview pública deja de ser una referencia y pasa a ser real cuando este navegador conserva el token vigente del acceso activo.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <PanelTitle title="Acciones internas" subtitle="Mutaciones reales del sprint" />

                {receipt.rawStatus === "draft" && (
                  <ActionButton
                    icon={<Link2 className="size-4" />}
                    title="Emitir link interno"
                    cta="Emitir"
                    loading={actionLoading === "issue"}
                    onClick={() =>
                      runAction("issue", async () => {
                        const signer = detail.receipt.signers.find((candidate) => candidate.role === detail.receipt.currentSignerRole)
                        const result = await issueInternalDigitalReceipt(activeCompany!.id, detail.receipt.receiptId, {
                          signerRole: detail.receipt.currentSignerRole,
                          signerId: signer?.signerId,
                        })
                        storeDigitalReceiptPublicPreviewToken({
                          receiptId: result.detail.receipt.receiptId,
                          accessId: result.access.accessId,
                          token: result.accessToken,
                          tokenLastFour: result.access.tokenLastFour,
                        })
                        setDetail(result.detail)
                        toast({
                          title: "Recibo emitido",
                          description: `Acceso interno generado. Token real: ****${result.access.tokenLastFour ?? "----"}. Preview pública habilitada en este navegador.`,
                        })
                      })
                    }
                  />
                )}

                {receipt.rawStatus === "issued" && (
                  <>
                    <ActionButton
                      icon={<RefreshCcw className="size-4" />}
                      title="Reemitir acceso"
                      cta="Reemitir"
                      loading={actionLoading === "reissue"}
                      onClick={() =>
                        runAction("reissue", async () => {
                          const signer = detail.receipt.signers.find((candidate) => candidate.role === detail.receipt.currentSignerRole)
                          const result = await reissueInternalDigitalReceiptAccess(activeCompany!.id, detail.receipt.receiptId, {
                            signerRole: detail.receipt.currentSignerRole,
                            signerId: signer?.signerId,
                          })
                          storeDigitalReceiptPublicPreviewToken({
                            receiptId: result.detail.receipt.receiptId,
                            accessId: result.access.accessId,
                            token: result.accessToken,
                            tokenLastFour: result.access.tokenLastFour,
                          })
                          setDetail(result.detail)
                          toast({
                            title: "Acceso reemitido",
                            description: `Se creó un nuevo acceso activo. Token real: ****${result.access.tokenLastFour ?? "----"}. Preview pública habilitada en este navegador.`,
                          })
                        })
                      }
                    />

                    <ActionButton
                      icon={<StopCircle className="size-4" />}
                      title="Revocar acceso activo"
                      cta="Revocar acceso"
                      loading={actionLoading === "revoke-access"}
                      disabled={!activeAccess}
                      onClick={() =>
                        runAction("revoke-access", async () => {
                          if (!activeAccess) return
                          const result = await revokeInternalDigitalReceiptAccess(
                            activeCompany!.id,
                            detail.receipt.receiptId,
                            activeAccess.accessId,
                            "revoked_from_internal_ui"
                          )
                          clearDigitalReceiptPublicPreviewToken(detail.receipt.receiptId)
                          setDetail(result)
                          toast({ title: "Acceso revocado", description: "El acceso activo quedó revocado desde la UI interna." })
                        })
                      }
                    />
                  </>
                )}

                {(receipt.rawStatus === "draft" || receipt.rawStatus === "issued") && (
                  <ActionButton
                    icon={<StopCircle className="size-4" />}
                    title="Revocar recibo"
                    cta="Revocar recibo"
                    loading={actionLoading === "revoke-receipt"}
                    onClick={() =>
                      runAction("revoke-receipt", async () => {
                        const result = await revokeInternalDigitalReceipt(activeCompany!.id, detail.receipt.receiptId, "revoked_from_internal_ui")
                        clearDigitalReceiptPublicPreviewToken(detail.receipt.receiptId)
                        setDetail(result)
                        toast({ title: "Recibo revocado", description: "El recibo quedó revocado a nivel backend." })
                      })
                    }
                  />
                )}

                {receipt.rawStatus !== "draft" && receipt.rawStatus !== "issued" && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                    No hay más mutaciones habilitadas para el estado actual ({receipt.rawStatus}).
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardContent className="space-y-4 p-5">
                <PanelTitle title="Timeline interno" subtitle="Eventos persistidos por backend" />
                <div className="space-y-3">
                  {receipt.events.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-950">{event.label}</p>
                          <span className="text-xs text-slate-400">{event.at}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <PanelTitle title="Lectura operativa" subtitle="Señales del agregado interno" />
                <DetailLine label="Estado backend" value={detail.receipt.status} />
                <DetailLine label="Acceso activo" value={activeAccess?.status ?? "sin acceso"} />
                <DetailLine label="Actor emisor" value={resolveActorLabel(detail.receipt.issuedBy)} />
                <DetailLine label="Artefactos" value={`${detail.artifacts.length} registrado(s)`} />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  La salida descargable final ahora entrega PDF real mínimo desde backend. Se conserva fallback HTML opcional por query para contingencia operativa.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-slate-950">{value}</span>
    </div>
  )
}

function ActionButton({
  icon,
  title,
  cta,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ReactNode
  title: string
  cta: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">{icon}</div>
        <p className="text-sm font-medium text-slate-950">{title}</p>
      </div>
      <Button variant="outline" onClick={onClick} disabled={disabled || loading}>
        {loading ? "Procesando..." : cta}
      </Button>
    </div>
  )
}
