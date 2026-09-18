import { describe, expect, it } from "vitest"

import {
  deriveCoordinationUiState,
  type CoordinationUiStateInput,
} from "@/components/coordinadores/coordination-ui-state"

const loadedInput: CoordinationUiStateInput = {
  waitingForAuth: false,
  blockedReason: null,
  previewDenied: false,
  loading: false,
  error: null,
  hasSuccessfulData: true,
  unfilteredCount: 3,
  filteredCount: 3,
  hasActiveFilters: false,
}

describe("deriveCoordinationUiState", () => {
  it("aplica precedencia de denegación y bloqueos antes de carga/error", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      previewDenied: true,
      blockedReason: "ambiguous",
      loading: true,
      error: "falló",
    })).toEqual({ tag: "preview-denied" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      blockedReason: "unresolved",
      loading: true,
      error: "falló",
    })).toEqual({ tag: "blocked-unresolved" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      blockedReason: "ambiguous",
    })).toEqual({ tag: "blocked-ambiguous" })
  })

  it("mantiene waiting-auth separado de loading inicial", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      waitingForAuth: true,
      hasSuccessfulData: false,
    })).toEqual({ tag: "waiting-auth" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      hasSuccessfulData: false,
    })).toEqual({ tag: "loading-initial" })
  })

  it("no deriva un vacío real antes de una lectura exitosa", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      hasSuccessfulData: false,
      unfilteredCount: 0,
      filteredCount: 0,
    })).toEqual({ tag: "loading-initial" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      loading: true,
      error: "error anterior",
      hasSuccessfulData: false,
      unfilteredCount: 0,
      filteredCount: 0,
    })).toEqual({ tag: "loading-initial" })
  })

  it("separa error inicial de error de refresh preservando el estado previo", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      hasSuccessfulData: false,
      error: "falló",
    })).toEqual({ tag: "error-initial" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      error: "falló",
    })).toEqual({ tag: "error-refresh", previous: "populated" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      error: "falló",
      unfilteredCount: 0,
      filteredCount: 0,
    })).toEqual({ tag: "error-refresh", previous: "empty" })
  })

  it("separa refresh de carga inicial y conserva empty/populated previo", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      loading: true,
    })).toEqual({ tag: "refreshing", previous: "populated" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      loading: true,
      unfilteredCount: 0,
      filteredCount: 0,
    })).toEqual({ tag: "refreshing", previous: "empty" })
  })

  it("distingue ready real-empty, filtered-empty y populated", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      unfilteredCount: 0,
      filteredCount: 0,
      hasActiveFilters: true,
    })).toEqual({ tag: "ready-empty" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      filteredCount: 0,
      hasActiveFilters: true,
    })).toEqual({ tag: "ready-filtered-empty" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      filteredCount: 0,
      hasActiveFilters: false,
    })).toEqual({ tag: "ready-populated" })
  })

  it("prioriza contradicción sobre filtered-empty pero nunca sobre true-empty", () => {
    expect(deriveCoordinationUiState({
      ...loadedInput,
      filteredCount: 0,
      hasActiveFilters: true,
      hasContradiction: true,
    })).toEqual({ tag: "ready-contradictory-empty" })

    expect(deriveCoordinationUiState({
      ...loadedInput,
      unfilteredCount: 0,
      filteredCount: 0,
      hasActiveFilters: true,
      hasContradiction: true,
    })).toEqual({ tag: "ready-empty" })
  })
})
