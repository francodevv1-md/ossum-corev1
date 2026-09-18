"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/AuthProvider"
import { canAccessGlobalCoordination } from "@/lib/permissions/coordination"
import { useOrtoTrackStore } from "@/lib/store"

export function CoordinationGlobalAccessBoundary({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { currentAccess, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const clearBackendSurgeries = useOrtoTrackStore((state) => state.clearBackendSurgeries)
  const roleLoading = isLoading || (isAuthenticated && (currentUserLoading || currentAccess === null))
  const canAccessGlobal = canAccessGlobalCoordination(currentAccess?.role)

  useEffect(() => {
    if (roleLoading || canAccessGlobal) return
    clearBackendSurgeries()
    router.replace("/coordinadores/mi-bandeja")
  }, [canAccessGlobal, clearBackendSurgeries, roleLoading, router])

  if (roleLoading) {
    return (
      <div className="p-5" role="status" aria-live="polite" aria-busy="true">
        Verificando acceso a Coordinación…
      </div>
    )
  }

  if (!canAccessGlobal) {
    return (
      <div className="p-5" role="status" aria-live="polite">
        Redirigiendo a Mi bandeja…
      </div>
    )
  }

  return children
}
