"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SurgeryDrawer } from "@/components/shared"
import {
  Shield, Users, Settings, Eye, Lock,
  Pencil, Trash2, CheckCircle2, XCircle,
} from "lucide-react"
import type { UserRole } from "@/types"

interface RolePermission {
  role: UserRole
  description: string
  level: "Completo" | "Avanzado" | "Intermedio" | "Básico" | "Solo lectura"
  permissions: {
    cirugias: boolean
    presupuestos: boolean
    remitos: boolean
    consumo: boolean
    facturacion: boolean
    stock: boolean
    logistica: boolean
    compras: boolean
    instrumentadores: boolean
    reportes: boolean
    configuracion: boolean
    usuarios: boolean
  }
}

const ROLES: RolePermission[] = [
  {
    role: "Administrador",
    description: "Acceso completo a todas las funcionalidades del sistema",
    level: "Completo",
    permissions: {
      cirugias: true, presupuestos: true, remitos: true, consumo: true,
      facturacion: true, stock: true, logistica: true, compras: true,
      instrumentadores: true, reportes: true, configuracion: true, usuarios: true,
    },
  },
  {
    role: "Gerencia",
    description: "Acceso de lectura y reportes. Sin edición directa",
    level: "Avanzado",
    permissions: {
      cirugias: true, presupuestos: true, remitos: true, consumo: true,
      facturacion: true, stock: true, logistica: true, compras: true,
      instrumentadores: true, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Coordinador",
    description: "Gestión de cirugías, logística y documentación",
    level: "Avanzado",
    permissions: {
      cirugias: true, presupuestos: true, remitos: true, consumo: true,
      facturacion: false, stock: true, logistica: true, compras: false,
      instrumentadores: true, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Depósito",
    description: "Gestión de stock, cajas y movimientos de inventario",
    level: "Intermedio",
    permissions: {
      cirugias: true, presupuestos: false, remitos: true, consumo: true,
      facturacion: false, stock: true, logistica: true, compras: false,
      instrumentadores: false, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Logística",
    description: "Preparación y envío de cajas. Seguimiento de envíos",
    level: "Intermedio",
    permissions: {
      cirugias: true, presupuestos: false, remitos: true, consumo: false,
      facturacion: false, stock: true, logistica: true, compras: false,
      instrumentadores: false, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Instrumentador",
    description: "Vista de cirugías asignadas y datos propios",
    level: "Básico",
    permissions: {
      cirugias: true, presupuestos: false, remitos: false, consumo: false,
      facturacion: false, stock: false, logistica: false, compras: false,
      instrumentadores: true, reportes: false, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Facturación",
    description: "Gestión de facturación, cobros y comprobantes",
    level: "Intermedio",
    permissions: {
      cirugias: true, presupuestos: true, remitos: true, consumo: true,
      facturacion: true, stock: false, logistica: false, compras: false,
      instrumentadores: false, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Administración",
    description: "Facturación, cobros y gestión administrativa",
    level: "Avanzado",
    permissions: {
      cirugias: true, presupuestos: true, remitos: true, consumo: true,
      facturacion: true, stock: true, logistica: true, compras: true,
      instrumentadores: true, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Compras",
    description: "Gestión de proveedores, OC y necesidades de compra",
    level: "Intermedio",
    permissions: {
      cirugias: true, presupuestos: false, remitos: false, consumo: false,
      facturacion: false, stock: true, logistica: false, compras: true,
      instrumentadores: false, reportes: true, configuracion: false, usuarios: false,
    },
  },
  {
    role: "Solo lectura",
    description: "Acceso de solo lectura a cirugías y reportes básicos",
    level: "Solo lectura",
    permissions: {
      cirugias: true, presupuestos: false, remitos: false, consumo: false,
      facturacion: false, stock: false, logistica: false, compras: false,
      instrumentadores: false, reportes: true, configuracion: false, usuarios: false,
    },
  },
]

const MODULES = [
  { key: "cirugias" as const, label: "Cirugías" },
  { key: "presupuestos" as const, label: "Presupuestos" },
  { key: "remitos" as const, label: "Remitos" },
  { key: "consumo" as const, label: "Consumo" },
  { key: "facturacion" as const, label: "Facturación" },
  { key: "stock" as const, label: "Stock" },
  { key: "logistica" as const, label: "Logística" },
  { key: "compras" as const, label: "Compras" },
  { key: "instrumentadores" as const, label: "Instrumentadores" },
  { key: "reportes" as const, label: "Reportes" },
  { key: "configuracion" as const, label: "Configuración" },
  { key: "usuarios" as const, label: "Usuarios" },
]

function LevelBadge({ level }: { level: string }) {
  const variantMap: Record<string, "success" | "info" | "warning" | "secondary"> = {
    "Completo": "success",
    "Avanzado": "info",
    "Intermedio": "warning",
    "Básico": "secondary",
    "Solo lectura": "secondary",
  }
  return <Badge variant={variantMap[level] || "secondary"} className="text-[10px]">{level}</Badge>
}

export default function RolesPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Roles y Permisos</h1>
          <p className="text-sm text-muted-foreground">Configuración de roles y permisos del sistema (solo lectura)</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4">
          <CardContent className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Roles definidos</span>
              <span className="text-2xl font-bold tracking-tight">{ROLES.length}</span>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Módulos</span>
              <span className="text-2xl font-bold tracking-tight">{MODULES.length}</span>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
              <span className="text-lg font-bold tracking-tight">Solo lectura</span>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">Matriz de permisos por rol</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/50 z-10">Rol</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nivel</th>
                  {MODULES.map((mod) => (
                    <th key={mod.key} className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">
                      <span className="text-xs">{mod.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((rp) => (
                  <tr key={rp.role} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-background z-10">
                      <div>
                        <p className="font-medium text-sm">{rp.role}</p>
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">{rp.description}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><LevelBadge level={rp.level} /></td>
                    {MODULES.map((mod) => (
                      <td key={mod.key} className="px-3 py-2.5 text-center">
                        {rp.permissions[mod.key] ? (
                          <CheckCircle2 className="size-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SurgeryDrawer />
    </div>
  )
}
