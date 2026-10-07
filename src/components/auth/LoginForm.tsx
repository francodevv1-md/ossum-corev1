"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) return
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabaseBrowserClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setIsSubmitting(false)

    if (signInError) {
      const message = "No se pudo iniciar sesión. Revisá el correo y la contraseña."
      setError(message)
      toast.error(message)
      return
    }

    toast.success("Sesión iniciada con éxito")
    router.replace(safeNext(searchParams.get("next")))
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1 text-left">
        <Label htmlFor="login-email" className="text-xs font-medium">
          Correo electrónico <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="login-email"
            type="email"
            required
            placeholder="usuario@districorr.com.ar"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="pl-9 h-9.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1 text-left">
        <Label htmlFor="login-password" className="text-xs font-medium">
          Contraseña <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="login-password"
            type={reveal ? "text" : "password"}
            required
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="pl-9 pr-10 h-9.5 text-sm font-mono tracking-wider"
          />
          <button
            type="button"
            onClick={() => setReveal(!reveal)}
            aria-label={reveal ? "Ocultar contraseña" : "Ver contraseña"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            tabIndex={-1}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-1.5 h-10 w-full bg-[#1D2FC0] hover:bg-[#16249A] text-white font-medium text-sm transition-all shadow-md shadow-[#1D2FC0]/20"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Iniciando sesión...
          </>
        ) : (
          "Ingresar al sistema"
        )}
      </Button>
    </form>
  )
}
