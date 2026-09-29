"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Activity,
  Calendar,
  Search,
  X,
  Building2,
  Check,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/formatters"
import type { Surgery } from "@/types"

export type SurgeryFilterTab = "proximas" | "pendientes" | "todas"

interface InvoiceSurgeryLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgeries: Surgery[]
  selectedSurgeryId?: string | null
  onSelect: (surgery: Surgery) => void
}

export function InvoiceSurgeryLinkModal({
  open,
  onOpenChange,
  surgeries,
  selectedSurgeryId,
  onSelect,
}: InvoiceSurgeryLinkModalProps) {
  const [query, setQuery] = useState("")
  const [filterTab, setFilterTab] = useState<SurgeryFilterTab>("proximas")
  const [highlightedId, setHighlightedId] = useState<string | null>(selectedSurgeryId || null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset search and selection state on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setHighlightedId(selectedSurgeryId || null)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [open, selectedSurgeryId])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Filter surgeries based on tab and query
  const filteredSurgeries = useMemo(() => {
    return surgeries.filter((s) => {
      // 1. Tab filtering
      if (filterTab === "proximas") {
        const isNotClosed = s.state !== "Finalizada" && s.state !== "Cancelada"
        const isFutureOrToday = !s.date || s.date >= todayStr
        if (!isNotClosed && !isFutureOrToday) return false
      } else if (filterTab === "pendientes") {
        if (s.facturado || s.state === "Cancelada" || s.state === "Suspendida") {
          return false
        }
      }

      // 2. Query search
      if (!query.trim()) return true
      const q = query.toLowerCase().trim()
      const matchId = (s.visibleNumber || s.id || "").toLowerCase().includes(q)
      const matchPatient = (s.patient || "").toLowerCase().includes(q)
      const matchDni = (s.patientDni || "").toLowerCase().includes(q)
      const matchInstitution = (s.institution || "").toLowerCase().includes(q)
      const matchDate = (s.date || "").toLowerCase().includes(q)
      const matchDoctor = (s.surgeon || "").toLowerCase().includes(q)
      const matchObraSocial = (s.obraSocial || s.client || "").toLowerCase().includes(q)

      return matchId || matchPatient || matchDni || matchInstitution || matchDate || matchDoctor || matchObraSocial
    })
  }, [surgeries, filterTab, query, todayStr])

  // Ensure highlighted item is valid
  useEffect(() => {
    if (filteredSurgeries.length > 0) {
      const exists = filteredSurgeries.some(
        (s) => s.backendId === highlightedId || s.id === highlightedId
      )
      if (!exists) {
        setHighlightedId(filteredSurgeries[0].backendId || filteredSurgeries[0].id)
      }
    } else {
      setHighlightedId(null)
    }
  }, [filteredSurgeries, highlightedId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredSurgeries.length === 0) return

    const currentIndex = filteredSurgeries.findIndex(
      (s) => (s.backendId || s.id) === highlightedId
    )

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = currentIndex < filteredSurgeries.length - 1 ? currentIndex + 1 : 0
      const nextItem = filteredSurgeries[nextIndex]
      setHighlightedId(nextItem.backendId || nextItem.id)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredSurgeries.length - 1
      const prevItem = filteredSurgeries[prevIndex]
      setHighlightedId(prevItem.backendId || prevItem.id)
    } else if (e.key === "Enter" && highlightedId) {
      e.preventDefault()
      const selected = filteredSurgeries.find(
        (s) => (s.backendId || s.id) === highlightedId
      )
      if (selected) {
        onSelect(selected)
        onOpenChange(false)
      }
    }
  }

  const handleConfirmSelect = () => {
    if (!highlightedId) return
    const selected = filteredSurgeries.find(
      (s) => (s.backendId || s.id) === highlightedId
    )
    if (selected) {
      onSelect(selected)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Activity className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                Vincular factura a cirugía
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Buscá por número CX, paciente, institución o fecha para asociar el origen operativo.
              </DialogDescription>
            </div>
          </div>

          {/* Search bar & Filter tabs */}
          <div className="pt-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por CX-0000, paciente, institución, fecha..."
                className="h-9 pl-8.5 pr-8 text-xs bg-background focus-visible:ring-primary/40 shadow-2xs font-medium"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    inputRef.current?.focus()
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Segmented Filter Tabs */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-md bg-muted p-0.5 border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("proximas")}
                  className={`px-2.5 py-1 font-semibold rounded-sm transition-all ${
                    filterTab === "proximas"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Próximas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("pendientes")}
                  className={`px-2.5 py-1 font-semibold rounded-sm transition-all ${
                    filterTab === "pendientes"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pendientes de facturar
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("todas")}
                  className={`px-2.5 py-1 font-semibold rounded-sm transition-all ${
                    filterTab === "todas"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                {filteredSurgeries.length} {filteredSurgeries.length === 1 ? "cirugía encontrada" : "cirugías encontradas"}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content list / Table */}
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-[260px] max-h-[420px] p-2">
          {filteredSurgeries.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <Activity className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">No se encontraron cirugías</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                {query
                  ? `No hay resultados para "${query}" con el filtro actual.`
                  : "No hay cirugías registradas con el criterio seleccionado."}
              </p>
              {filterTab !== "todas" && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setFilterTab("todas")}
                  className="text-xs mt-1 text-primary"
                >
                  Ver todas las cirugías
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1" role="listbox" aria-label="Lista de cirugías disponibles">
              {filteredSurgeries.map((s) => {
                const surgeryKey = s.backendId || s.id
                const isSelected = highlightedId === surgeryKey
                const isCurrentlyLinked = (s.backendId === selectedSurgeryId || s.id === selectedSurgeryId)

                return (
                  <div
                    key={surgeryKey}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setHighlightedId(surgeryKey)}
                    onDoubleClick={() => {
                      onSelect(s)
                      onOpenChange(false)
                    }}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/30"
                        : "bg-card border-border/70 hover:bg-muted/60 hover:border-border"
                    }`}
                  >
                    {/* Left: CX code & Patient */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`size-7 rounded-md flex items-center justify-center shrink-0 font-mono font-bold text-[11px] ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {isSelected ? <Check className="size-3.5" /> : <Activity className="size-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-foreground">
                            {s.visibleNumber || s.id}
                          </span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="font-semibold text-foreground truncate">
                            {s.patient || "Sin paciente"}
                          </span>
                          {s.patientDni ? (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              (DNI {s.patientDni})
                            </span>
                          ) : null}
                          {isCurrentlyLinked ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold">
                              Vinculada actualmente
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                          {s.institution ? (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="size-3 text-muted-foreground/70 shrink-0" />
                              {s.institution}
                            </span>
                          ) : null}
                          {s.obraSocial ? (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="truncate">{s.obraSocial}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Date & State Badge */}
                    <div className="flex items-center gap-3 sm:justify-end shrink-0 pl-9 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1 text-[11px] font-medium text-foreground">
                          <Calendar className="size-3 text-muted-foreground shrink-0" />
                          <span>{s.date ? formatDate(s.date) : "Sin fecha"}</span>
                        </div>
                        {s.surgeon ? (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">
                            Dr. {s.surgeon}
                          </span>
                        ) : null}
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          s.state === "Realizada" || s.state === "Finalizada"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : s.state === "Autorizada"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20"
                            : "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {s.state || "Planificada"}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t bg-muted/30 flex items-center justify-between sm:justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5">
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border text-[10px]">↑</kbd>
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border text-[10px]">↓</kbd>
            <span>Navegar</span>
            <span className="text-muted-foreground/50">·</span>
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border text-[10px]">Enter</kbd>
            <span>Seleccionar</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSelect}
              disabled={!highlightedId}
              className="text-xs h-8 font-semibold gap-1.5 bg-primary hover:bg-primary/90 shadow-2xs"
            >
              <Activity className="size-3.5" />
              Vincular cirugía
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
