"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseBrowserClient } from "@/lib/auth/client"

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes(":")) return "/"
  return value
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabaseBrowserClient.auth.signInWithPassword({
      email,
      password,
    })

    setIsSubmitting(false)

    if (signInError) {
      const message = "No se pudo iniciar sesión. Revisá el email y la contraseña."
      setError(message)
      toast.error(message)
      return
    }

    toast.success("Sesión iniciada")
    router.replace(safeNext(searchParams.get("next")))
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-xl shadow-black/10 backdrop-blur dark:shadow-black/30">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-primary text-sm font-semibold tracking-tight text-primary-foreground shadow-sm">
          OC
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl tracking-tight text-card-foreground">OSSUM COR</CardTitle>
          <CardDescription className="text-muted-foreground">ERP quirúrgico</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
