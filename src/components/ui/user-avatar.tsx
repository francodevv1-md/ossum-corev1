"use client"

import React from "react"
import { Blobatar } from "@blobatar/react"
import { cn } from "@/lib/utils"

export interface UserAvatarProps {
  name?: string | null
  email?: string | null
  seed?: string | null
  size?: number
  className?: string
  background?: "circle" | "squircle" | "square" | false
  animate?: "hover" | "always"
  fallbackInitials?: string
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email && email.includes("@")) {
    const local = email.split("@")[0] ?? ""
    return local.slice(0, 2).toUpperCase() || "OC"
  }
  return "OC"
}

export function UserAvatar({
  name,
  email,
  seed,
  size = 40,
  className,
  background = "squircle",
  animate = "hover",
  fallbackInitials,
}: UserAvatarProps) {
  const effectiveSeed = (seed?.trim() || name?.trim() || email?.trim() || "ossum-user").toLowerCase()
  const initials = fallbackInitials || getInitials(name, email)

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-200 select-none",
        background === "circle" && "rounded-full",
        background === "squircle" && "rounded-xl",
        background === "square" && "rounded-md",
        className,
      )}
      style={{ width: size, height: size }}
      title={name || email || "Avatar de usuario"}
    >
      <Blobatar
        name={effectiveSeed}
        size={size}
        background={background || undefined}
        animate={animate}
        className="size-full object-contain"
      />
    </div>
  )
}
