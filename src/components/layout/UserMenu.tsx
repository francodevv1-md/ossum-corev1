"use client"

import { useEffect, useState } from "react"
import { LogOut, Moon, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth/AuthProvider"

function getInitials(value?: string | null) {
  if (!value) return "OC"
  const name = value.includes("@") ? (value.split("@")[0] ?? "") : value
  const parts = name.split(/[\s._-]/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || "OC"
}

interface UserMenuProps {
  compact?: boolean
  className?: string
}

export function UserMenu({ compact = false, className }: UserMenuProps) {
  const { user, currentUser, currentAccess, activeCompany, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const email = user?.email ?? "Usuario OSSUM COR"
  const displayName = currentUser?.displayName ?? email
  const roleLabel = currentAccess?.role ?? "Usuario OSSUM COR"
  const companyName = activeCompany?.name
  const initials = getInitials(displayName)
  const isDarkMode = mounted && resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex h-8 items-center gap-2 px-2 align-middle",
            compact && "w-8 justify-center gap-0 px-0",
            className,
          )}
          aria-label={compact ? "Menú de usuario" : undefined}
        >
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("hidden max-w-40 flex-col items-start sm:flex", compact && "hidden")}>
            <span className="truncate text-[11px] font-medium leading-tight">{displayName}</span>
            <span className="text-[9px] leading-tight text-muted-foreground">{roleLabel}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate">{displayName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            {companyName ? (
              <span className="truncate text-xs font-normal text-muted-foreground">{companyName}</span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 size-4" />
          Perfil pendiente
        </DropdownMenuItem>
        {mounted ? (
          <DropdownMenuItem onClick={() => setTheme(isDarkMode ? "light" : "dark")}>
            {isDarkMode ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
            {isDarkMode ? "Desactivar modo oscuro" : "Activar modo oscuro"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="mr-2 size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
