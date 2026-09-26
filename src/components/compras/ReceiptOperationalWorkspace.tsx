"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { receiptOrigin } from "@/app/compras/remitos-proveedor/receipt-flow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api/client"

type Catalog = {
  suppliers: Array<{ contactId: string; contact: { legalName: string | null; firstName: string | null; lastName: string | null } }>
  deposits: Array<{ id: string; name: string }>
  articles: Array<{ article: { id: string; sku: string; description: string }; currentPolicyVersion: { traceMode: string } | null }>
}
type Line = { articleId: string; depositId: string; quantity: string; lotCode: string; expirationDate: string }
export type Receipt = { id: string; status: string; documentReference: string | null; idempotencyKey: string | null; supplierRemittanceId?: string | null }
type SourceRemito = { id: string; number: string }
type SupplierRemittance = { id: string; number: string; goodsReceipt: { id: string; status: string } | null }
type DataState = { companyId: string; catalog: Catalog; receipts: Receipt[]; remittances: SupplierRemittance[] }

const freeReceiptKey = () => `free:${globalThis.crypto.randomUUID()}`

export function ReceiptOperationalWorkspace({ companyId, sourceRemito, initialReceipt }: { companyId: string; sourceRemito?: SourceRemito; initialReceipt?: Receipt }) {
  const companyIdRef = useRef(companyId)
  useEffect(() => { companyIdRef.current = companyId }, [companyId])
  const [dataState, setDataState] = useState<DataState | null>(null)
  const catalog = dataState?.companyId === companyId ? dataState.catalog : null
  const receipts = dataState?.companyId === companyId ? dataState.receipts : []
  const remittances = dataState?.companyId === companyId ? dataState.remittances : []
  const loaded = dataState?.companyId === companyId
  const [supplierId, setSupplierId] = useState("")
  const [reference, setReference] = useState("")
  const [line, setLine] = useState<Line>({ articleId: "", depositId: "", quantity: "1", lotCode: "", expirationDate: "" })
  const [freeKey, setFreeKey] = useState(freeReceiptKey)
  const [saving, setSaving] = useState(false)
  const [selectedRemittanceId, setSelectedRemittanceId] = useState("")
  const [linkingReceiptId, setLinkingReceiptId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const requestedCompanyId = companyId
    const [nextCatalog, nextReceipts, nextRemittances] = await Promise.all([
      apiFetch<Catalog>(`/api/companies/${requestedCompanyId}/goods-receipts?catalog=1`),
      apiFetch<Receipt[]>(`/api/companies/${requestedCompanyId}/goods-receipts`),
      apiFetch<SupplierRemittance[]>(`/api/companies/${requestedCompanyId}/supplier-remittances`),
    ])
    if (companyIdRef.current === requestedCompanyId) setDataState({ companyId: requestedCompanyId, catalog: nextCatalog, receipts: nextReceipts, remittances: nextRemittances })
  }, [companyId])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      apiFetch<Catalog>(`/api/companies/${companyId}/goods-receipts?catalog=1`),
      apiFetch<Receipt[]>(`/api/companies/${companyId}/goods-receipts`),
      apiFetch<SupplierRemittance[]>(`/api/companies/${companyId}/supplier-remittances`),
    ]).then(([nextCatalog, nextReceipts, nextRemittances]) => {
      if (cancelled) return
      setDataState({ companyId, catalog: nextCatalog, receipts: nextReceipts, remittances: nextRemittances })
    }).catch((error) => { if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudieron cargar recepciones") })
    return () => { cancelled = true }
  }, [companyId])

  const selected = catalog?.articles.find((item) => item.article.id === line.articleId)
  const sourceReceipt = initialReceipt ?? (sourceRemito ? receipts.find((receipt) => receipt.supplierRemittanceId === sourceRemito.id) : undefined)
  const sourceReference = sourceRemito?.number ?? sourceReceipt?.documentReference ?? "Remito proveedor"
  const origin = sourceRemito ? "Desde Remito" : "Libre"

  const create = async () => {
    setSaving(true)
    try {
      const receipt = await apiFetch<{ id: string }>(`/api/companies/${companyId}/goods-receipts`, {
        method: "POST",
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          documentReference: reference || undefined,
          idempotencyKey: sourceRemito ? undefined : freeKey,
          supplierRemittanceId: sourceRemito?.id,
          lines: [{ ...line, quantity: Number(line.quantity), lotCode: line.lotCode || undefined, expirationDate: line.expirationDate || undefined }],
        }),
      })
      await apiFetch(`/api/companies/${companyId}/goods-receipts/${receipt.id}/confirm`, { method: "POST" })
      toast.success(sourceReceipt ? "Recepción reabierta sin duplicar" : "Recepción confirmada e ingresada a stock")
      if (!sourceRemito) {
        setReference("")
        setFreeKey(freeReceiptKey())
        setLine({ articleId: "", depositId: "", quantity: "1", lotCode: "", expirationDate: "" })
      }
      try { await load() } catch { toast.warning("La recepción se confirmó, pero no se pudo actualizar la lista") }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la recepción")
    } finally {
      setSaving(false)
    }
  }

  const ready = Boolean(line.articleId && line.depositId && Number(line.quantity) > 0 && (selected?.currentPolicyVersion?.traceMode !== "LOT" || line.lotCode.trim()))
  const compatibleRemittances = remittances.filter((remittance) => !remittance.goodsReceipt)
  const linkReceipt = async (receiptId: string) => {
    if (!selectedRemittanceId) return
    setLinkingReceiptId(receiptId)
    try {
      await apiFetch(`/api/companies/${companyId}/goods-receipts/${receiptId}/supplier-remittance`, {
        method: "POST",
        body: JSON.stringify({ supplierRemittanceId: selectedRemittanceId }),
      })
      toast.success("Recepción vinculada al Remito proveedor")
      setSelectedRemittanceId("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular el Remito proveedor")
    } finally {
      setLinkingReceiptId(null)
    }
  }

  return <div className="space-y-5 p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Origen: {origin}</p>
        <h1 className="text-lg font-semibold text-[var(--ossum-navy)]">Recepción de mercadería</h1>
        <p className="text-sm text-muted-foreground">{sourceRemito ? sourceReference : "Ingreso directo sin Remito proveedor."}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm" variant={sourceRemito ? "outline" : "default"}><Link href="/compras/recepciones">Recepción libre</Link></Button>
        <Button asChild size="sm" variant={sourceRemito ? "default" : "outline"}><Link href="/compras/remitos-proveedor">Desde Remito</Link></Button>
      </div>
    </header>

    {sourceReceipt && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Remito proveedor: {sourceReference} · Recepción vinculada: {sourceReceipt.id} ({sourceReceipt.status}).</p>}

    <section className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-2">
      <div><Label>Proveedor (opcional)</Label><select className="mt-1 h-9 w-full rounded border px-2" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Sin proveedor vinculado</option>{catalog?.suppliers.map((supplier) => <option key={supplier.contactId} value={supplier.contactId}>{supplier.contact.legalName || `${supplier.contact.firstName ?? ""} ${supplier.contact.lastName ?? ""}`}</option>)}</select></div>
      <div><Label>Referencia {sourceRemito ? "del Remito" : "(opcional)"}</Label><Input className="mt-1" value={sourceRemito ? sourceReference : reference} readOnly={Boolean(sourceRemito)} onChange={(event) => setReference(event.target.value)} placeholder="Sin documento" /></div>
      <div><Label>Artículo</Label><select className="mt-1 h-9 w-full rounded border px-2" value={line.articleId} onChange={(event) => setLine({ ...line, articleId: event.target.value, lotCode: "", expirationDate: "" })}><option value="">Seleccionar</option>{catalog?.articles.map((item) => <option key={item.article.id} value={item.article.id}>{item.article.sku} · {item.article.description}</option>)}</select></div>
      <div><Label>Depósito</Label><select className="mt-1 h-9 w-full rounded border px-2" value={line.depositId} onChange={(event) => setLine({ ...line, depositId: event.target.value })}><option value="">Seleccionar</option>{catalog?.deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></div>
      <div><Label>Cantidad</Label><Input className="mt-1" type="number" min="0.0001" value={line.quantity} onChange={(event) => setLine({ ...line, quantity: event.target.value })} /></div>
      {selected?.currentPolicyVersion?.traceMode === "LOT" && <><div><Label>Lote</Label><Input className="mt-1" value={line.lotCode} onChange={(event) => setLine({ ...line, lotCode: event.target.value })} /></div><div><Label>Vencimiento</Label><Input className="mt-1" type="date" value={line.expirationDate} onChange={(event) => setLine({ ...line, expirationDate: event.target.value })} /></div></>}
      <div className="flex items-end"><Button disabled={!ready || saving} onClick={() => void create()}>{saving ? "Confirmando…" : "Confirmar recepción"}</Button></div>
      {!sourceRemito && <p className="text-sm text-muted-foreground">Las recepciones libres se pueden vincular manualmente a un Remito proveedor desde la lista de abajo.</p>}
    </section>

    <section><h2 className="mb-2 text-sm font-semibold">Recepciones recientes</h2><div className="space-y-2">{receipts.map((receipt) => {
      const linkedRemittance = remittances.find((remittance) => remittance.id === receipt.supplierRemittanceId)
      const isFreeReceipt = !receipt.supplierRemittanceId
      return <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"><div><span className="font-medium">{linkedRemittance ? `Remito ${linkedRemittance.number}` : receipt.documentReference || "Sin documento"}</span><span className="ml-2 text-muted-foreground">{receipt.status}</span></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border px-2 py-0.5 text-xs">{receiptOrigin(receipt)}</span>{isFreeReceipt && compatibleRemittances.length > 0 && <><select aria-label={`Remito proveedor para recepción ${receipt.id}`} className="h-8 rounded border px-2" value={selectedRemittanceId} onChange={(event) => setSelectedRemittanceId(event.target.value)}><option value="">Elegir Remito proveedor</option>{compatibleRemittances.map((remittance) => <option key={remittance.id} value={remittance.id}>{remittance.number}</option>)}</select><Button size="sm" variant="outline" disabled={!selectedRemittanceId || linkingReceiptId === receipt.id} onClick={() => void linkReceipt(receipt.id)}>{linkingReceiptId === receipt.id ? "Vinculando…" : "Vincular Remito"}</Button></>}</div></div>
    })}</div></section>
  </div>
}
