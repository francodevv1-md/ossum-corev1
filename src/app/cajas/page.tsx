"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Database, Plus, RefreshCw, Search, SearchX, X, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import { BoxSkuDetail } from "@/components/boxes/BoxSkuDetail"
import { BoxesOperationalIndex } from "@/components/boxes/BoxesOperationalIndex"
import { PhysicalUnitDetail } from "@/components/boxes/PhysicalUnitDetail"
import {
  type BoxPresentationEvidence,
  type BoxPresentationSku,
  type BoxPresentationUnit,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

// ─── Types ─────────────────────────────────────────────────

type BoxFormula = {
  id: string
  sku: string
  description: string
  brand?: string | null
  manufacturer?: string | null
  family?: string | null
  version: number
  lineCount: number
  lines: Array<{ lineNumber: number; articleId: string; sku: string; description: string; expectedQuantity: number; stockUnit: string }>
  createdAt: string
  updatedAt: string
}

type ArticleOption = { id: string; sku: string; description: string; unit: string }
type Tab = "catalogo" | "operacion"

function boxCode(): string {
  return `BOX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

// ─── New box dialog ────────────────────────────────────────

function NewBoxDialog({ open, onOpenChange, companyId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; companyId?: string; onCreated?: () => void }) {
  const [sku, setSku] = useState(() => boxCode())
  const [description, setDescription] = useState("")
  const [brand, setBrand] = useState("")
  const [manufacturer, setManufacturer] = useState("")
  const [family, setFamily] = useState("")
  const [articles, setArticles] = useState<ArticleOption[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [lines, setLines] = useState<Array<{ articleId: string; expectedQuantity: string; stockUnit: string }>>([{ articleId: "", expectedQuantity: "1", stockUnit: "u" }])
  const [saving, setSaving] = useState(false)

  const loadArticles = useCallback(async () => {
    if (!companyId) return
    setArticlesLoading(true)
    setArticlesError(null)
    try {
      setArticles(await apiFetch<ArticleOption[]>(`/api/companies/${encodeURIComponent(companyId)}/articles?take=100`))
    } catch (cause) {
      setArticles([])
      setArticlesError(cause instanceof Error ? cause.message : "No se pudieron cargar los artículos")
    } finally {
      setArticlesLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!open || !companyId) return
    let active = true
    queueMicrotask(() => { if (active) void loadArticles() })
    return () => { active = false }
  }, [open, companyId, loadArticles])

  const addLine = () => setLines((prev) => [...prev, { articleId: "", expectedQuantity: "1", stockUnit: "u" }])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))
  const updateLine = (index: number, field: "articleId" | "expectedQuantity" | "stockUnit", value: string) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)))

  const save = async () => {
    if (!companyId) return toast.error("No hay una empresa activa")
    if (!description.trim()) return toast.error("La descripción es obligatoria")
    const validLines = lines.filter((l) => l.articleId && Number(l.expectedQuantity) > 0)
    if (validLines.length === 0) return toast.error("Agregá al menos un componente")
    setSaving(true)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/cajas`, {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          sku: sku.trim() || undefined,
          brand: brand || undefined,
          manufacturer: manufacturer || undefined,
          family: family || undefined,
          lines: validLines.map((l) => ({ articleId: l.articleId, expectedQuantity: Number(l.expectedQuantity), stockUnit: l.stockUnit })),
        }),
      })
      onOpenChange(false)
      onCreated?.()
      toast.success("Modelo de caja creado")
      setSku(boxCode())
      setDescription("")
      setBrand("")
      setManufacturer("")
      setFamily("")
      setLines([{ articleId: "", expectedQuantity: "1", stockUnit: "u" }])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el modelo de caja")
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[var(--ossum-line)] px-6 py-4">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">Nuevo modelo de caja</DialogTitle>
          <DialogDescription className="text-xs">Definí cómo se identifica y qué contenido debe incluir.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[66vh] space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Identificación</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="box-model-sku" className="text-[11px] text-gray-500">Código (SKU)</Label>
                <Input id="box-model-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="BOX-..." className="h-8 font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="box-model-description" className="text-[11px] text-gray-500">Descripción</Label>
                <Input id="box-model-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Caja de tornillos 3.5mm" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="box-model-brand" className="text-[11px] text-gray-500">Marca</Label>
                <Input id="box-model-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="DePuy Synthes" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="box-model-manufacturer" className="text-[11px] text-gray-500">Fabricante</Label>
                <Input id="box-model-manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="DePuy Synthes" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="box-model-family" className="text-[11px] text-gray-500">Familia / Patología</Label>
                <Input id="box-model-family" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="Trauma" className="h-8 text-xs" />
              </div>
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Contenido esperado</h3>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addLine}>Agregar componente</Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_80px_60px_32px]">
                  <select
                    aria-label={`Artículo ${index + 1}`}
                    className={selectClass}
                    value={line.articleId}
                    onChange={(e) => updateLine(index, "articleId", e.target.value)}
                  >
                    <option value="">Seleccionar artículo…</option>
                    {articles.map((a) => <option key={a.id} value={a.id}>{a.sku} — {a.description}</option>)}
                  </select>
                  <Input
                    aria-label={`Cantidad ${index + 1}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.expectedQuantity}
                    onChange={(e) => updateLine(index, "expectedQuantity", e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    aria-label={`Unidad ${index + 1}`}
                    value={line.stockUnit}
                    onChange={(e) => updateLine(index, "stockUnit", e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-gray-400" aria-label={`Quitar ${index + 1}`} onClick={() => removeLine(index)} disabled={lines.length === 1}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              {articlesLoading ? <p className="text-[11px] text-gray-400" role="status">Cargando artículos…</p> : articlesError ? <div className="flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700" role="alert"><span>{articlesError}</span><Button type="button" variant="outline" size="sm" className="h-7 bg-white text-[11px]" onClick={() => void loadArticles()}>Reintentar</Button></div> : articles.length === 0 ? <p className="text-[11px] text-gray-400">No hay artículos disponibles. Creá artículos primero en Stock.</p> : null}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-[var(--ossum-line)] px-6 py-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={saving} className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={save}>{saving ? "Guardando…" : "Guardar modelo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Catalog tab ───────────────────────────────────────────

function CatalogTab({ companyId }: { companyId?: string }) {
  const [boxes, setBoxes] = useState<BoxFormula[]>([])
  const [search, setSearch] = useState("")
  const [newOpen, setNewOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef(0)

  const loadBoxes = useCallback(async () => {
    const requestId = ++requestRef.current
    if (!companyId) {
      setBoxes([])
      setLoading(false)
      return
    }
    setBoxes([])
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<BoxFormula[]>(`/api/companies/${encodeURIComponent(companyId)}/cajas?take=100`)
      if (requestId === requestRef.current) setBoxes(result)
    } catch (cause) {
      if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los modelos de caja")
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void loadBoxes() })
    return () => { active = false; requestRef.current += 1 }
  }, [loadBoxes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return boxes
    return boxes.filter((b) => b.sku.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || (b.brand ?? "").toLowerCase().includes(q))
  }, [boxes, search])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--ossum-surface)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar modelos de caja" placeholder="Buscar código, modelo o marca…" className="h-8 pl-8 text-xs" />
          {search && <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="size-3" /></button>}
        </div>
        {search && <button type="button" onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600">Limpiar filtros</button>}
        <Button size="sm" className="ml-auto h-8 shrink-0 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)]" onClick={() => setNewOpen(true)}><Plus className="size-3.5" /> Nuevo modelo</Button>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-1 text-xs">
        <span className={search ? "text-[var(--ossum-action)]" : "text-gray-500"}>
          <span className="font-semibold tabular-nums">{filtered.length}</span>{" "}
          <span>{filtered.length === 1 ? "modelo de caja" : "modelos de caja"}</span>
        </span>
        {search && <><span className="text-gray-300">·</span><span className="text-gray-500">Filtro activo</span></>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-3 my-2 flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--ossum-line)] bg-white">
        {!error && !loading && <div className="hidden h-full overflow-auto md:block">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
            <caption className="sr-only">Catálogo de cajas</caption>
            <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
              <tr>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium">Código</th>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium">Modelo</th>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium">Marca</th>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-right font-medium">Contenido esperado</th>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium">Revisión vigente</th>
                <th scope="col" className="whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium">Último cambio</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((box) => (
                <tr key={box.id} className="group transition-colors hover:bg-[var(--ossum-surface-2)]">
                  <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 font-mono text-[11px] text-gray-600">{box.sku}</td>
                  <td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><Link href={`/cajas/${box.id}`} className="font-medium text-[var(--ossum-navy)] hover:text-[var(--ossum-action)] hover:underline">{box.description}</Link></td>
                  <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 text-gray-600">{box.brand || "No informada"}</td>
                  <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 text-right"><span className="font-semibold tabular-nums">{box.lineCount}</span> <span className="text-gray-400">{box.lineCount === 1 ? "componente" : "componentes"}</span></td>
                  <td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><Badge variant="outline" className="h-5 rounded px-1.5 text-[10px] font-medium" title="Número de revisión del contenido esperado">Revisión {box.version}</Badge></td>
                  <td className="whitespace-nowrap border-b border-[var(--ossum-line)] px-3 py-1.5 text-gray-500">{formatDate(box.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

        {!error && !loading && <div className="h-full divide-y overflow-y-auto md:hidden">
          {filtered.map((box) => (
            <Link key={box.id} href={`/cajas/${box.id}`} className="block space-y-2 p-3 hover:bg-[var(--ossum-surface-2)]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-mono text-[11px] text-gray-500">{box.sku}</p><h2 className="mt-0.5 text-sm font-semibold text-[var(--ossum-navy)]">{box.description}</h2></div>
                <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">Revisión {box.version}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                {box.brand && <span>{box.brand}</span>}
                <span>{box.lineCount} {box.lineCount === 1 ? "componente esperado" : "componentes esperados"}</span>
                <span>Último cambio: {formatDate(box.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>}

        {error && (
          <div className="flex h-full flex-col items-center justify-center px-5 py-12 text-center" role="alert">
            <SearchX className="size-5 text-gray-400" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-[var(--ossum-navy)]">No se pudieron cargar los modelos de caja</h2>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => void loadBoxes()}>Reintentar</Button>
          </div>
        )}
        {filtered.length === 0 && !loading && !error && (
          <div className="flex h-full flex-col items-center justify-center px-5 py-12 text-center" role="status">
            <SearchX className="size-5 text-gray-400" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-[var(--ossum-navy)]">No se encontraron modelos de caja</h2>
            <p className="mt-1 text-xs text-gray-500">Creá un modelo nuevo o revisá la búsqueda.</p>
          </div>
        )}
        {loading && <div className="flex h-full items-center justify-center px-5 py-12 text-xs text-gray-500" role="status">Cargando cajas…</div>}
        </div>
      </div>

      {newOpen && <NewBoxDialog open={newOpen} onOpenChange={setNewOpen} companyId={companyId} onCreated={() => void loadBoxes()} />}
    </div>
  )
}

// ─── Operation tab (flujo operativo) ───────────────────────

export function OperationTab({ companyId, currentRole }: { companyId?: string; currentRole?: string }) {
  const [items, setItems] = useState<BoxPresentationSku[]>([])
  const [selectedBox, setSelectedBox] = useState<BoxPresentationSku | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<BoxPresentationUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState(false)
  const evidenceRequest = useRef(0)

  const loadItems = useCallback(async () => {
    if (!companyId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)
    try {
      setItems(await apiFetch<BoxPresentationSku[]>(`/api/companies/${encodeURIComponent(companyId)}/cajas/operational`))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    let active = true
    if (!companyId) {
      queueMicrotask(() => {
        if (!active) return
        setItems([])
        setError(false)
        setLoading(false)
      })
      return () => { active = false }
    }
    void apiFetch<BoxPresentationSku[]>(`/api/companies/${encodeURIComponent(companyId)}/cajas/operational`)
      .then((result) => { if (active) setItems(result) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId])

  const openUnit = async (box: BoxPresentationSku, unit: BoxPresentationUnit) => {
    const requestId = ++evidenceRequest.current
    setSelectedBox(box)
    setSelectedUnit(unit)
    setEvidenceError(false)
    if (!companyId || !unit.unitId) {
      setEvidenceLoading(false)
      return
    }

    setEvidenceLoading(true)
    try {
      const evidence = await apiFetch<BoxPresentationEvidence[]>(
        `/api/companies/${encodeURIComponent(companyId)}/cajas/units/${encodeURIComponent(unit.unitId)}/evidence`,
      )
      if (requestId === evidenceRequest.current) setSelectedUnit({ ...unit, evidence })
    } catch {
      if (requestId !== evidenceRequest.current) return
      setEvidenceError(true)
    } finally {
      if (requestId === evidenceRequest.current) setEvidenceLoading(false)
    }
  }

  const openBox = (box: BoxPresentationSku) => {
    evidenceRequest.current += 1
    setSelectedUnit(null)
    setSelectedBox(box)
  }

  const leaveDetail = (target: "unit" | "box") => {
    evidenceRequest.current += 1
    setEvidenceLoading(false)
    setEvidenceError(false)
    if (target === "unit") setSelectedUnit(null)
    else {
      setSelectedUnit(null)
      setSelectedBox(null)
    }
  }

  return selectedBox && selectedUnit ? (
    <PhysicalUnitDetail
      box={selectedBox}
      unit={selectedUnit}
      companyId={companyId}
      currentRole={currentRole}
      evidenceLoading={evidenceLoading}
      evidenceError={evidenceError}
      onRetryEvidence={() => void openUnit(selectedBox, selectedUnit)}
      onMaintenanceChanged={() => void loadItems()}
      onBack={() => leaveDetail("unit")}
    />
  ) : selectedBox ? (
    <BoxSkuDetail box={selectedBox} onBack={() => leaveDetail("box")} onOpenUnit={(unit) => void openUnit(selectedBox, unit)} />
  ) : (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--ossum-surface)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="size-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--ossum-navy)]">Estado operativo real</p>
            <p className="truncate text-[11px] text-gray-400">Condición, asignación y evidencia de cada unidad física.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => void loadItems()}
          disabled={loading}
          aria-label="Actualizar unidades físicas"
          title="Actualizar"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <BoxesOperationalIndex
          items={items}
          loading={loading}
          error={error}
          onRetry={() => void loadItems()}
          onOpenBox={openBox}
          onOpenUnit={(box, unit) => void openUnit(box, unit)}
        />
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────

export default function CajasPage() {
  const { activeCompany, currentAccess } = useAuth()
  const activeCompanyId = activeCompany?.id
  const [tab, setTab] = useState<Tab>("catalogo")

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--ossum-surface)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
        <div>
          <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Cajas</h1>
          <p className="text-[11px] text-gray-400">Modelos, contenido esperado y unidades físicas</p>
        </div>
      </header>

      <nav className="flex h-9 shrink-0 items-end gap-5 border-b border-[var(--ossum-line)] bg-white px-4" role="tablist" aria-label="Vistas de Cajas">
          {([
            { key: "catalogo" as const, label: "Modelos y contenido" },
            { key: "operacion" as const, label: "Unidades físicas" },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls="cajas-panel"
              id={`cajas-tab-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                event.preventDefault()
                const next = t.key === "catalogo" ? "operacion" : "catalogo"
                setTab(next)
                requestAnimationFrame(() => document.getElementById(`cajas-tab-${next}`)?.focus())
              }}
              className={cn(
                "h-9 border-b-2 px-1 text-xs font-medium transition-colors",
                tab === t.key ? "border-[var(--ossum-action)] text-[var(--ossum-action)]" : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {t.label}
            </button>
          ))}
      </nav>

      <div id="cajas-panel" role="tabpanel" aria-labelledby={`cajas-tab-${tab}`} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "catalogo" ? (
          <CatalogTab key={activeCompanyId ?? "no-company"} companyId={activeCompanyId} />
        ) : (
          <OperationTab key={activeCompanyId ?? "no-company"} companyId={activeCompanyId} currentRole={currentAccess?.role} />
        )}
      </div>
    </div>
  )
}
