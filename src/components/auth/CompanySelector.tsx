"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ActiveCompany } from "./AuthProvider"

export function CompanySelector({
  companies,
  activeCompany,
  onSelect,
}: {
  companies: ActiveCompany[]
  activeCompany: ActiveCompany | null
  onSelect: (id: string) => void
}) {
  if (companies.length < 2) return null
  return (
    <Select value={activeCompany?.id} onValueChange={onSelect}>
      <SelectTrigger aria-label="Active company" className="w-full">
        <SelectValue placeholder="Select a company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
