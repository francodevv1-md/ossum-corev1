"use client"

import React from "react"
import { useSidebar } from "./app-shell"
import { cn } from "@/lib/utils"

const MARGIN_MAP = {
  expanded: "192px",
  compact: "60px",
  hidden: "0px",
} as const

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarState } = useSidebar()

  return (
    <div
      className="flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out"
      style={{ marginLeft: MARGIN_MAP[sidebarState] }}
    >
      {children}
    </div>
  )
}
