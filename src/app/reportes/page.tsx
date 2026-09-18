"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SurgeryDrawer } from "@/components/shared"
import {
  BarChart3, PieChart, TrendingUp, FileText,
  Package, Truck, DollarSign, Activity,
  Calendar, Users, Shield, ClipboardList,
  Download, Eye,
} from "lucide-react"

const REPORTS = [
  {
    id: "stock-general",
    title: "Stock General",
    description: "Reporte completo del inventario actual con cantidades, ubicaciones y estados",
    icon: Package,
    category: "Operaciones",
  },
  {
    id: "vencimientos",
    title: "Vencimientos",
    description: "Artículos vencidos y próximos a vencer con detalle de lotes y depósitos",
    icon: Calendar,
    category: "Operaciones",
  },
  {
    id: "movimientos-stock",
    title: "Movimientos de Stock",
    description: "Historial de ingresos, egresos, ajustes y traspasos por período",
    icon: BarChart3,
    category: "Operaciones",
  },
  {
    id: "cirugias-periodo",
    title: "Cirugías por Período",
    description: "Resumen de cirugías realizadas, suspendidas y canceladas por rango de fechas",
    icon: Activity,
    category: "Cirugías",
  },
  {
    id: "logistica-estado",
    title: "Estado de Logística",
    description: "Vista consolidada del estado de envíos y devoluciones",
    icon: Truck,
    category: "Logística",
  },
  {
    id: "consumo-detallado",
    title: "Consumo Detallado",
    description: "Detalle de materiales consumidos por cirugía, médico e institución",
    icon: ClipboardList,
    category: "Operaciones",
  },
  {
    id: "facturacion-pendiente",
    title: "Facturación Pendiente",
    description: "Cirugías con documentación apta para facturar pendientes de facturación",
    icon: DollarSign,
    category: "Ventas",
  },
  {
    id: "cobros-vencidos",
    title: "Cobros Vencidos",
    description: "Facturas con cobros pendientes o vencidos por cliente",
    icon: TrendingUp,
    category: "Ventas",
  },
  {
    id: "instrumentadores-actividad",
    title: "Actividad Instrumentadores",
    description: "Cirugías asignadas y pagos por instrumentador",
    icon: Users,
    category: "Recursos",
  },
  {
    id: "documentacion-status",
    title: "Estado Documentación",
    description: "Checklist documental completo por cirugía con porcentaje de completitud",
    icon: FileText,
    category: "Sistema",
  },
  {
    id: "clasificaciones-distribucion",
    title: "Distribución por Clasificación",
    description: "Distribución de cirugías por tipo de clasificación quirúrgica",
    icon: PieChart,
    category: "Cirugías",
  },
  {
    id: "trazabilidad-articulo",
    title: "Trazabilidad por Artículo",
    description: "Historial completo de movimientos y uso de un artículo específico",
    icon: Shield,
    category: "Sistema",
  },
]

const CATEGORIES = ["Operaciones", "Cirugías", "Logística", "Ventas", "Recursos", "Sistema"]

export default function ReportesPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Centro de reportes y exportaciones</p>
        </div>
      </div>

      {/* Report cards grouped by category */}
      {CATEGORIES.map((cat) => {
        const reports = REPORTS.filter((r) => r.category === cat)
        if (reports.length === 0) return null
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{cat}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => {
                const Icon = report.icon
                return (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold">{report.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Eye className="size-3" /> Vista previa
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                              <Download className="size-3" /> Exportar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      <SurgeryDrawer />
    </div>
  )
}
