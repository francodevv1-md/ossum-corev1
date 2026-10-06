"use client"

// Compact branch picker for the header. Hidden when the company has 0 or 1
// branches (the latter is shown as a label, not a dropdown). Renders a Select
// when 2+ branches are available.
import { useCurrentBranch } from "@/hooks/useCurrentBranch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BranchSelector() {
  const { activeBranch, availableBranches, isLoading, error, setActiveBranchId } = useCurrentBranch()

  if (isLoading && availableBranches.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
        Sucursal: …
      </div>
    )
  }

  if (error && availableBranches.length === 0) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive"
        title={error}
      >
        Sucursal: error
      </div>
    )
  }

  if (availableBranches.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
        Sin sucursales
      </div>
    )
  }

  if (availableBranches.length === 1) {
    const only = availableBranches[0]
    return (
      <div className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[11px] text-foreground/80">
        <span className="text-muted-foreground">Sucursal: </span>
        <span className="font-medium">{only?.name ?? "—"}</span>
      </div>
    )
  }

  return (
    <Select
      value={activeBranch?.id ?? ""}
      onValueChange={(value) => {
        if (value === "__clear__") {
          setActiveBranchId(null)
          return
        }
        setActiveBranchId(value)
      }}
    >
      <SelectTrigger aria-label="Sucursal activa" className="h-7 w-[180px] text-[11px]">
        <SelectValue placeholder="Seleccionar sucursal" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear__">Todas las sucursales</SelectItem>
        {availableBranches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
