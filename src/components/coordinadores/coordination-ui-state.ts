export type CoordinationBlockedReason = "unresolved" | "ambiguous" | null

export type CoordinationUiState =
  | { tag: "waiting-auth" }
  | { tag: "loading-initial" }
  | { tag: "blocked-unresolved" }
  | { tag: "blocked-ambiguous" }
  | { tag: "ready-empty" }
  | { tag: "ready-contradictory-empty" }
  | { tag: "ready-filtered-empty" }
  | { tag: "ready-populated" }
  | { tag: "refreshing"; previous: "empty" | "populated" }
  | { tag: "error-initial" }
  | { tag: "error-refresh"; previous: "empty" | "populated" }
  | { tag: "preview-denied" }

export type CoordinationUiStateInput = {
  waitingForAuth: boolean
  blockedReason?: CoordinationBlockedReason
  previewDenied?: boolean
  loading: boolean
  error: string | null
  hasSuccessfulData: boolean
  unfilteredCount: number
  filteredCount: number
  hasActiveFilters: boolean
  hasContradiction?: boolean
}

function previousLoadedState(unfilteredCount: number): "empty" | "populated" {
  return unfilteredCount === 0 ? "empty" : "populated"
}

export function deriveCoordinationUiState(
  input: CoordinationUiStateInput,
): CoordinationUiState {
  if (input.previewDenied) return { tag: "preview-denied" }
  if (input.blockedReason === "unresolved") return { tag: "blocked-unresolved" }
  if (input.blockedReason === "ambiguous") return { tag: "blocked-ambiguous" }
  if (input.waitingForAuth) return { tag: "waiting-auth" }

  if (!input.hasSuccessfulData) {
    if (input.loading) return { tag: "loading-initial" }
    if (input.error) return { tag: "error-initial" }
    return { tag: "loading-initial" }
  }

  const previous = previousLoadedState(input.unfilteredCount)
  if (input.error) return { tag: "error-refresh", previous }
  if (input.loading) return { tag: "refreshing", previous }
  if (input.unfilteredCount === 0) return { tag: "ready-empty" }

  if (input.hasContradiction) return { tag: "ready-contradictory-empty" }

  if (input.hasActiveFilters && input.filteredCount === 0) {
    return { tag: "ready-filtered-empty" }
  }

  return { tag: "ready-populated" }
}
