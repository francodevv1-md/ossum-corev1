"use client"

import React from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface DocumentationFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  onClear: () => void
}

export function DocumentationFilters({
  search,
  onSearchChange,
  onClear,
}: DocumentationFiltersProps) {
  return (
    <Card className="border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por ID, paciente, institución, médico..."
              className="h-9 pl-9 text-xs"
            />
          </div>

          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-9 gap-1 px-2.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <X className="size-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
