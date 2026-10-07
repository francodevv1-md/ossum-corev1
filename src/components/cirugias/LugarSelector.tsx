"use client"

import React, { useState, useMemo } from "react"
import { Check, ChevronsUpDown, MapPin, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"

interface LugarSelectorProps {
  provincia: string
  localidad: string
  onChange: (value: { provincia: string; localidad: string }) => void
  disabled?: boolean
  error?: string
  placeholder?: string
  className?: string
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

interface LocationOption {
  id: string
  localidad: string
  provincia: string
  label: string
  searchKey: string
}

export function LugarSelector({
  provincia,
  localidad,
  onChange,
  disabled = false,
  error,
  placeholder = "Buscar localidad y provincia (ej: Curuzú Cuatiá, Corrientes)...",
  className,
}: LugarSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Pre-calculate all standard combinations
  const allLocations = useMemo<LocationOption[]>(() => {
    const list: LocationOption[] = []
    
    // Add specific localities with provinces
    for (const prov of PROVINCIAS_ARGENTINA) {
      const locs = LOCALIDADES_POR_PROVINCIA[prov] || []
      for (const loc of locs) {
        if (loc === "Otra") continue
        list.push({
          id: `${loc}-${prov}`,
          localidad: loc,
          provincia: prov,
          label: `${loc}, ${prov}`,
          searchKey: `${normalize(loc)} ${normalize(prov)} ${normalize(prov)} ${normalize(loc)}`,
        })
      }
      // Also allow selecting just the province
      list.push({
        id: `prov-${prov}`,
        localidad: "",
        provincia: prov,
        label: `${prov} (Provincia entera)`,
        searchKey: normalize(prov),
      })
    }
    return list
  }, [])

  // Filter based on search query
  const filteredLocations = useMemo(() => {
    const q = normalize(searchQuery)
    if (!q) {
      // Prioritize some common ones or current province if any
      if (provincia) {
        return allLocations
          .filter((loc) => normalize(loc.provincia) === normalize(provincia))
          .slice(0, 20)
      }
      return allLocations.slice(0, 25)
    }

    const tokens = q.split(" ").filter(Boolean)
    return allLocations
      .filter((loc) => tokens.every((token) => loc.searchKey.includes(token)))
      .slice(0, 30)
  }, [allLocations, searchQuery, provincia])

  const displayText = useMemo(() => {
    if (localidad && provincia) {
      return `${localidad}, ${provincia}`
    }
    if (localidad) return localidad
    if (provincia) return provincia
    return ""
  }, [localidad, provincia])

  const handleSelect = (loc: string, prov: string) => {
    onChange({ localidad: loc, provincia: prov })
    setOpen(false)
    setSearchQuery("")
  }

  const handleCustomText = () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    // Check if input looks like "Localidad, Provincia"
    const parts = trimmed.split(",").map((p) => p.trim())
    if (parts.length >= 2) {
      const matchedProv = PROVINCIAS_ARGENTINA.find(
        (p) => normalize(p) === normalize(parts[1])
      )
      onChange({
        localidad: parts[0],
        provincia: matchedProv || parts[1],
      })
    } else {
      onChange({
        localidad: trimmed,
        provincia: provincia || "Corrientes",
      })
    }
    setOpen(false)
    setSearchQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ localidad: "", provincia: "" })
  }

  return (
    <div className={cn("space-y-1 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full h-8 justify-between text-left font-normal text-sm px-3 active:scale-[0.99] transition-transform duration-150 ease-out",
              !displayText && "text-muted-foreground",
              error && "border-destructive text-destructive",
              disabled && "bg-muted/50 cursor-not-allowed opacity-80"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{displayText || placeholder}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {displayText && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Limpiar lugar"
                >
                  <X className="size-3" />
                </span>
              )}
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width,420px)] min-w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Escribí localidad y provincia..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9 text-sm"
            />
            <CommandList className="max-h-[260px] overflow-y-auto">
              {filteredLocations.length === 0 && !searchQuery.trim() && (
                <CommandEmpty>No se encontraron lugares.</CommandEmpty>
              )}

              {searchQuery.trim() && (
                <CommandGroup heading="Personalizado">
                  <CommandItem
                    value="custom-text"
                    onSelect={handleCustomText}
                    className="flex items-center gap-2 cursor-pointer text-emerald-700 dark:text-emerald-400 font-medium"
                  >
                    <Plus className="size-3.5 shrink-0" />
                    <span>Usar: &quot;{searchQuery.trim()}&quot;</span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Localidades y Provincias">
                {filteredLocations.map((item) => {
                  const isSelected =
                    normalize(item.localidad) === normalize(localidad) &&
                    normalize(item.provincia) === normalize(provincia)

                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item.localidad, item.provincia)}
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span className={cn(isSelected && "font-semibold text-foreground")}>
                          {item.label}
                        </span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
