"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SurgeryPaginationFooterProps {
  currentPage: number
  pageSize: number
  totalResults: number
  onPageChange: (newPage: number) => void
  onPageSizeChange: (newSize: number) => void
  pageSizeOptions?: number[]
}

export function SurgeryPaginationFooter({
  currentPage,
  pageSize,
  totalResults,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: SurgeryPaginationFooterProps) {
  const isAll = pageSize === 0 || pageSize >= totalResults
  const totalPages = isAll || totalResults === 0 ? 1 : Math.ceil(totalResults / pageSize)

  const startRecord = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endRecord = isAll ? totalResults : Math.min(currentPage * pageSize, totalResults)

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-t border-slate-200/90 bg-slate-50/95 px-3 text-[11px] text-slate-600 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
      {/* ── Zona Izquierda: Conteo de resultados ── */}
      <div className="flex items-center gap-1.5 font-medium">
        {totalResults === 0 ? (
          <span>Sin cirugías para mostrar</span>
        ) : (
          <span>
            Mostrando{" "}
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              {startRecord}–{endRecord}
            </strong>{" "}
            de{" "}
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              {totalResults.toLocaleString("es-AR")}
            </strong>{" "}
            cirugías
          </span>
        )}
      </div>

      {/* ── Zona Derecha: Selector de página y navegación ── */}
      <div className="flex items-center gap-3">
        {/* Selector de tamaño */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 dark:text-slate-400">Mostrar:</span>
          <div className="flex items-center rounded border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {pageSizeOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onPageSizeChange(opt)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  pageSize === opt
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageSizeChange(0)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                pageSize === 0
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Controles de página */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          <span className="min-w-[4.5rem] text-center font-medium">
            Pág. <strong className="text-slate-900 dark:text-slate-100">{currentPage}</strong> de {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
