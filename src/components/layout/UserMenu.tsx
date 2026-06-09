"use client"

import { LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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

export function UserMenu() {
  const { user, currentUser, currentAccess, activeCompany, signOut } = useAuth()
  const email = user?.email ?? "Usuario OSSUM COR"
  const displayName = currentUser?.displayName ?? email
  const roleLabel = currentAccess?.role ?? "Usuario OSSUM COR"
  const companyName = activeCompany?.name
  const initials = getInitials(displayName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 items-center gap-2 px-2">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden max-w-40 flex-col items-start sm:flex">
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="mr-2 size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
