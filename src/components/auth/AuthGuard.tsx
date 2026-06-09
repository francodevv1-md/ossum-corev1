"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShellProvider } from "@/components/layout/app-shell"
import { Header } from "@/components/layout/header"
import { MainLayout } from "@/components/layout/main-layout"
import { Sidebar } from "@/components/layout/sidebar"
import { StoreHydration } from "@/components/StoreHydration"
import { useAuth } from "./AuthProvider"

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Verificando sesión…
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const isLogin = pathname === "/login"

  useEffect(() => {
    if (!isLogin && !isLoading && !isAuthenticated) {
      const next = pathname && pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/"
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [isAuthenticated, isLoading, isLogin, pathname, router])

  if (isLogin) return <>{children}</>
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <LoadingScreen />

  return (
    <AppShellProvider>
      <StoreHydration />
      <TooltipProvider delayDuration={300}>
        <Sidebar />
        <MainLayout>
          <Header />
          <main className="flex-1 p-3 lg:p-4">{children}</main>
        </MainLayout>
      </TooltipProvider>
    </AppShellProvider>
  )
}
