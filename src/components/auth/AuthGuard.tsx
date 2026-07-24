"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShellProvider } from "@/components/layout/app-shell"
import { Header } from "@/components/layout/header"
import { MainLayout } from "@/components/layout/main-layout"
import { Sidebar } from "@/components/layout/sidebar"
import { StoreHydration } from "@/components/StoreHydration"
import { cn } from "@/lib/utils"
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
  const isCirugiasRoute = pathname.startsWith("/cirugias")

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
        {!isCirugiasRoute && <Sidebar />}
        <MainLayout>
          <Header />
          <main className={cn("flex min-h-0 flex-1 flex-col", isCirugiasRoute ? "pt-0" : "pt-2 lg:pt-3")}>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                isCirugiasRoute
                  ? "overflow-hidden rounded-[24px] border border-border/70 bg-muted/40 shadow-sm"
                  : "rounded-[22px] border border-border/50 bg-background/70 p-2 shadow-sm backdrop-blur-[2px] sm:p-3 lg:p-4"
              )}
            >
              {isCirugiasRoute ? (
                <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                  <Sidebar embedded />
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {children}
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </MainLayout>
      </TooltipProvider>
    </AppShellProvider>
  )
}
