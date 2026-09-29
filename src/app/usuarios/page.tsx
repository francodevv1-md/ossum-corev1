"use client"

import React from "react"
import { UsuariosRolesView } from "@/components/configuracion/UsuariosRolesView"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import Link from "next/link"
import { Home, Users } from "lucide-react"

export default function UsuariosPage() {
  return (
    <div className="space-y-4">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" className="flex items-center gap-1">
                <Home className="size-3.5" />
                <span>Inicio</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/configuracion">Configuración</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-foreground flex items-center gap-1">
              <Users className="size-3.5 text-primary" />
              <span>Usuarios y roles</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main View */}
      <UsuariosRolesView />
    </div>
  )
}
