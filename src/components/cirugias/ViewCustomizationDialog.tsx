"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, SlidersHorizontal, Eye, Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DEFAULT_COLUMN_WIDTHS, type CxStatusVariant } from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"
import type { ColumnDefinition } from "./view-customization/types"
import { useSurgeryViewDraft } from "./view-customization/useSurgeryViewDraft"
import { ViewPresetSelector } from "./view-customization/ViewPresetSelector"
import { ViewColumnEditor } from "./view-customization/ViewColumnEditor"
import { ViewAppearanceSettings } from "./view-customization/ViewAppearanceSettings"
import { ColorReferenceDialog } from "./view-customization/ColorReferenceDialog"

export interface ViewCustomizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ReadonlyArray<ColumnDefinition>
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  compactMode: boolean
  fixedColumns: string[]
  groups: GroupedHeaderPreference[]
  showGroupedHeaders: boolean
  showOperationPresets: boolean
  onShowOperationPresetsChange: (show: boolean) => void
  cxVariant?: CxStatusVariant
  onApply: (next: {
    visibleCols: Record<string, boolean>
    columnOrder: string[]
    stickyColumns: boolean
    columnWidths: Record<string, number>
    compactMode: boolean
    fixedColumns: string[]
    groups: GroupedHeaderPreference[]
    showGroupedHeaders: boolean
    cxVariant: CxStatusVariant
  }) => void
  onResetToDefault: () => void
}

export function ViewCustomizationDialog({
  open,
  onOpenChange,
  columns,
  visibleCols,
  columnOrder,
  stickyColumns,
  columnWidths,
  compactMode,
  fixedColumns,
  groups,
  showGroupedHeaders,
  showOperationPresets,
  onShowOperationPresetsChange,
  cxVariant = "b",
  onApply,
  onResetToDefault,
}: ViewCustomizationDialogProps) {
  const [screen, setScreen] = useState<"presets" | "customize">("presets")
  const [activeTab, setActiveTab] = useState<"columns" | "appearance">("columns")
  const [showColorReference, setShowColorReference] = useState(false)

  const draftManager = useSurgeryViewDraft({
    columns,
    visibleCols,
    columnOrder,
    stickyColumns,
    columnWidths,
    compactMode,
    fixedColumns,
    groups,
    showGroupedHeaders,
    cxVariant,
    onResetToDefault,
  })

  const {
    draft,
    realConfigDirty,
    systemPresets,
    userTemplates,
    selectedPresetId,
    selectPreset,
    updateColumnVisibility,
    setAllColumnsVisible,
    reorderColumns,
    moveColumn,
    updateColumnWidth,
    toggleFixedColumn,
    setCompactMode,
    setCxVariant,
    setStickyHeaders,
    resetToDefaultDraft,
    resetDraftToCurrent,
    saveUserTemplate,
    renameUserTemplate,
    deleteUserTemplate,
    setDefaultUserTemplate,
  } = draftManager

  // Reset to presets screen and fresh draft when opening dialog
  useEffect(() => {
    if (open) {
      setScreen("presets")
      setActiveTab("columns")
      resetDraftToCurrent()
    }
  }, [open, resetDraftToCurrent])

  const handleApply = () => {
    const nextVisibleCols: Record<string, boolean> = {}
    for (const col of columns) {
      nextVisibleCols[col.key] = draft.visibleColumnKeys.includes(col.key)
    }

    const nextColumnWidths: Record<string, number> = {}
    for (const col of columns) {
      const rawVal = draft.widths[col.key]
      const numVal = Number(rawVal)
      nextColumnWidths[col.key] =
        Number.isFinite(numVal) && numVal > 0 ? numVal : DEFAULT_COLUMN_WIDTHS[col.key] ?? 120
    }

    onApply({
      visibleCols: nextVisibleCols,
      columnOrder: draft.orderedColumnKeys,
      stickyColumns: draft.stickyColumnsEnabled,
      columnWidths: nextColumnWidths,
      compactMode: draft.compactMode,
      fixedColumns: draft.fixedColumns,
      groups: draft.groups,
      showGroupedHeaders: draft.showGroupedHeaders,
      cxVariant: draft.cxVariant,
    })

    onOpenChange(false)
  }

  const handleResetToDefault = () => {
    resetToDefaultDraft()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex-col gap-0 overflow-hidden border-slate-300 bg-slate-50 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl"
        showCloseButton
      >
        {/* ── Dialog Header with Progressive Disclosure Navigation ── */}
        <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div>
              {screen === "presets" ? (
                <div>
                  <Badge
                    variant="outline"
                    className="mb-1 border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    Vista de tabla
                  </Badge>
                  <DialogTitle className="text-lg font-bold text-slate-950 dark:text-slate-50">
                    Configurar vista
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Elegí cómo querés trabajar con el listado de Cirugías.
                  </DialogDescription>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen("presets")}
                    className="h-8 -ml-2 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <ArrowLeft className="mr-1 size-3.5" />
                    Vistas
                  </Button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-950 dark:text-slate-50">
                      Personalizar vista
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Ajustá las columnas, orden y presentación de la tabla.
                    </DialogDescription>
                  </div>
                </div>
              )}
            </div>

            {/* Top Quick Badges and Color Guide Trigger */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowColorReference(true)}
                className="h-7 gap-1.5 border-blue-200 bg-blue-50/70 text-[11px] font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs"
                title="Ver referencia y significado de colores y estados"
              >
                <Palette className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden xs:inline sm:inline">Colores y estados</span>
              </Button>

              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Eye className="size-3 text-slate-400" />
                <span className="font-semibold">{draft.visibleColumnKeys.length}</span>
                <span className="text-slate-400">columnas</span>
              </div>
              <div className="hidden sm:block rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <span className="font-medium">
                  {draft.compactMode ? "Compacta" : "Estándar"}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-tabs when on customize screen */}
          {screen === "customize" && (
            <div className="pt-3">
              <div className="flex h-9 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "columns"}
                  onClick={() => setActiveTab("columns")}
                  className={cn(
                    "relative flex-1 rounded-lg px-3 text-xs font-semibold transition-colors duration-150",
                    activeTab === "columns"
                      ? "text-slate-950 dark:text-slate-50"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {activeTab === "columns" && (
                    <motion.div
                      layoutId="active-customization-tab"
                      className="absolute inset-0 rounded-lg bg-white shadow-2xs dark:bg-slate-800"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <SlidersHorizontal className="size-3.5" />
                    <span>Columnas</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "appearance"}
                  onClick={() => setActiveTab("appearance")}
                  className={cn(
                    "relative flex-1 rounded-lg px-3 text-xs font-semibold transition-colors duration-150",
                    activeTab === "appearance"
                      ? "text-slate-950 dark:text-slate-50"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {activeTab === "appearance" && (
                    <motion.div
                      layoutId="active-customization-tab"
                      className="absolute inset-0 rounded-lg bg-white shadow-2xs dark:bg-slate-800"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Palette className="size-3.5" />
                    <span>Apariencia</span>
                  </span>
                </button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {screen === "presets" ? (
            <ViewPresetSelector
              systemPresets={systemPresets}
              userTemplates={userTemplates}
              selectedPresetId={selectedPresetId}
              onSelectPreset={selectPreset}
              onSaveUserTemplate={saveUserTemplate}
              onRenameUserTemplate={renameUserTemplate}
              onDeleteUserTemplate={deleteUserTemplate}
              onSetDefaultUserTemplate={setDefaultUserTemplate}
              onGoToCustomize={() => setScreen("customize")}
            />
          ) : activeTab === "columns" ? (
            <ViewColumnEditor
              columns={columns}
              draft={draft}
              onUpdateVisibility={updateColumnVisibility}
              onSetAllVisible={setAllColumnsVisible}
              onReorderColumns={reorderColumns}
              onMoveColumn={moveColumn}
              onUpdateWidth={updateColumnWidth}
              onToggleFixed={toggleFixedColumn}
            />
          ) : (
            <ViewAppearanceSettings
              compactMode={draft.compactMode}
              onCompactModeChange={setCompactMode}
              cxVariant={draft.cxVariant}
              onCxVariantChange={setCxVariant}
              stickyHeaders={draft.stickyColumnsEnabled}
              onStickyHeadersChange={setStickyHeaders}
              showOperationPresets={showOperationPresets}
              onShowOperationPresetsChange={onShowOperationPresetsChange}
              onOpenColorReference={() => setShowColorReference(true)}
            />
          )}
        </div>

        {/* ── Persistent Footer ── */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 border-t border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Restablecer predeterminado
          </Button>

          <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!realConfigDirty}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Aplicar a tabla
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* ── Modal de Referencia de Colores y Estados ── */}
      <ColorReferenceDialog
        open={showColorReference}
        onOpenChange={setShowColorReference}
      />
    </Dialog>
  )
}
