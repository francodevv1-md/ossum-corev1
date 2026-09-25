"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  BookOpen, FileCheck, FileX, FileClock,
  FolderOpen, FileText, Printer,
} from "lucide-react"
import type { DocumentStatus, DocumentChecklistType, Surgery } from "@/types"
import { DocumentViewerDialog, type DocumentType } from "@/components/pdf/DocumentViewerDialog"

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Incompleta", label: "Incompleta" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Completa", label: "Completa" },
  { value: "Apta para facturar", label: "Apta para facturar" },
]

export default function DocumentacionPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [selectedSurgeryForPdf, setSelectedSurgeryForPdf] = useState<Surgery | null>(null)
  const [initialDocTypeForPdf, setInitialDocTypeForPdf] = useState<DocumentType>("presupuesto")

  const openDocumentViewer = (surgery?: Surgery | null, docType: DocumentType = "presupuesto") => {
    setSelectedSurgeryForPdf(surgery || store.surgeries[0] || null)
    setInitialDocTypeForPdf(docType)
    setPdfDialogOpen(true)
  }

  const checklists = store.documentChecklists

  const filtered = useMemo(() => {
    let data = checklists.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((dc) => {
        const surgery = store.getSurgeryById(dc.surgeryId)
        return (
          dc.surgeryId.toLowerCase().includes(q) ||
          (surgery?.patient || "").toLowerCase().includes(q) ||
          (surgery?.institution || "").toLowerCase().includes(q)
        )
      })
    }
    if (statusFilter) data = data.filter((dc) => dc.status === statusFilter)
    return data
  }, [checklists, search, statusFilter, store])

  const stats = useMemo(() => {
    const total = filtered.length
    const incompletas = filtered.filter((dc) => dc.status === "Incompleta").length
    const completas = filtered.filter((dc) => dc.status === "Completa").length
    const aptasFacturar = filtered.filter((dc) => dc.status === "Apta para facturar").length
    return { total, incompletas, completas, aptasFacturar }
  }, [filtered])

  const handleToggleItem = (surgeryId: string, itemType: DocumentChecklistType, checked: boolean) => {
    store.updateDocumentationChecklist(surgeryId, itemType, checked)
    toast.success(checked ? `"${itemType}" marcado como completado` : `"${itemType}" desmarcado`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Documentación & Comprobantes</h1>
          <p className="text-sm text-muted-foreground">Emisión de comprobantes oficiales (Presupuestos, Remitos, Facturas, Órdenes de Compra y Consumo) y checklist documental</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600"
          onClick={() => openDocumentViewer(null, "presupuesto")}
        >
          <FileText className="size-4" /> Generar Comprobantes PDF
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={BookOpen} />
        <StatsCard title="Incompletas" value={stats.incompletas} icon={FileX} />
        <StatsCard title="Completas" value={stats.completas} icon={FileCheck} />
        <StatsCard title="Aptas facturar" value={stats.aptasFacturar} icon={FileClock} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Cirugía, paciente, institución..." className="w-full sm:w-72" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            {(statusFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStatusFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Cards */}
      <div className="space-y-4">
        {filtered.map((dc) => {
          const surgery = store.getSurgeryById(dc.surgeryId)
          const completedCount = dc.items.filter((i) => i.completed).length
          const totalCount = dc.items.length
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

          return (
            <Card key={dc.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-sm text-primary cursor-pointer hover:underline font-medium"
                        onClick={() => openExpediente(dc.surgeryId)}
                      >
                        {dc.surgeryId}
                      </span>
                      <StateBadge status={dc.status} />
                    </div>
                    {surgery && (
                      <p className="text-sm mt-1">
                        {surgery.patient} — {surgery.institution} — {formatDate(surgery.date)}
                      </p>
                    )}

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{completedCount}/{totalCount}</span>
                    </div>

                    {/* Checklist items */}
                    <div className="grid gap-2 mt-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dc.items.map((item) => (
                        <label
                          key={item.type}
                          className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) =>
                              handleToggleItem(dc.surgeryId, item.type, !!checked)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs ${item.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                              {item.type}
                            </span>
                            {item.completed && item.uploadedBy && (
                              <p className="text-[10px] text-muted-foreground">
                                ✓ {item.uploadedBy} {item.uploadedAt ? `— ${formatDate(item.uploadedAt)}` : ""}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 sm:ml-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-900/50 dark:hover:bg-blue-950/40"
                      onClick={() => openDocumentViewer(surgery, "remito")}
                    >
                      <Printer className="size-3.5 text-blue-600 dark:text-blue-400" /> Comprobantes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => openExpediente(dc.surgeryId)}
                    >
                      <FolderOpen className="size-3.5" /> Ver cirugía
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron checklists documentales
            </CardContent>
          </Card>
        )}
      </div>

      <SurgeryDrawer />

      <DocumentViewerDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        surgery={selectedSurgeryForPdf}
        initialDocType={initialDocTypeForPdf}
      />
    </div>
  )
}
