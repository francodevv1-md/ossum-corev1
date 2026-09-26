"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useOrtoTrackStore } from "@/lib/store"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { formatDate } from "@/lib/formatters"
import { SearchInput, FilterSelect, StateBadge, SurgeryDrawer } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, CircleAlert, Loader2, PackageCheck, Sparkles, Truck } from "lucide-react"
import { findSupplierReceipt, receiptProgress, supplierReceiptErrorMessage, supplierReceiptPayload, type SupplierReceipt } from "./receipt-flow"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Recibido", label: "Recibido" },
  { value: "Verificado", label: "Verificado" },
  { value: "Anulado", label: "Anulado" },
]

const noUrlSubscription = () => () => undefined
const receptionTabFromUrl = () => new URLSearchParams(window.location.search).get("tab") === "recepciones"

export default function RemitosProveedorPage() {
  const store = useOrtoTrackStore()
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")
  const [selectedTab, setTab] = useState<"remitos" | "recepciones" | null>(null)
  const requestedReceptionTab = React.useSyncExternalStore(noUrlSubscription, receptionTabFromUrl, () => false)
  const tab = selectedTab ?? (requestedReceptionTab ? "recepciones" : "remitos")
  const [receipts, setReceipts] = useState<SupplierReceipt[]>([])
  const [loadingReceipts, setLoadingReceipts] = useState(Boolean(activeCompany))
  const [openingId, setOpeningId] = useState("")
  const [error, setError] = useState("")

  const remitos = store.remitosProveedor
  const proveedores = store.proveedores.filter((p) => p.active)

  const provFilterOptions = useMemo(
    () => [
      { value: "", label: "Todos los proveedores" },
      ...proveedores.map((p) => ({ value: p.id, label: p.name })),
    ],
    [proveedores]
  )

  const filtered = useMemo(() => {
    let data = remitos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.proveedorName.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((r) => r.state === stateFilter)
    if (provFilter) data = data.filter((r) => r.proveedorId === provFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [remitos, search, stateFilter, provFilter])

  useEffect(() => {
    if (!activeCompany) return
    let cancelled = false
    void apiFetch<SupplierReceipt[]>(`/api/companies/${encodeURIComponent(activeCompany.id)}/receipts`)
      .then((rows) => { if (!cancelled) setReceipts(rows) })
      .catch((cause) => { if (!cancelled) setError(supplierReceiptErrorMessage(cause, "No se pudo cargar la cola de recepción")) })
      .finally(() => { if (!cancelled) setLoadingReceipts(false) })
    return () => { cancelled = true }
  }, [activeCompany])

  const receiptRows = useMemo(() => remitos.map((remito) => {
    const receipt = findSupplierReceipt(receipts, remito)
    return { remito, receipt, progress: receiptProgress(receipt) }
  }), [receipts, remitos])
  const receiptRowByRemitoId = useMemo(() => new Map(receiptRows.map((row) => [row.remito.id, row])), [receiptRows])
  const receptionQueue = useMemo(() => receiptRows.filter(({ progress }) => progress.label !== "Confirmada"), [receiptRows])

  const openReceipt = async (remito: typeof remitos[number]) => {
    if (!activeCompany) return
    setOpeningId(remito.id); setError("")
    try {
      const existing = findSupplierReceipt(receipts, remito)
      if (!existing) {
        const created = await apiFetch<SupplierReceipt>(`/api/companies/${encodeURIComponent(activeCompany.id)}/receipts`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplierReceiptPayload(remito)),
        })
        setReceipts((current) => [created, ...current])
      }
      router.push(`/compras/remitos-proveedor/${encodeURIComponent(remito.id)}/recepcion`)
    } catch (cause) {
      setError(supplierReceiptErrorMessage(cause, "No se pudo iniciar la recepción"))
    } finally { setOpeningId("") }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ossum-action)]">Compras · ingreso físico</p>
          <h1 className="text-xl font-bold text-[#071935]">Remitos de Proveedor</h1>
          <p className="text-sm text-muted-foreground">Cargá el documento una vez y continuá acá con la recepción física.</p>
        </div>
        <Button onClick={() => router.push("/compras/remitos-proveedor/nuevo")} className="gap-2">
          <Sparkles className="size-4" />
          Cargar comprobante
        </Button>
      </div>

      <div className="flex gap-1 border-b border-[var(--ossum-line)]" role="tablist" aria-label="Remitos de proveedor">
        <Button role="tab" aria-selected={tab === "remitos"} variant="ghost" className={tab === "remitos" ? "border-b-2 border-[#1D2FC0] text-[#071935]" : "text-muted-foreground"} onClick={() => setTab("remitos")}><Truck className="mr-2 size-4" />Remitos cargados</Button>
        <Button role="tab" aria-selected={tab === "recepciones"} variant="ghost" className={tab === "recepciones" ? "border-b-2 border-[#1D2FC0] text-[#071935]" : "text-muted-foreground"} onClick={() => setTab("recepciones")}><PackageCheck className="mr-2 size-4" />Cola de recepción</Button>
      </div>

      <nav aria-label="Proceso de ingreso" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><button type="button" className="font-medium hover:text-[#071935]" onClick={() => setTab("remitos")}>1. Remito proveedor</button><span aria-hidden="true">→</span><button type="button" className="font-medium hover:text-[#071935]" onClick={() => setTab("recepciones")}>2. Recepción física</button></nav>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {tab === "remitos" && <><Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Número, proveedor..."
              className="w-full sm:w-72"
            />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={provFilter} onChange={setProvFilter} options={provFilterOptions} />
            {(stateFilter || provFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  setSearch("")
                  setStateFilter("")
                  setProvFilter("")
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">
              {filtered.length} remito{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Número</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                   <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                   <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Recepción</th>
                   <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const receiptState = receiptRowByRemitoId.get(r.id)?.progress
                  return <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs font-medium">{r.number}</td>
                    <td className="px-3 py-2.5">{r.proveedorName}</td>
                    <td className="px-3 py-2.5 text-right">{r.items.length}</td>
                    <td className="px-3 py-2.5"><StateBadge status={r.state} /></td>
                    <td className="px-3 py-2.5"><span className="inline-flex rounded-full border bg-white px-2 py-1 text-xs font-medium text-[#071935]">{receiptState?.label ?? "Pendiente de recepción"}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.ordenCompraId || "—"}</td>
                  </tr>
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron remitos de proveedor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card></>}

      {tab === "recepciones" && <Card className="overflow-hidden border-[var(--ossum-line)]">
        <div className="border-b bg-[#071935] px-4 py-4 text-white"><h2 className="font-semibold">Cola de recepción física</h2><p className="mt-1 text-sm text-white/70">Esperado contra recibido, sin volver a cargar número ni PDF.</p></div>
        <CardContent className="p-0">
          {loadingReceipts ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando recepciones…</div> : receptionQueue.map(({ remito, receipt, progress }) => {
            const tone = progress.tone === "red" ? "border-red-200 bg-red-50 text-red-800" : progress.tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : progress.tone === "navy" ? "border-blue-200 bg-blue-50 text-[#071935]" : "border-amber-200 bg-amber-50 text-amber-800"
            return <div key={remito.id} className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
              <div><div className="font-semibold text-[#071935]">{remito.number}</div><div className="text-sm text-muted-foreground">{remito.proveedorName} · {remito.items.length} artículo(s)</div></div>
              <div className="space-y-1"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>{progress.tone === "red" && <CircleAlert className="size-3" />}{progress.label}</span><p className="text-xs text-muted-foreground">Esperado {progress.expected || remito.items.reduce((sum, item) => sum + item.quantity, 0)} · Recibido {progress.received}</p>{progress.received > 0 && (progress.shortages > 0 || progress.excesses > 0) && <p className="text-xs font-medium text-amber-800">Faltantes {progress.shortages} · Excedentes {progress.excesses}</p>}{(progress.unresolved > 0 || progress.unmatched > 0) && <p className="text-xs font-medium text-red-700">Incongruencias {progress.unresolved} · Artículos por identificar {progress.unmatched}</p>}</div>
              <Button onClick={() => void openReceipt(remito)} disabled={!activeCompany || openingId === remito.id} className="bg-[#1D2FC0] hover:bg-[#1830a8]">{openingId === remito.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}{receipt ? "Abrir recepción" : "Iniciar recepción"}</Button>
            </div>
          })}{!loadingReceipts && receptionQueue.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No hay remitos pendientes ni recepciones con diferencias.</div>}
        </CardContent>
      </Card>}

      <SurgeryDrawer />
    </div>
  )
}
