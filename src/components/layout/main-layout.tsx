"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useSidebar } from "./app-shell"
import { MobileAppBar } from "./MobileAppBar"
import { cn } from "@/lib/utils"

const MARGIN_MAP = {
  expanded: "248px",
  compact: "56px",
  hidden: "0px",
} as const

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { sidebarState } = useSidebar()
  const isCirugiasRoute = pathname.startsWith("/cirugias")
  const sidebarOffset = isCirugiasRoute
    ? "0px"
    : MARGIN_MAP[sidebarState]

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-muted/[0.26] px-1 transition-[margin,padding] duration-300 ease-in-out lg:ml-[var(--shell-sidebar-offset)]",
        isCirugiasRoute
          ? "h-[100dvh] overflow-hidden pb-0 lg:px-1 lg:pb-0"
          : "pb-1 lg:px-2 lg:pb-2"
      )}
      style={{ ["--shell-sidebar-offset" as string]: sidebarOffset }}
    >
      {/* ponytail: mobile gets a single global app bar (menu + bell).
          Desktop header keeps the existing route label + sidebar toggle. */}
      <MobileAppBar />
      {children}
    </div>
  )
}
