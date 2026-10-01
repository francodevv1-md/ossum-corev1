"use client"

import { useSyncExternalStore, useState, useEffect } from "react"
import Link from "next/link"
import { LogOut, Moon, MoreHorizontal, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
  mobile?: boolean
  className?: string
}

export function UserMenu({ compact = false, sidebar = false, mobile = false, className }: UserMenuProps) {
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
  const [mobileOpen, setMobileOpen] = useState(false)

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

  // ponytail: mobile renders a compact one-line trigger and opens a
  // Bottom Sheet with the full menu (email / empresa / theme / sign out).
  // The previous DropdownMenu could overflow viewport on narrow phones.
  if (mobile) {
    return (
      <>
        <Button
          variant="ghost"
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-md px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-accent",
            className,
          )}
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú de usuario"
        >
          <UserAvatar
            seed={effectiveSeed}
            size={32}
            background={avatarBg}
            animate="hover"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {email}
            </div>
          </div>
          <MoreHorizontal className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
            <SheetHeader className="px-5 pt-3">
              <SheetTitle className="text-base">Mi cuenta</SheetTitle>
              <SheetDescription className="text-xs">
                {roleLabel}
                {companyName ? ` · ${companyName}` : null}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-2 px-3 pb-2 pt-1">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <UserAvatar seed={effectiveSeed} size={40} background={avatarBg} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {email}
                  </div>
                </div>
              </div>
              <ul className="flex flex-col gap-1" role="list">
                <li>
                  <Link
                    href="/perfil"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-800 transition active:scale-[0.99] active:bg-slate-100 hover:bg-slate-50 dark:text-slate-100 dark:active:bg-slate-800 dark:hover:bg-slate-900"
                  >
                    <User className="size-4 shrink-0" aria-hidden />
                    Mi Perfil
                  </Link>
                </li>
                {mounted ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                      className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-800 transition active:scale-[0.99] active:bg-slate-100 hover:bg-slate-50 dark:text-slate-100 dark:active:bg-slate-800 dark:hover:bg-slate-900"
                    >
                      {isDarkMode ? <Sun className="size-4 shrink-0" aria-hidden /> : <Moon className="size-4 shrink-0" aria-hidden />}
                      {isDarkMode ? "Desactivar modo oscuro" : "Activar modo oscuro"}
                    </button>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition active:scale-[0.99] active:bg-red-50 hover:bg-red-50 dark:text-red-400 dark:active:bg-red-950/30 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="size-4 shrink-0" aria-hidden />
                    Cerrar sesión
                  </button>
                </li>
              </ul>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

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