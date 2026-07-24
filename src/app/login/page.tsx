"use client"

import { Suspense, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { LoginForm } from "@/components/auth/LoginForm"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export default function LoginPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground transition-colors">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.92_0.01_250_/_0.55),transparent_32%),linear-gradient(135deg,oklch(0.98_0_0)_0%,oklch(0.96_0.01_255)_48%,oklch(0.94_0.01_255)_100%)] dark:bg-[radial-gradient(circle_at_top_left,oklch(0.35_0.03_255_/_0.36),transparent_30%),linear-gradient(135deg,oklch(0.17_0.01_255)_0%,oklch(0.145_0_0)_52%,oklch(0.2_0.01_255)_100%)]" />
      <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.08] [background-image:linear-gradient(to_right,rgba(15,23,42,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.22)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(248,250,252,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(248,250,252,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-border/70 bg-background/80 backdrop-blur"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          disabled={!mounted}
          aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
        </Button>
      </div>
      <section className="relative z-10 flex w-full flex-col items-center gap-6" aria-label="Inicio de sesión OSSUM COR">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Acceso operativo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Gestión clínica y quirúrgica</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ingresá con tus credenciales para continuar con la operación diaria.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  )
}
