"use client"

import { useSyncExternalStore, useState, useEffect } from "react"
import Link from "next/link"
import { LogOut, Moon, MoreHorizontal, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { UserAvatar } from "@/components/ui/user-avatar"
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
  const isDarkMode = mounted && resolvedTheme === "dark"

  const [avatarSeed, setAvatarSeed] = useState<string>("")
  const [avatarBg, setAvatarBg] = useState<"squircle" | "circle" | "square" | false>("squircle")

  useEffect(() => {
    const updateFromStorage = () => {
      if (typeof window === "undefined") return
      const stored = localStorage.getItem("ossum_avatar_seed")
      const storedBg = localStorage.getItem("ossum_avatar_bg")
      setAvatarSeed(stored || email)
      if (storedBg === "none") setAvatarBg(false)
      else if (storedBg === "circle" || storedBg === "squircle" || storedBg === "square") setAvatarBg(storedBg)
    }

    updateFromStorage()
    window.addEventListener("ossum_avatar_changed", updateFromStorage)
    return () => window.removeEventListener("ossum_avatar_changed", updateFromStorage)
  }, [email])

  const effectiveSeed = avatarSeed || email

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
          <UserAvatar
            seed={effectiveSeed}
            size={sidebar ? 30 : 24}
            background={avatarBg}
            animate="hover"
            className="shrink-0"
          />
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
        <DropdownMenuLabel className="p-2.5">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              seed={effectiveSeed}
              size={36}
              background={avatarBg}
              animate="hover"
              className="shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate font-semibold text-xs text-foreground">{displayName}</span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">{email}</span>
              {companyName ? (
                <span className="truncate text-[10px] font-normal text-blue-600 dark:text-blue-400">{companyName}</span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil" className="flex items-center w-full cursor-pointer">
            <User className="mr-2 size-4" />
            Mi Perfil
          </Link>
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
