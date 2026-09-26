"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { apiFetch } from "@/lib/api/client"
import { supabaseBrowserClient } from "@/lib/auth/client"

const ACTIVE_COMPANY_STORAGE_KEY = "ossum.activeCompanyId"

export type InternalCurrentUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
}

export type CurrentUserAccess = {
  role: string
}

export type ActiveCompany = {
  id: string
  name: string
}

type CurrentUserResponse = {
  user: InternalCurrentUser
  access: CurrentUserAccess
  activeCompany: ActiveCompany
  features?: {
    availabilityRequests?: boolean
  }
}

type CompaniesResponse = {
  companies: ActiveCompany[]
  singleCompanyId: string | null
}

export type AuthFeatures = {
  availabilityRequests: boolean
}

type AvailabilityFeatureState = {
  requestKey: string
  enabled: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  currentUser: InternalCurrentUser | null
  currentAccess: CurrentUserAccess | null
  activeCompany: ActiveCompany | null
  availableCompanies: ActiveCompany[]
  selectActiveCompany: (id: string) => void
  features: AuthFeatures
  currentUserLoading: boolean
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const INITIAL_SESSION_TIMEOUT_MS = 10_000

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes(":")) return "/"
  return value
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<InternalCurrentUser | null>(null)
  const [currentAccess, setCurrentAccess] = useState<CurrentUserAccess | null>(null)
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(null)
  const [availableCompanies, setAvailableCompanies] = useState<ActiveCompany[]>([])
  const [availabilityFeatureState, setAvailabilityFeatureState] = useState<AvailabilityFeatureState | null>(null)
  const [currentUserLoading, setCurrentUserLoading] = useState(false)
  const loadedCurrentUserRequestKeyRef = useRef<string | null>(null)
  const inFlightCurrentUserRequestRef = useRef<{
    key: string
    promise: Promise<CurrentUserResponse>
  } | null>(null)

  const clearCurrentUserContext = useCallback(() => {
    loadedCurrentUserRequestKeyRef.current = null
    inFlightCurrentUserRequestRef.current = null
    setCurrentUser(null)
    setCurrentAccess(null)
    setActiveCompany(null)
    setAvailableCompanies([])
    setAvailabilityFeatureState(null)
    setCurrentUserLoading(false)
  }, [])

  const selectActiveCompany = useCallback((id: string) => {
    const company = availableCompanies.find((candidate) => candidate.id === id)
    if (!company) return
    window.sessionStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, company.id)
    loadedCurrentUserRequestKeyRef.current = null
    setCurrentUser(null)
    setCurrentAccess(null)
    setActiveCompany(company)
    setAvailabilityFeatureState(null)
  }, [availableCompanies])

  const signOut = useCallback(async () => {
    await supabaseBrowserClient.auth.signOut()
    setSession(null)
    clearCurrentUserContext()
    router.replace("/login")
  }, [clearCurrentUserContext, router])

  useEffect(() => {
    let active = true
    let bootstrapTimeout: number | null = null

    const completeBootstrap = () => {
      if (bootstrapTimeout !== null) {
        window.clearTimeout(bootstrapTimeout)
        bootstrapTimeout = null
      }
      if (active) setIsLoading(false)
    }

    bootstrapTimeout = window.setTimeout(completeBootstrap, INITIAL_SESSION_TIMEOUT_MS)

    void supabaseBrowserClient.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .catch(() => {
        // A failed bootstrap has the same protected-route outcome as no session.
      })
      .finally(completeBootstrap)

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) clearCurrentUserContext()
      completeBootstrap()
    })

    return () => {
      active = false
      if (bootstrapTimeout !== null) window.clearTimeout(bootstrapTimeout)
      subscription.subscription.unsubscribe()
    }
  }, [clearCurrentUserContext])

  useEffect(() => {
    if (!session) {
      return
    }

    let active = true
    apiFetch<CompaniesResponse>("/api/me/companies")
      .then((data) => {
        if (!active) return
        setAvailableCompanies(data.companies)
        const restored = window.sessionStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
        const selectedId = data.singleCompanyId ?? restored
        const selected = data.companies.find(({ id }) => id === selectedId) ?? null
        setActiveCompany(selected)
        if (!selected) window.sessionStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY)
      })
      .catch(() => {
        if (active) clearCurrentUserContext()
      })
      .finally(() => {
        if (active) setCurrentUserLoading(false)
      })
    return () => { active = false }
  }, [clearCurrentUserContext, session])

  useEffect(() => {
    if (!session || !activeCompany) return

    let active = true
    const currentUserRequestKey = `${activeCompany.id}:${session.access_token}`

    if (loadedCurrentUserRequestKeyRef.current === currentUserRequestKey) {
      setCurrentUserLoading(false)
      return
    }

    let currentUserRequest = inFlightCurrentUserRequestRef.current

    if (!currentUserRequest || currentUserRequest.key !== currentUserRequestKey) {
      currentUserRequest = {
        key: currentUserRequestKey,
        promise: apiFetch<CurrentUserResponse>(`/api/companies/${encodeURIComponent(activeCompany.id)}/me`),
      }
      inFlightCurrentUserRequestRef.current = currentUserRequest
    }

    setCurrentUserLoading(true)

    currentUserRequest.promise
      .then((data) => {
        if (!active) return
        setCurrentUser(data.user)
        setCurrentAccess(data.access)
        setAvailabilityFeatureState({
          requestKey: currentUserRequestKey,
          enabled: data.features?.availabilityRequests === true,
        })
        loadedCurrentUserRequestKeyRef.current = currentUserRequestKey
      })
      .catch(() => {
        if (!active) return
        setCurrentUser(null)
        setCurrentAccess(null)
        setAvailabilityFeatureState(null)
        loadedCurrentUserRequestKeyRef.current = null
      })
      .finally(() => {
        if (inFlightCurrentUserRequestRef.current === currentUserRequest) {
          inFlightCurrentUserRequestRef.current = null
        }
        if (!active) return
        setCurrentUserLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeCompany, session])

  useEffect(() => {
    const handleAuthExpired = () => {
      void signOut()
    }

    window.addEventListener("ossum:auth-expired", handleAuthExpired)
    return () => window.removeEventListener("ossum:auth-expired", handleAuthExpired)
  }, [signOut])

  useEffect(() => {
    if (pathname === "/login" && session && !isLoading) {
      const params = new URLSearchParams(window.location.search)
      router.replace(safeNext(params.get("next")))
    }
  }, [isLoading, pathname, router, session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      currentUser,
      currentAccess,
      activeCompany,
      availableCompanies,
      selectActiveCompany,
      features: {
        availabilityRequests:
          availabilityFeatureState?.requestKey === `${activeCompany?.id}:${session?.access_token}` &&
          availabilityFeatureState.enabled,
      },
      currentUserLoading,
      isLoading,
      isAuthenticated: Boolean(session),
      signOut,
    }),
    [activeCompany, availabilityFeatureState, availableCompanies, currentAccess, currentUser, currentUserLoading, isLoading, selectActiveCompany, session, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
