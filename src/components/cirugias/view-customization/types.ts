import type { CxStatusVariant } from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"

export type ColumnDefinition = {
  key: string
  label: string
}

export type ViewDraft = {
  visibleColumnKeys: string[]
  orderedColumnKeys: string[]
  stickyColumnsEnabled: boolean
  showGroupedHeaders: boolean
  groups: GroupedHeaderPreference[]
  widths: Record<string, string>
  compactMode: boolean
  fixedColumns: string[]
  cxVariant: CxStatusVariant
}

export type ViewPreset = {
  id: string
  name: string
  badge?: string
  description: string
  source: "system" | "user"
  isDefault?: boolean
  config: ViewDraft
}

export type StoredUserTemplate = {
  id: string
  name: string
  description: string
  summary: string
  isDefault?: boolean
  config: ViewDraft
}
