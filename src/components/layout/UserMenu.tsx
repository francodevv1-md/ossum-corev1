"use client"

import { useSyncExternalStore } from "react"
import { LogOut, Moon, MoreHorizontal, Sun, User } from "lucide-react"
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
  sidebar?: boolean
  className?: string
}

export function UserMenu({ compact = false, sidebar = false, className }: UserMenuProps) {
  const { user, currentUser, currentAccess, activeCompany, signOut } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const email = user?.email ?? "Usuario OSSUM COR"
  const displayName = currentUser?.displayName ?? email
  const roleLabel = currentAccess?.role ?? "Usuario OSSUM COR"
  const companyName = activeCompany?.name
  const initials = getInitials(displayName)
  const isDarkMode = mounted && resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex h-8 items-center gap-2 px-2 align-middle",
            compact && "w-8 justify-center gap-0 px-0",
            sidebar && "justify-start rounded-md px-1.5 hover:bg-[#F3F3F3] dark:hover:bg-accent",
            className,
          )}
          aria-label={compact ? "Menú de usuario" : undefined}
        >
          <Avatar className={cn("size-6", sidebar && "size-[30px]")}>
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "min-w-0 max-w-40 flex-1 flex-col items-start",
            compact ? "hidden" : sidebar ? "flex" : "hidden sm:flex",
          )}>
            <span className={cn("w-full truncate text-[11px] font-medium leading-tight", sidebar && "text-[12px] text-[#071935] dark:text-foreground")}>{displayName}</span>
            <span className={cn("w-full truncate text-[9px] leading-tight text-muted-foreground", sidebar && "mt-0.5 text-[10px] text-[#858A94]")}>{roleLabel}</span>
          </div>
          {sidebar && !compact ? <MoreHorizontal className="ml-auto size-4 shrink-0 text-[#858A94]" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={sidebar ? "right" : "bottom"} align="end" className="w-60">
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
