"use client"

import React, { useMemo, useState } from "react"
import { AlertCircle, Building2, RefreshCw, Search, Users, X } from "lucide-react"

import { useProveedores } from "@/hooks/useProveedores"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function ProveedoresPage() {
  const { proveedores, loading, error, refresh } = useProveedores()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return proveedores
    return proveedores.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    )
  }, [proveedores, search])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[var(--ossum-action)]" />
            <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Proveedores</h1>
          </div>
          <p className="text-[11px] text-gray-500">
            Proveedores activos provenientes del maestro de contactos · {proveedores.length} en total
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void refresh()}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin motion-reduce:animate-none")} />
          Actualizar
        </Button>
      </header>

      {/* Filter / Search Bar */}
      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              aria-label="Buscar proveedores"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="h-8 text-xs"
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>

        {error && proveedores.length > 0 && (
          <div
            role="alert"
            className="mt-2 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 rounded"
          >
            <span>No se pudo actualizar: {error}. Se muestran los datos previos.</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-medium underline hover:text-amber-900"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col">
        {loading && proveedores.length === 0 ? (
          <State
            icon={RefreshCw}
            title="Cargando proveedores…"
            detail="Consultando los proveedores activos en el maestro de contactos."
            loading
          />
        ) : error && proveedores.length === 0 ? (
          <State
            icon={AlertCircle}
            title="No se pudieron cargar los proveedores"
            detail={error}
            action="Reintentar"
            onAction={() => void refresh()}
            alert
          />
        ) : proveedores.length === 0 ? (
          <State
            icon={Users}
            title="No hay proveedores registrados"
            detail="Los proveedores se administran desde el maestro de Contactos asignándoles el rol Proveedor."
          />
        ) : filtered.length === 0 ? (
          <State
            icon={Search}
            title="No se encontraron proveedores"
            detail="Probá otro texto o limpiá el filtro de búsqueda."
            action="Limpiar búsqueda"
            onAction={() => setSearch("")}
          />
        ) : (
          <div className="m-3 min-h-0 flex-1 overflow-hidden border border-[var(--ossum-line)] bg-white rounded-md shadow-2xs">
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[600px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 whitespace-nowrap bg-[var(--ossum-navy)] px-4 py-2.5 text-left font-medium text-white w-48">
                      Código
                    </th>
                    <th className="sticky top-0 z-10 whitespace-nowrap bg-[var(--ossum-navy)] px-4 py-2.5 text-left font-medium text-white">
                      Nombre / Razón Social
                    </th>
                    <th className="sticky top-0 z-10 whitespace-nowrap bg-[var(--ossum-navy)] px-4 py-2.5 text-left font-medium text-white w-32">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proveedor) => (
                    <tr
                      key={proveedor.id}
                      className="group hover:bg-[var(--ossum-surface-2)] transition-colors"
                    >
                      <td className="border-b border-[var(--ossum-line)] px-4 py-2 font-mono font-semibold text-[var(--ossum-action)]">
                        {proveedor.code}
                      </td>
                      <td className="border-b border-[var(--ossum-line)] px-4 py-2">
                        <span className="font-medium text-gray-900">{proveedor.name}</span>
                      </td>
                      <td className="border-b border-[var(--ossum-line)] px-4 py-2">
                        {proveedor.active ? (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 border-emerald-200 bg-emerald-50 px-2 text-[10px] font-medium text-emerald-700"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 border-slate-200 bg-slate-50 px-2 text-[10px] font-medium text-slate-500"
                          >
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function State({
  icon: Icon,
  title,
  detail,
  action,
  onAction,
  loading,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  detail: string
  action?: string
  onAction?: () => void
  loading?: boolean
  alert?: boolean
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-12 text-center"
      role={alert ? "alert" : loading ? "status" : undefined}
    >
      <Icon
        className={cn(
          "size-6 text-gray-400",
          loading && "animate-spin motion-reduce:animate-none",
          alert && "text-destructive"
        )}
      />
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-gray-500">{detail}</p>
      </div>
      {action && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="h-8 text-xs">
          {action}
        </Button>
      )}
    </div>
  )
}
