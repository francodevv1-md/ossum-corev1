import { Suspense } from "react"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.10),transparent_32%),linear-gradient(135deg,rgba(226,232,240,0.58)_0%,rgba(248,250,252,0.95)_48%,rgba(241,245,249,0.88)_100%)]" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:28px_28px]" />
      <section className="relative z-10 flex w-full flex-col items-center gap-6" aria-label="Inicio de sesión OSSUM COR">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Acceso operativo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Gestión clínica y quirúrgica</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
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
