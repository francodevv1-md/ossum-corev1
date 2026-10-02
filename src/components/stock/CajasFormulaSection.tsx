"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Container,
  Plus,
  History,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  listBoxFormulasApi,
  getBoxFormulaApi,
  createBoxFormulaApi,
  publishFormulaVersionApi,
  type BoxFormulaDetail,
} from "@/lib/api/cajas-formulas"
import { searchArticlesApi, type ArticleApiRow } from "@/lib/api/articles"
import { fmtDate, fmtQty, type StockItem } from "@/lib/stock/stock-ui-model"
import type { FichaCtx } from "./StockArticleSheet"

interface CompositionLineDraft {
  articleId: string
  sku: string
  description: string
  unit: string
  expectedQuantity: number
}

export function CajasFormulaSection({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const companyId = ctx.companyId
  const articleId = ctx.canonicalArticleId || (item.id && !item.id.startsWith("stock-") && !item.id.startsWith("mock-") ? item.id : "")

  const [formula, setFormula] = useState<BoxFormulaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "new_version">("create")

  // Form state
  const [lines, setLines] = useState<CompositionLineDraft[]>([])
  const [cause, setCause] = useState("")
  const [saving, setSaving] = useState(false)

  // Article search state inside dialog
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ArticleApiRow[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const loadFormula = useCallback(async () => {
    if (!companyId || !articleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await listBoxFormulasApi(companyId)
      const matching = list.find((f) => f.boxArticleId === articleId)
      if (matching) {
        const detail = await getBoxFormulaApi(companyId, matching.id)
        setFormula(detail)
      } else {
        setFormula(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar composición de caja")
    } finally {
      setLoading(false)
    }
  }, [companyId, articleId])

  useEffect(() => {
    loadFormula()
  }, [loadFormula])

  // Search articles
  useEffect(() => {
    if (!isDialogOpen || !companyId) return
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchArticlesApi(companyId, searchQuery, 10)
        // Filter out self
        setSearchResults(results.filter((a) => a.id !== articleId))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, isDialogOpen, companyId, articleId])

  const openCreateDialog = () => {
    setDialogMode("create")
    setLines([])
    setCause("Composición inicial de caja modelo")
    setSearchQuery("")
    setIsDialogOpen(true)
  }

  const openNewVersionDialog = () => {
    if (!formula?.currentVersion) return
    setDialogMode("new_version")
    setLines(
      formula.currentVersion.lines.map((l) => ({
        articleId: l.articleId,
        sku: l.sku || "",
        description: l.description || "",
        unit: l.unit,
        expectedQuantity: l.expectedQuantity,
      })),
    )
    setCause(`Actualización de composición (versión ${formula.nextVersion})`)
    setSearchQuery("")
    setIsDialogOpen(true)
  }

  const handleAddComponent = (art: ArticleApiRow) => {
    if (lines.some((l) => l.articleId === art.id)) {
      toast.info("El artículo ya está incluido en la lista")
      return
    }
    setLines((prev) => [
      ...prev,
      {
        articleId: art.id,
        sku: art.sku,
        description: art.description,
        unit: art.unit || "u",
        expectedQuantity: 1,
      },
    ])
  }

  const handleRemoveComponent = (artId: string) => {
    setLines((prev) => prev.filter((l) => l.articleId !== artId))
  }

  const handleQuantityChange = (artId: string, val: string) => {
    const num = parseFloat(val)
    setLines((prev) =>
      prev.map((l) => (l.articleId === artId ? { ...l, expectedQuantity: isNaN(num) ? 0 : num } : l)),
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !articleId) {
      toast.error("Empresa o artículo no disponible")
      return
    }
    if (lines.length === 0) {
      toast.error("La composición debe tener al menos un artículo componente")
      return
    }
    if (lines.some((l) => l.expectedQuantity <= 0)) {
      toast.error("Todas las cantidades deben ser mayores a 0")
      return
    }

    setSaving(true)
    try {
      if (dialogMode === "create") {
        await createBoxFormulaApi(companyId, {
          articleId,
          lines: lines.map((l) => ({
            articleId: l.articleId,
            expectedQuantity: l.expectedQuantity,
            unit: l.unit,
          })),
          cause: cause.trim() || undefined,
        })
        toast.success("Caja modelo creada con versión 1")
      } else if (dialogMode === "new_version" && formula) {
        await publishFormulaVersionApi(companyId, formula.id, {
          lines: lines.map((l) => ({
            articleId: l.articleId,
            expectedQuantity: l.expectedQuantity,
            unit: l.unit,
          })),
          cause: cause.trim() || undefined,
        })
        toast.success(`Versión ${formula.nextVersion} publicada correctamente`)
      }
      setIsDialogOpen(false)
      await loadFormula()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar la fórmula")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <Loader2 className="size-6 animate-spin text-[var(--ossum-action)]" />
        <p className="text-xs font-medium text-gray-600">Cargando composición de caja modelo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <AlertCircle className="mx-auto size-5 text-red-500" />
        <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
        <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={loadFormula}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (!formula || !formula.currentVersion) {
    return (
      <div className="space-y-4 py-4">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--ossum-line)] bg-[var(--ossum-surface)] p-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50 text-[var(--ossum-action)]">
            <Container className="size-6" />
          </div>
          <h4 className="text-sm font-semibold text-[var(--ossum-navy)]">
            Sin composición de caja modelo registrada
          </h4>
          <p className="mt-1 max-w-md text-xs text-gray-500">
            Este artículo puede definirse como una Caja Modelo configurando su composición estándar de componentes y cantidades esperadas.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action)]/90"
              onClick={openCreateDialog}
            >
              <Plus className="size-3.5" /> Definir composición de caja
            </Button>
          </div>
        </div>

        {/* Dialog for initial creation */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogTitle className="text-base text-[var(--ossum-navy)]">
              Definir composición de caja modelo
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configurá la composición estándar de esta caja modelo.
            </DialogDescription>
            <p className="text-xs text-gray-500">
              Configurá los artículos componentes que integran esta caja modelo ({item.code} · {item.name}).
            </p>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-gray-700">Buscar artículos componentes</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Escribí SKU, descripción o marca..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                {isSearching && <p className="text-[10px] text-gray-400">Buscando artículos...</p>}
                {searchResults.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-md border border-[var(--ossum-line)] bg-white p-1 shadow-sm">
                    {searchResults.map((art) => (
                      <div
                        key={art.id}
                        className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] font-medium text-gray-700">{art.sku}</span>
                          <span className="mx-1 text-gray-400">·</span>
                          <span className="truncate text-gray-600">{art.description}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-[var(--ossum-action)] hover:bg-blue-50"
                          onClick={() => handleAddComponent(art)}
                        >
                          <Plus className="size-3" /> Agregar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected components table */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-gray-700">Artículos componentes seleccionados ({lines.length})</span>
                {lines.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                    No has agregado ningún componente todavía.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded border border-[var(--ossum-line)]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-gray-600">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-medium">SKU</th>
                          <th className="px-2.5 py-1.5 text-left font-medium">Descripción</th>
                          <th className="w-24 px-2.5 py-1.5 text-right font-medium">Cant. Requerida</th>
                          <th className="w-16 px-2.5 py-1.5 text-left font-medium">Unidad</th>
                          <th className="w-10 px-2.5 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((l) => (
                          <tr key={l.articleId} className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 font-mono text-[11px] text-gray-800">{l.sku}</td>
                            <td className="truncate px-2.5 py-1.5 text-gray-700 max-w-[200px]">{l.description}</td>
                            <td className="px-2.5 py-1.5 text-right">
                              <Input
                                type="number"
                                min="0.01"
                                step="any"
                                value={l.expectedQuantity}
                                onChange={(e) => handleQuantityChange(l.articleId, e.target.value)}
                                className="h-6 w-20 text-right text-xs"
                                required
                              />
                            </td>
                            <td className="px-2.5 py-1.5 text-gray-500 font-mono text-[11px]">{l.unit}</td>
                            <td className="px-2.5 py-1.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 text-red-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleRemoveComponent(l.articleId)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-gray-700">Motivo / Notas de la versión</span>
                <Input
                  type="text"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  placeholder="Ej: Composición inicial estándar"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || lines.length === 0}
                  className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action)]/90"
                >
                  {saving ? "Guardando..." : "Guardar versión 1"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const current = formula.currentVersion

  return (
    <div className="space-y-6 py-2">
      {/* Current Version Card */}
      <section className="rounded-lg border border-[var(--ossum-line)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded bg-blue-50 text-[var(--ossum-action)]">
              <Layers className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--ossum-navy)]">
                Composición vigente · Versión {current.versionNumber}
              </h3>
              <p className="text-[11px] text-gray-500">
                Aceptada el {fmtDate(current.acceptedAt)} por <b className="font-medium text-gray-700">{current.acceptedByName || "Sistema"}</b>
                {current.cause ? ` · Motivo: "${current.cause}"` : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action)]/90"
            onClick={openNewVersionDialog}
          >
            <Plus className="size-3.5" /> Publicar nueva versión ({formula.nextVersion})
          </Button>
        </div>

        {/* Lines Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50 text-gray-600">
                <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">SKU Componente</th>
                <th className="px-3 py-2 text-left font-medium">Descripción</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Cant. Requerida</th>
                <th className="w-16 px-3 py-2 text-left font-medium">Unidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {current.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{line.lineNumber}</td>
                  <td className="px-3 py-2 font-mono text-[11px] font-medium text-gray-800">{line.sku || "—"}</td>
                  <td className="px-3 py-2 text-gray-700">{line.description || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-gray-900">{fmtQty(line.expectedQuantity)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{line.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Version History Table */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5">
          <History className="size-3.5 text-gray-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ossum-navy)]">
            Historial inmutable de versiones ({formula.versions.length})
          </h4>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--ossum-line)] bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50 text-gray-600">
                <th className="px-3 py-2 text-left font-medium">Versión</th>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Autor</th>
                <th className="px-3 py-2 text-left font-medium">Motivo</th>
                <th className="px-3 py-2 text-right font-medium">Componentes</th>
                <th className="w-20 px-3 py-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formula.versions.map((ver) => (
                <tr key={ver.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-mono text-[11px] font-semibold text-gray-800">v{ver.versionNumber}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(ver.acceptedAt)}</td>
                  <td className="px-3 py-2 text-gray-700">{ver.acceptedByName || "—"}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{ver.cause || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-800 font-medium">{ver.lineCount} ítems</td>
                  <td className="px-3 py-2 text-center">
                    {ver.id === current.id ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Vigente
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        Histórica
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialog for new version */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">
            Publicar nueva versión de composición (v{formula.nextVersion})
          </DialogTitle>
          <DialogDescription className="sr-only">
            Publicá una nueva composición sin modificar las versiones previas.
          </DialogDescription>
          <p className="text-xs text-gray-500">
            Cada publicación genera una versión inmutable nueva para {item.code} · {item.name}, preservando el historial previo.
          </p>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-gray-700">Buscar artículos componentes para agregar</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-gray-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribí SKU, descripción o marca..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              {isSearching && <p className="text-[10px] text-gray-400">Buscando artículos...</p>}
              {searchResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-md border border-[var(--ossum-line)] bg-white p-1 shadow-sm">
                  {searchResults.map((art) => (
                    <div
                      key={art.id}
                      className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-medium text-gray-700">{art.sku}</span>
                        <span className="mx-1 text-gray-400">·</span>
                        <span className="truncate text-gray-600">{art.description}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-[var(--ossum-action)] hover:bg-blue-50"
                        onClick={() => handleAddComponent(art)}
                      >
                        <Plus className="size-3" /> Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected components table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-gray-700">Artículos componentes de la nueva versión ({lines.length})</span>
              {lines.length === 0 ? (
                <div className="rounded border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  No hay componentes seleccionados.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded border border-[var(--ossum-line)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-gray-600">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left font-medium">SKU</th>
                        <th className="px-2.5 py-1.5 text-left font-medium">Descripción</th>
                        <th className="w-24 px-2.5 py-1.5 text-right font-medium">Cant. Requerida</th>
                        <th className="w-16 px-2.5 py-1.5 text-left font-medium">Unidad</th>
                        <th className="w-10 px-2.5 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((l) => (
                        <tr key={l.articleId} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1.5 font-mono text-[11px] text-gray-800">{l.sku}</td>
                          <td className="truncate px-2.5 py-1.5 text-gray-700 max-w-[200px]">{l.description}</td>
                          <td className="px-2.5 py-1.5 text-right">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={l.expectedQuantity}
                              onChange={(e) => handleQuantityChange(l.articleId, e.target.value)}
                              className="h-6 w-20 text-right text-xs"
                              required
                            />
                          </td>
                          <td className="px-2.5 py-1.5 text-gray-500 font-mono text-[11px]">{l.unit}</td>
                          <td className="px-2.5 py-1.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 text-red-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleRemoveComponent(l.articleId)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-700">Motivo de la nueva versión (auditoría)</span>
              <Input
                type="text"
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                placeholder="Ej: Se ajustan cantidades de tornillos e instrumental"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || lines.length === 0}
                className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action)]/90"
              >
                {saving ? "Publicando..." : `Publicar versión ${formula.nextVersion}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
