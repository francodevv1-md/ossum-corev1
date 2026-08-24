"use client"

import { useCallback, useEffect, useState } from "react"
import { ClipboardCheck, Plus, RotateCw } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api/client"

type PreparationLine = { id: string; articleId: string; requestedQuantity: string; preparedQuantity: string; stockUnit: string }
type Preparation = { id: string; status: string; lines: PreparationLine[] }

export function PreparationOperationalWorkspace({ surgeryId }: { surgeryId: string }) {
  const { activeCompany } = useAuth()
  const [preparation, setPreparation] = useState<Preparation | null>(null)
  const [articleId, setArticleId] = useState("")
  const [requestedQuantity, setRequestedQuantity] = useState("1")
  const [positionIds, setPositionIds] = useState<Record<string, string>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = activeCompany ? `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(surgeryId)}/preparation` : ""
  const load = useCallback(async () => {
    if (!base) return
    setLoading(true); setError(null)
    try { setPreparation(await apiFetch<Preparation>(base)) } catch (e) { setPreparation(null); const message = e instanceof Error ? e.message : "No se pudo cargar la preparación"; if (!message.toLowerCase().includes("not found")) setError(message) } finally { setLoading(false) }
  }, [base])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const create = async () => {
    if (!base || !articleId.trim()) return
    setLoading(true); setError(null)
    try { setPreparation(await apiFetch<Preparation>(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: [{ articleId, requestedQuantity, stockUnit: "u" }] }) })) } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la preparación") } finally { setLoading(false) }
  }

  const reserve = async (line: PreparationLine) => {
    if (!base || !preparation) return
    const positionId = positionIds[line.id]?.trim()
    if (!positionId) { setError("Ingresá una posición de stock para reservar."); return }
    setLoading(true); setError(null)
    try { await apiFetch(`${base}/reserve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preparationId: preparation.id, lineId: line.id, positionId, quantity: quantities[line.id] || "1", idempotencyKey: `${preparation.id}:${line.id}:${positionId}:${quantities[line.id] || "1"}` }) }); await load() } catch (e) { setError(e instanceof Error ? e.message : "No se pudo reservar el stock") } finally { setLoading(false) }
  }

  return <main className="min-h-[calc(100vh-4rem)] bg-[var(--ossum-bg)] px-4 py-6 md:px-8"><div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ossum-line)] pb-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ossum-action)]">Stock · preparación</p><h1 className="mt-1 text-2xl font-semibold text-gray-900">Preparación de cirugía</h1><p className="mt-1 text-sm text-gray-500">Cirugía <span className="font-mono">{surgeryId}</span> · preparación parcial y retomable</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RotateCw className="mr-2 size-4" />Actualizar</Button></header>
    {!activeCompany && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Seleccioná una empresa para operar stock.</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!preparation ? <Card><CardHeader><CardTitle className="text-base">Nueva preparación</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"><div><Label htmlFor="preparation-article">ID de artículo</Label><Input id="preparation-article" value={articleId} onChange={(e) => setArticleId(e.target.value)} placeholder="Artículo elegible" /></div><div><Label htmlFor="preparation-quantity">Cantidad</Label><Input id="preparation-quantity" value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} inputMode="decimal" /></div><Button className="self-end" onClick={create} disabled={loading || !articleId.trim()}><Plus className="mr-2 size-4" />Crear</Button></CardContent></Card> : <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Preparación <span data-testid="preparation-id">{preparation.id}</span></CardTitle><Badge variant="secondary">{preparation.status}</Badge></CardHeader><CardContent className="space-y-4"><div className="overflow-x-auto rounded-md border border-[var(--ossum-line)]"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Artículo</th><th className="px-3 py-2">Solicitado</th><th className="px-3 py-2">Preparado</th><th className="px-3 py-2">Posición / cantidad</th><th className="px-3 py-2" /></tr></thead><tbody>{preparation.lines.map((line) => { const requested = Number(line.requestedQuantity); const prepared = Number(line.preparedQuantity); const progress = requested > 0 ? Math.min(100, prepared / requested * 100) : 0; return <tr key={line.id} className="border-t border-[var(--ossum-line)] align-top"><td className="px-3 py-3 font-mono text-xs">{line.articleId}</td><td className="px-3 py-3">{line.requestedQuantity} {line.stockUnit}</td><td className="px-3 py-3"><div>{line.preparedQuantity} {line.stockUnit}</div><div className="mt-1 h-1.5 w-24 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-[var(--ossum-action)]" style={{ width: `${progress}%` }} /></div></td><td className="px-3 py-3"><div className="flex gap-2"><Input aria-label={`Posición para ${line.articleId}`} value={positionIds[line.id] ?? ""} onChange={(e) => setPositionIds({ ...positionIds, [line.id]: e.target.value })} placeholder="positionId" className="h-8 w-36" /><Input aria-label={`Cantidad para ${line.articleId}`} value={quantities[line.id] ?? "1"} onChange={(e) => setQuantities({ ...quantities, [line.id]: e.target.value })} inputMode="decimal" className="h-8 w-20" /></div></td><td className="px-3 py-3"><Button size="sm" onClick={() => void reserve(line)} disabled={loading}><ClipboardCheck className="mr-1 size-4" />Reservar</Button></td></tr> })}</tbody></table></div>{preparation.lines.length === 0 && <p className="text-sm text-gray-500">No hay líneas solicitadas.</p>}</CardContent></Card>}
  </div></main>
}
