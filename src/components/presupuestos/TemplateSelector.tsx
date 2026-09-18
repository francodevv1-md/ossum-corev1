"use client"

import React, { useState, useMemo } from "react"
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
import { FileText, ChevronRight, Search, Check } from "lucide-react"
import { PRESUPUESTO_TEMPLATES, getActiveTemplates, PLANTILLA_CATEGORY_LABELS } from "@/data/presupuesto-templates"
import type { PlantillaPresupuesto, PlantillaCategory, SurgeryClassification } from "@/types"

/**
 * CHATZAI-017F — Template Selector as internal submodal (DF-PRES-03).
 *
 * Key changes from CHATZAI-017E:
 * - No longer a Popover (floating, overflow issues)
 * - Opens as Dialog centered within the workspace
 * - Includes template preview before loading
 * - Filter tabs: Todas / Cirugía / Cliente / Médico
 * - "Próximamente" hint for categories without templates
 * - Suggested badge for matching classification
 * - "Cargar plantilla" button with preview
 */

type FilterTab = "all" | PlantillaCategory

interface TemplateSelectorProps {
  currentClassification?: SurgeryClassification
  currentClient?: string
  currentSurgeon?: string
  onLoadTemplate: (template: PlantillaPresupuesto) => void
}

export function TemplateSelector({ currentClassification, currentClient, currentSurgeon, onLoadTemplate }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<PlantillaPresupuesto | null>(null)

  // Get active templates grouped by category
  const activeTemplates = useMemo(() => getActiveTemplates(), [])

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, PlantillaPresupuesto[]> = {}
    for (const t of activeTemplates) {
      const key = t.categoria
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    return groups
  }, [activeTemplates])

  // Which categories have templates
  const categoriesWithTemplates = useMemo(
    () => Object.keys(groupedByCategory) as PlantillaCategory[],
    [groupedByCategory]
  )

  // Filtered templates based on active tab and search
  const filteredTemplates = useMemo(() => {
    let result = activeTemplates

    // Filter by category tab
    if (activeTab !== "all") {
      result = result.filter(t => t.categoria === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        t.clasificacion.toLowerCase().includes(q) ||
        (t.cliente && t.cliente.toLowerCase().includes(q)) ||
        (t.medico && t.medico.toLowerCase().includes(q))
      )
    }

    return result
  }, [activeTemplates, activeTab, searchQuery])

  // Group filtered results by category for display
  const displayGroups = useMemo(() => {
    const groups: Record<string, PlantillaPresupuesto[]> = {}
    for (const t of filteredTemplates) {
      const key = t.categoria
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    return groups
  }, [filteredTemplates])

  // Sort: templates matching current classification first
  const sortedCategories = useMemo(
    () => Object.keys(displayGroups).sort((a, b) => {
      if (a === "clasificacion") return -1
      if (b === "clasificacion") return 1
      return 0
    }),
    [displayGroups]
  )

  // Available categories for tabs
  const allCategoryTabs: { key: FilterTab; label: string; hasTemplates: boolean }[] = [
    { key: "all", label: "Todas", hasTemplates: true },
    { key: "clasificacion", label: "Cirugía", hasTemplates: categoriesWithTemplates.includes("clasificacion") },
    { key: "cliente", label: "Cliente", hasTemplates: categoriesWithTemplates.includes("cliente") },
    { key: "medico", label: "Médico", hasTemplates: categoriesWithTemplates.includes("medico") },
  ]

  const handleLoadTemplate = () => {
    if (!selectedTemplate) return
    onLoadTemplate(selectedTemplate)
    setOpen(false)
    setSelectedTemplate(null)
    setSearchQuery("")
    setActiveTab("all")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedTemplate(null)
      setSearchQuery("")
      setActiveTab("all")
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-[10px] gap-1 px-2"
        onClick={() => setOpen(true)}
        data-testid="btn-plantillas"
      >
        <FileText className="size-3" /> Plantillas
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px] max-h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="text-sm">Plantillas de presupuesto</DialogTitle>
            <DialogDescription className="text-[10px]">
              Seleccione una plantilla para cargar artículos predefinidos en la grilla
            </DialogDescription>
          </DialogHeader>

          {/* Search + Filter tabs */}
          <div className="shrink-0 border-b">
            <div className="px-4 pt-2 pb-1.5">
              <div className="relative">
                <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar plantilla..."
                  className="h-7 text-[11px] pl-7"
                />
              </div>
            </div>
            <div className="flex">
              {allCategoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`
                    flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors relative
                    ${activeTab === tab.key
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {!tab.hasTemplates && tab.key !== "all" && (
                    <span className="ml-0.5 text-[8px] text-muted-foreground/60">(+)</span>
                  )}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-emerald-600 rounded-t" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Template list + preview */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filteredTemplates.length > 0 ? (
                sortedCategories.map((category) => {
                  const templates = displayGroups[category]
                  const label = PLANTILLA_CATEGORY_LABELS[category] || category
                  return (
                    <div key={category}>
                      <div className="px-4 py-1.5 bg-muted/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                      </div>
                      {templates.map((template) => {
                        const isMatch = currentClassification && template.clasificacion === currentClassification
                        const isClientMatch = currentClient && template.cliente === currentClient
                        const isMedicoMatch = currentSurgeon && template.medico === currentSurgeon
                        const isSelected = selectedTemplate?.id === template.id

                        return (
                          <button
                            key={template.id}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-l-emerald-500"
                                : "hover:bg-muted/60 border-l-2 border-l-transparent"
                            }`}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium truncate">{template.nombre}</span>
                                {isMatch && (
                                  <Badge variant="default" className="text-[8px] h-3.5 px-1 bg-emerald-600">
                                    Sugerida
                                  </Badge>
                                )}
                                {isClientMatch && (
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-blue-400 text-blue-600">
                                    Cliente
                                  </Badge>
                                )}
                                {isMedicoMatch && (
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-purple-400 text-purple-600">
                                    Médico
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {template.items.length} artículos
                                {template.cliente && ` · ${template.cliente}`}
                                {template.medico && ` · ${template.medico}`}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="size-3.5 text-emerald-600 shrink-0" />
                            )}
                            {!isSelected && (
                              <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    {searchQuery ? "No se encontraron plantillas" : "No hay plantillas en esta categoría"}
                  </p>
                </div>
              )}

              {/* Future categories hint */}
              {activeTab === "all" && (!groupedByCategory["cliente"] || !groupedByCategory["medico"]) && (
                <div className="px-4 py-2 border-t">
                  <p className="text-[10px] text-muted-foreground italic">
                    {!groupedByCategory["cliente"] && "Próximamente: plantillas por cliente/pagador"}
                    {!groupedByCategory["cliente"] && !groupedByCategory["medico"] && " · "}
                    {!groupedByCategory["medico"] && "por médico"}
                  </p>
                </div>
              )}
            </div>

            {/* Preview + Load action */}
            {selectedTemplate && (
              <div className="shrink-0 border-t bg-muted/20 px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{selectedTemplate.nombre}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Origen: {PLANTILLA_CATEGORY_LABELS[selectedTemplate.categoria] || selectedTemplate.categoria}
                      {selectedTemplate.cliente && ` · ${selectedTemplate.cliente}`}
                      {selectedTemplate.medico && ` · ${selectedTemplate.medico}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {selectedTemplate.items.length} artículos
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] gap-1 px-3 bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    onClick={handleLoadTemplate}
                    data-testid="btn-load-template"
                  >
                    <FileText className="size-3" /> Cargar plantilla
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
