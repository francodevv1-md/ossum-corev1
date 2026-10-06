"use client"

// Reads the active branch and its available branches for the active company.
// Fetches /api/companies/:id/branches on demand. No autoselect: the user
// must pick the first time. If the persisted branch no longer belongs to
// the active company it is dropped.
import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { useActiveBranchStore } from "@/lib/store/activeBranch"

export type BranchOption = {
  id: string
  name: string
}

export function useCurrentBranch() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id ?? null
  const persistedId = useActiveBranchStore((state) => state.activeBranchId)
  const setPersisted = useActiveBranchStore((state) => state.setActiveBranchId)
  const clearPersisted = useActiveBranchStore((state) => state.clear)

  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      clearPersisted()
      setAvailableBranches([])
      return
    }
    let active = true
    setIsLoading(true)
    setError(null)
    apiFetch<BranchOption[]>(`/api/companies/${encodeURIComponent(companyId)}/branches`)
      .then((branches) => {
        if (!active) return
        setAvailableBranches(branches)
        if (persistedId && !branches.some((b) => b.id === persistedId)) {
          clearPersisted()
        }
      })
      .catch((cause: unknown) => {
        if (!active) return
        setAvailableBranches([])
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las sucursales")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [clearPersisted, companyId, persistedId])

  const activeBranch = availableBranches.find((b) => b.id === persistedId) ?? null

  const setActiveBranchId = useCallback(
    (id: string | null) => {
      if (id !== null && !availableBranches.some((b) => b.id === id)) return
      setPersisted(id)
    },
    [availableBranches, setPersisted],
  )

  return {
    activeBranchId: activeBranch?.id ?? null,
    activeBranch,
    availableBranches,
    isLoading,
    error,
    setActiveBranchId,
  }
}
