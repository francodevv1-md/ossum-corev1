import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FilterSelect, SearchInput } from "@/components/shared"

type Props = {
  search: string
  stateFilter: string
  stateOptions: Array<{ value: string; label: string }>
  onSearchChange: (value: string) => void
  onStateFilterChange: (value: string) => void
}

export function CoordinationSecondaryFilters({ search, stateFilter, stateOptions, onSearchChange, onStateFilterChange }: Props) {
  const [open, setOpen] = useState(false)
  const active = Boolean(search || stateFilter)

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="min-h-11 w-full sm:hidden" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Más filtros{active ? " · activos" : ""}
      </Button>
      <div className={open ? "grid gap-2 sm:grid sm:grid-cols-2" : "hidden gap-2 sm:grid sm:grid-cols-2"}>
        <label>
          <span className="sr-only">Buscar casos de coordinación</span>
          <SearchInput value={search} onChange={onSearchChange} placeholder="Paciente, médico, institución o CX..." className="min-h-11 w-full" />
        </label>
        <label>
          <span className="sr-only">Filtrar por estado</span>
          <FilterSelect value={stateFilter} onChange={onStateFilterChange} options={stateOptions} className="min-h-11 w-full" />
        </label>
      </div>
    </div>
  )
}
