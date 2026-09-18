"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { apiFetch } from "@/lib/api/client"
import { supabaseBrowserClient } from "@/lib/auth/client"

const DEFAULT_COMPANY_ID = process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID

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
    setAvailabilityFeatureState(null)
    setCurrentUserLoading(false)
  }, [])

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
      completeBootstrap()
    })

    return () => {
      active = false
      if (bootstrapTimeout !== null) window.clearTimeout(bootstrapTimeout)
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !DEFAULT_COMPANY_ID) {
      clearCurrentUserContext()
      return
    }

    let active = true
    const currentUserRequestKey = `${DEFAULT_COMPANY_ID}:${session.access_token}`

    if (loadedCurrentUserRequestKeyRef.current === currentUserRequestKey) {
      setCurrentUserLoading(false)
      return
    }

    let currentUserRequest = inFlightCurrentUserRequestRef.current

    if (!currentUserRequest || currentUserRequest.key !== currentUserRequestKey) {
      currentUserRequest = {
        key: currentUserRequestKey,
        promise: apiFetch<CurrentUserResponse>(`/api/companies/${encodeURIComponent(DEFAULT_COMPANY_ID)}/me`),
      }
      inFlightCurrentUserRequestRef.current = currentUserRequest
    }

    setCurrentUserLoading(true)

    currentUserRequest.promise
      .then((data) => {
        if (!active) return
        setCurrentUser(data.user)
        setCurrentAccess(data.access)
        setActiveCompany(data.activeCompany)
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
        setActiveCompany(null)
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
  }, [clearCurrentUserContext, session])

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
      features: {
        availabilityRequests:
          availabilityFeatureState?.requestKey === `${DEFAULT_COMPANY_ID}:${session?.access_token}` &&
          availabilityFeatureState.enabled,
      },
      currentUserLoading,
      isLoading,
      isAuthenticated: Boolean(session),
      signOut,
    }),
    [activeCompany, availabilityFeatureState, currentAccess, currentUser, currentUserLoading, isLoading, session, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
