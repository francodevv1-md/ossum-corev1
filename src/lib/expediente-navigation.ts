export type ExpedienteNotificationTab = "novedades"

type SearchParamsLike = {
  get(name: string): string | null
}

export function buildExpedienteLink(input: {
  surgeryId: string
  tab?: ExpedienteNotificationTab
  entryId?: string | null
}) {
  const params = new URLSearchParams()
  params.set("id", input.surgeryId)

  if (input.tab) {
    params.set("tab", input.tab)
  }

  const entryId = input.entryId?.trim()
  if (entryId) {
    params.set("entryId", entryId)
  }

  return `/expediente?${params.toString()}`
}

export function buildNotificationExpedienteLink(input: {
  surgeryId: string
  entryId?: string | null
}) {
  const entryId = input.entryId?.trim()

  return buildExpedienteLink(
    entryId
      ? {
        surgeryId: input.surgeryId,
        tab: "novedades",
        entryId,
      }
      : {
        surgeryId: input.surgeryId,
      }
  )
}

export function buildNotificationCirugiaLink(surgeryId: string) {
  return `/cirugias?${new URLSearchParams({ id: surgeryId }).toString()}`
}

export function normalizeExpedienteTabParam(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase()

  if (normalized === "novedades" || normalized === "seguimiento") {
    return "novedades" as const
  }

  return null
}

export function resolveExpedienteLandingTab(searchParams: SearchParamsLike) {
  const tab = normalizeExpedienteTabParam(searchParams.get("tab"))

  if (tab !== "novedades") {
    return null
  }

  return getExpedienteEntryParam(searchParams) ? tab : null
}

export function getExpedienteEntryParam(searchParams: SearchParamsLike) {
  const entryId = searchParams.get("entryId")?.trim()
  if (entryId) return entryId

  const sourceEntityId = searchParams.get("sourceEntityId")?.trim()
  if (sourceEntityId) return sourceEntityId

  return undefined
}
