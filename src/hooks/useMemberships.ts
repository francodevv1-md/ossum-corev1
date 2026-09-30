"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  type CreateMembershipPayload,
  type ManagedMembershipItem,
  type UpdateMembershipPayload,
  createCompanyMembershipApi,
  deleteCompanyMembershipApi,
  getCompanyMembershipsApi,
  resetMembershipPasswordApi,
  updateCompanyMembershipApi,
} from "@/lib/api/memberships"

export function useMemberships() {
  const { activeCompany, user } = useAuth()
  const companyId = activeCompany?.id

  const [items, setItems] = useState<ManagedMembershipItem[]>([])
  const [totalAdmins, setTotalAdmins] = useState(0)
  const [canManage, setCanManage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const fetchMemberships = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCompanyMembershipsApi(companyId)
      setItems(data.items)
      setTotalAdmins(data.totalAdmins)
      setCanManage(data.canManage)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar usuarios"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchMemberships()
  }, [fetchMemberships])

  const createMembership = useCallback(
    async (payload: CreateMembershipPayload) => {
      if (!companyId) throw new Error("No hay empresa activa")
      setIsMutating(true)
      try {
        const created = await createCompanyMembershipApi(companyId, payload)
        setItems((prev) => [created, ...prev])
        toast.success(`Usuario "${created.name}" agregado a la empresa`)
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear usuario"
        toast.error(message)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [companyId]
  )

  const updateMembership = useCallback(
    async (membershipId: string, payload: UpdateMembershipPayload) => {
      if (!companyId) throw new Error("No hay empresa activa")
      setIsMutating(true)
      try {
        const updated = await updateCompanyMembershipApi(companyId, membershipId, payload)
        setItems((prev) =>
          prev.map((item) => (item.id === membershipId ? updated : item))
        )
        toast.success(`Usuario "${updated.name}" actualizado`)
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar usuario"
        toast.error(message)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [companyId]
  )

  const toggleMembershipStatus = useCallback(
    async (item: ManagedMembershipItem) => {
      if (item.isLastAdmin && item.isActive) {
        toast.error("No se puede desactivar al único Administrador activo de la empresa.")
        return
      }
      return updateMembership(item.id, { isActive: !item.isActive })
    },
    [updateMembership]
  )

  const deleteMembership = useCallback(
    async (membershipId: string) => {
      if (!companyId) throw new Error("No hay empresa activa")
      setIsMutating(true)
      try {
        await deleteCompanyMembershipApi(companyId, membershipId)
        setItems((prev) => prev.filter((item) => item.id !== membershipId))
        toast.success("Membresía eliminada de la empresa")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al eliminar membresía"
        toast.error(message)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [companyId]
  )

  const resetPassword = useCallback(
    async (membershipId: string) => {
      if (!companyId) throw new Error("No hay empresa activa")
      setIsMutating(true)
      try {
        const res = await resetMembershipPasswordApi(companyId, membershipId)
        toast.success(res.message)
        return res
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al restablecer clave"
        toast.error(message)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [companyId]
  )

  return {
    items,
    totalAdmins,
    canManage,
    isLoading,
    error,
    isMutating,
    refresh: fetchMemberships,
    createMembership,
    updateMembership,
    toggleMembershipStatus,
    deleteMembership,
    resetPassword,
  }
}
