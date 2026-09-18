"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Search, Check, Tag } from "lucide-react"
import { useOrtoTrackStore } from "@/lib/store"
import { CLASSIFICATION_COLORS } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import type { SurgeryClassification, ClassificationConfig } from "@/types"

/**
 * CHATZAI-025A.3 — Clasificación Selector Modal
 *
 * Replaces the inline Popover+Command combobox with a proper independent modal.
 * Reads active classifications from the store (not the static CLASSIFICATIONS array).
 * Provides search, selection, and keyboard navigation.
 *
 * Pattern follows TemplateSelector / ImportSubmodal (self-contained Dialog).
 */

interface ClasificacionSelectorModalProps {
  /** Currently selected classification */
  value: SurgeryClassification | ""
  /** Callback when a classification is selected */
  onSelect: (classification: SurgeryClassification) => void
  /** Render the trigger element (render prop) */
  children: (openModal: () => void) => React.ReactNode
}

export function ClasificacionSelectorModal({
  value,
  onSelect,
  children,
}: ClasificacionSelectorModalProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocal, setSelectedLocal] = useState<SurgeryClassification | "">(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const store = useOrtoTrackStore()

  // Read active classifications from the store
  const activeClassifications = useMemo(() => {
    return store.classifications.filter((c) => c.active)
  }, [store.classifications])

  // Filter by search query (supports partial matching, accent-insensitive)
  const filteredClassifications = useMemo(() => {
    if (!searchQuery.trim()) return activeClassifications

    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

    return activeClassifications.filter((c) => {
      const nameNorm = c.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
      const descNorm = c.description
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
      return nameNorm.includes(q) || descNorm.includes(q)
    })
  }, [activeClassifications, searchQuery])

  // Sync local selection when value changes externally
  useEffect(() => {
    setSelectedLocal(value)
  }, [value])

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  const handleSelect = useCallback((classification: SurgeryClassification) => {
    setSelectedLocal(classification)
    onSelect(classification)
    setOpen(false)
    setSearchQuery("")
  }, [onSelect])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
    }
  }, [])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setSearchQuery("")
  }, [])

  // Keyboard: Enter selects the focused/only item
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && filteredClassifications.length === 1) {
        e.preventDefault()
        handleSelect(filteredClassifications[0].name)
      }
    },
    [filteredClassifications, handleSelect]
  )

  // Get color class for a classification
  const getColorClass = (name: string): string => {
    return CLASSIFICATION_COLORS[name] || "bg-gray-400"
  }

  return (
    <>
      {children(handleOpen)}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[440px] max-h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="text-sm">Seleccionar clasificación</DialogTitle>
            <DialogDescription className="text-[10px]">
              Busque y seleccione la clasificación para la cirugía
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar clasificación..."
                className="h-8 text-[11px] pl-7"
              />
            </div>
          </div>

          {/* Classification list */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredClassifications.length > 0 ? (
              filteredClassifications.map((classification: ClassificationConfig) => {
                const isSelected = value === classification.name
                const isCurrent = selectedLocal === classification.name
                return (
                  <button
                    key={classification.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2",
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-emerald-500"
                        : "hover:bg-muted/60 border-l-transparent"
                    )}
                    onClick={() => handleSelect(classification.name)}
                  >
                    {/* Color indicator dot */}
                    <div
                      className={cn(
                        "size-2.5 rounded-full shrink-0",
                        getColorClass(classification.name)
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {classification.name}
                        </span>
                        {isSelected && (
                          <Badge variant="default" className="text-[8px] h-3.5 px-1 bg-emerald-600">
                            Actual
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {classification.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Tag className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">
                  No se encontraron clasificaciones
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {searchQuery
                    ? "Intente con otro término de búsqueda"
                    : "No hay clasificaciones activas disponibles"}
                </p>
              </div>
            )}
          </div>

          {/* Footer with current selection info */}
          <div className="shrink-0 border-t bg-muted/20 px-4 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              {value ? (
                <div className="flex items-center gap-1.5">
                  <div className={cn("size-2 rounded-full shrink-0", getColorClass(value))} />
                  <p className="text-[10px] text-muted-foreground truncate">
                    Actual: <span className="font-medium text-foreground">{value}</span>
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Sin clasificación seleccionada
                </p>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground/60 shrink-0 ml-2">
              {filteredClassifications.length} opción{filteredClassifications.length !== 1 ? "es" : ""}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
