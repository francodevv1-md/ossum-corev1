"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ApiClientError } from "@/lib/api/client"
import { fetchDocumentation, initializeDocumentation, transitionDocumentation } from "@/lib/api/documentation"
import { canMutateDocumentation } from "@/lib/permissions/documentation"
import { isDocumentationTransitionAllowed, type DocumentationState } from "@/lib/validators/documentation.validator"
import type { SurgeryDocumentationView } from "@/lib/services/surgery-documentation.service"

// The panel mounts this hook in a keyed company/surgery scope; cleanup invalidates every outstanding response.
export function useSurgeryDocumentation(companyId: string, surgeryId: string, role: string) {
  const [documentation, setDocumentation] = useState<SurgeryDocumentationView | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const request = useRef(0)
  const active = useRef(false)
  const busy = useRef(false)
  const canMutate = canMutateDocumentation(role)

  const showError = (cause: unknown) => {
    const changed = cause instanceof ApiClientError && cause.status === 409
    setConflict(changed)
    setError(changed ? "El registro cambió. Actualice el checklist antes de volver a guardar." :
      cause instanceof ApiClientError ? cause.message : "No se pudo conectar con documentación. Intente nuevamente.")
  }

  const load = useCallback(() => {
    if (!active.current || busy.current) return
    const id = ++request.current
    return fetchDocumentation(companyId, surgeryId).then((result) => {
      if (active.current && id === request.current) {
        setDocumentation(result)
        setConflict(false)
        setError(null)
      }
    }).catch((cause: unknown) => {
      if (active.current && id === request.current) showError(cause)
    }).finally(() => {
      if (active.current && id === request.current) setLoading(false)
    })
  }, [companyId, surgeryId])

  const refresh = () => {
    if (!active.current || busy.current) return
    setLoading(true)
    setError(null)
    return load()
  }

  useEffect(() => {
    active.current = true
    void load()
    return () => { active.current = false; request.current += 1 }
  }, [load])

  async function mutate(operation: () => Promise<SurgeryDocumentationView>) {
    if (!active.current || busy.current || loading || conflict || !canMutate) return false
    busy.current = true
    const id = ++request.current
    setMutating(true)
    setError(null)
    try {
      const result = await operation()
      if (!active.current || id !== request.current) return false
      setDocumentation(result)
      return true
    } catch (cause) {
      if (active.current && id === request.current) showError(cause)
      return false
    } finally {
      busy.current = false
      if (active.current && id === request.current) setMutating(false)
    }
  }

  const initialize = () => documentation && !documentation.checklist
    ? mutate(() => initializeDocumentation(companyId, surgeryId)) : Promise.resolve(false)

  const transition = (itemId: string, state: DocumentationState, observation?: string) => {
    const item = documentation?.items.find((entry) => entry.id === itemId)
    if (!item || !isDocumentationTransitionAllowed(item.state as DocumentationState, state) ||
      (state === "observed" && !observation?.trim())) return Promise.resolve(false)
    return mutate(() => transitionDocumentation(companyId, surgeryId, item.id, {
      state, expectedUpdatedAt: item.updatedAt,
      ...(state === "observed" ? { observation: observation!.trim() } : {}),
    }))
  }

  return { documentation, loading, mutating, error, conflict, canMutate, refresh, initialize, transition }
}
