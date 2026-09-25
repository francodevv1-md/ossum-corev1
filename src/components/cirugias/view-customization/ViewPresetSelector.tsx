"use client"

import { useState } from "react"
import {
  Check,
  MoreVertical,
  SlidersHorizontal,
  BookmarkPlus,
  Star,
  Trash2,
  Edit2,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ViewPreset } from "./types"
import { SaveViewDialog } from "./SaveViewDialog"

interface ViewPresetSelectorProps {
  systemPresets: ViewPreset[]
  userTemplates: ViewPreset[]
  selectedPresetId: string | null
  onSelectPreset: (preset: ViewPreset) => void
  onSaveUserTemplate: (name: string, isDefault: boolean) => { success: boolean; error?: string }
  onRenameUserTemplate: (id: string, newName: string) => { success: boolean; error?: string }
  onDeleteUserTemplate: (id: string) => void
  onSetDefaultUserTemplate: (id: string) => void
  onGoToCustomize: () => void
}

export function ViewPresetSelector({
  systemPresets,
  userTemplates,
  selectedPresetId,
  onSelectPreset,
  onSaveUserTemplate,
  onRenameUserTemplate,
  onDeleteUserTemplate,
  onSetDefaultUserTemplate,
  onGoToCustomize,
}: ViewPresetSelectorProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingTemplate, setRenamingTemplate] = useState<ViewPreset | null>(null)
  const [newName, setNewName] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)

  const handleOpenRename = (template: ViewPreset) => {
    setRenamingTemplate(template)
    setNewName(template.name)
    setRenameError(null)
    setRenameDialogOpen(true)
  }

  const handleConfirmRename = () => {
    if (!renamingTemplate) return
    const res = onRenameUserTemplate(renamingTemplate.id, newName)
    if (!res.success) {
      setRenameError(res.error || "Nombre no válido.")
      return
    }
    setRenameDialogOpen(false)
    setRenamingTemplate(null)
  }

  return (
    <div className="space-y-6">
      {/* ── Header row: Title + Actions ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Vistas recomendadas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Puntos de partida optimizados para cada rol y momento operativo.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <BookmarkPlus className="size-3.5 text-slate-500" />
            Guardar como vista…
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onGoToCustomize}
            className="h-8 gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 font-medium"
          >
            <SlidersHorizontal className="size-3.5" />
            Personalizar vista →
          </Button>
        </div>
      </div>

      {/* ── Recommended System Presets Grid ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {systemPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id
          const colCount = preset.config.visibleColumnKeys.length

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                isSelected
                  ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/40"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {preset.name}
                    </span>
                    {preset.badge && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-[10px] font-medium text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 px-1.5 py-0"
                      >
                        {preset.badge}
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <span>{colCount} columnas</span>
                <span>{preset.config.compactMode ? "Modo compacto" : "Estándar"}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── User Saved Views Section ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mis vistas
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Configuraciones guardadas localmente en este navegador.
            </p>
          </div>
          {userTemplates.length > 0 && (
            <span className="text-xs font-medium text-slate-400">
              {userTemplates.length} {userTemplates.length === 1 ? "vista" : "vistas"}
            </span>
          )}
        </div>

        {userTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 px-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todavía no guardaste vistas personalizadas.
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              Ajustá columnas y apariencia, y usá &ldquo;Guardar como vista…&rdquo; para conservarla.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((template) => {
              const isSelected = selectedPresetId === template.id
              const colCount = template.config.visibleColumnKeys.length

              return (
                <div
                  key={template.id}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl border p-3 transition-all",
                    isSelected
                      ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/40"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPreset(template)}
                    className="flex-1 text-left min-w-0 pr-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {template.name}
                      </span>
                      {template.isDefault && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-[9px] text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-1 py-0 gap-0.5"
                        >
                          <Star className="size-2.5 fill-amber-500 text-amber-500" />
                          Predeterminada
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{colCount} columnas</span>
                      <span>•</span>
                      <span>{template.config.compactMode ? "Compacta" : "Estándar"}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500 mr-1">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs">
                        <DropdownMenuItem onClick={() => onSelectPreset(template)}>
                          <Sparkles className="mr-2 size-3.5 text-blue-600" />
                          Cargar vista
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenRename(template)}>
                          <Edit2 className="mr-2 size-3.5 text-slate-500" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetDefaultUserTemplate(template.id)}>
                          <Star className="mr-2 size-3.5 text-amber-500" />
                          {template.isDefault ? "Quitar predeterminada" : "Usar como predeterminada"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteUserTemplate(template.id)}
                          className="text-rose-600 focus:text-rose-700 dark:text-rose-400"
                        >
                          <Trash2 className="mr-2 size-3.5" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <SaveViewDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={onSaveUserTemplate}
      />

      {renamingTemplate && (
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Renombrar vista</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Elegí un nuevo nombre para identificar esta vista.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <Label htmlFor="rename-input" className="text-xs">
                Nombre
              </Label>
              <Input
                id="rename-input"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (renameError) setRenameError(null)
                }}
                className="h-9 text-xs"
                autoFocus
              />
              {renameError && <p className="text-xs text-rose-600">{renameError}</p>}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleConfirmRename}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
