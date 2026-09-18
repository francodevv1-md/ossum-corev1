"use client"

import { FolderSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CirugiasEmptyStateProps {
  onClearFilters?: () => void
  onNewSurgery?: () => void
  hasActiveFilters: boolean
}

export function CirugiasEmptyState({ onClearFilters, onNewSurgery, hasActiveFilters }: CirugiasEmptyStateProps) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <FolderSearch className="size-10 text-muted-foreground/40" />

          <p className="text-sm text-muted-foreground">No se encontraron cirugías con los filtros aplicados</p>

          {hasActiveFilters && (
            <>
              <p className="text-xs text-muted-foreground/70">Probá ajustar o limpiar los filtros</p>
              {onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </>
          )}

          {onNewSurgery && (
            <Button size="sm" onClick={onNewSurgery}>
              Nueva cirugía
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
