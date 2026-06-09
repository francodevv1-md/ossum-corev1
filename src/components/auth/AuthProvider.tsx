"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
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
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  currentUser: InternalCurrentUser | null
  currentAccess: CurrentUserAccess | null
  activeCompany: ActiveCompany | null
  currentUserLoading: boolean
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<InternalCurrentUser | null>(null)
  const [currentAccess, setCurrentAccess] = useState<CurrentUserAccess | null>(null)
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(null)
  const [currentUserLoading, setCurrentUserLoading] = useState(false)

  const clearCurrentUserContext = useCallback(() => {
    setCurrentUser(null)
    setCurrentAccess(null)
    setActiveCompany(null)
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

    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !DEFAULT_COMPANY_ID) {
      clearCurrentUserContext()
      return
    }

    let active = true
    setCurrentUserLoading(true)

    apiFetch<CurrentUserResponse>(`/api/companies/${encodeURIComponent(DEFAULT_COMPANY_ID)}/me`)
      .then((data) => {
        if (!active) return
        setCurrentUser(data.user)
        setCurrentAccess(data.access)
        setActiveCompany(data.activeCompany)
      })
      .catch(() => {
        if (!active) return
        setCurrentUser(null)
        setCurrentAccess(null)
        setActiveCompany(null)
      })
      .finally(() => {
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
      router.replace("/")
    }
  }, [isLoading, pathname, router, session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      currentUser,
      currentAccess,
      activeCompany,
      currentUserLoading,
      isLoading,
      isAuthenticated: Boolean(session),
      signOut,
    }),
    [activeCompany, currentAccess, currentUser, currentUserLoading, isLoading, session, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
