"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { supabaseBrowserClient } from "@/lib/auth/client"

type AuthContextValue = {
  session: Session | null
  user: User | null
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

  const signOut = useCallback(async () => {
    await supabaseBrowserClient.auth.signOut()
    setSession(null)
    router.replace("/login")
  }, [router])

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
      isLoading,
      isAuthenticated: Boolean(session),
      signOut,
    }),
    [isLoading, session, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
