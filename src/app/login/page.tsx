"use client"

import React, { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  ChevronLeftIcon,
  Moon,
  ShuffleIcon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/LoginForm"
import { OssumCorLogo } from "@/components/brand/OssumCorLogo"

export default function LoginPage() {
  return (
    <div className="relative min-h-svh bg-background text-foreground flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8">
      <PageBackdrop />
      <div className="relative mx-auto flex w-full max-w-[1080px] items-center justify-center">
        <div className="relative grid w-full grid-cols-1 md:grid-cols-2 overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/10">
          <LeftPanel />
          <RightPanel />
        </div>
      </div>
    </div>
  )
}

function PageBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: [
          "radial-gradient(60% 50% at 10% 10%, color-mix(in srgb, #1D2FC0 12%, transparent), transparent 65%)",
          "radial-gradient(50% 50% at 90% 100%, color-mix(in srgb, #14D8E6 10%, transparent), transparent 65%)",
        ].join(", "),
      }}
    />
  )
}

type Palette = {
  name: string
  colors: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ]
}

const PALETTES: Palette[] = [
  {
    name: "Ossum Core",
    colors: [
      [0.02, 0.08, 0.22],
      [0.06, 0.26, 0.68],
      [0.08, 0.82, 0.90],
      [0.03, 0.12, 0.32],
    ],
  },
  {
    name: "Aurora Boreal",
    colors: [
      [0.05, 0.08, 0.16],
      [0.10, 0.32, 0.48],
      [0.42, 0.20, 0.58],
      [0.06, 0.10, 0.18],
    ],
  },
  {
    name: "Deep Ocean",
    colors: [
      [0.02, 0.06, 0.14],
      [0.08, 0.40, 0.62],
      [0.15, 0.75, 0.82],
      [0.03, 0.09, 0.22],
    ],
  },
  {
    name: "Cobalt Slate",
    colors: [
      [0.04, 0.04, 0.08],
      [0.12, 0.18, 0.38],
      [0.22, 0.42, 0.70],
      [0.05, 0.08, 0.16],
    ],
  },
  {
    name: "Cyber Med",
    colors: [
      [0.04, 0.06, 0.12],
      [0.06, 0.42, 0.52],
      [0.55, 0.10, 0.38],
      [0.05, 0.05, 0.12],
    ],
  },
]

function LeftPanel() {
  const [paletteIndex, setPaletteIndex] = useState(0)
  const palette = PALETTES[paletteIndex]

  const shuffle = () => {
    setPaletteIndex((current) => {
      let next = current
      while (next === current) {
        next = Math.floor(Math.random() * PALETTES.length)
      }
      return next
    })
  }

  return (
    <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-[#071935] p-6 lg:p-8 xl:p-10 min-h-[560px]">
      <MeshShader palette={palette} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, transparent 35%, rgba(4, 16, 40, 0.75) 100%)",
        }}
      />

      {/* Top action bar */}
      <div className="relative z-10 flex items-start justify-between">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md bg-black/30 px-2 py-0.5 font-mono text-[10px] text-white/75 uppercase tracking-[0.2em] backdrop-blur-sm transition-colors hover:text-white"
        >
          <ChevronLeftIcon className="size-3" />
          Inicio
        </Link>
        <ShuffleButton onClick={shuffle} paletteName={palette.name} />
      </div>

      {/* Middle content */}
      <div className="relative z-10 max-w-sm my-auto py-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-md mb-4">
          <span className="size-1.5 rounded-full bg-[#14D8E6] animate-pulse" />
          <span className="font-semibold tracking-wider uppercase text-[9px]">OSSUM COR ERP</span>
        </div>

        <h2
          className="font-semibold text-2xl lg:text-3xl leading-snug text-white tracking-tight"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.65)" }}
        >
          <span>Gestión clínica y</span>
          <br />
          <span className="text-[#14D8E6]">quirúrgica</span>{" "}
          <span className="text-white/65">de alta precisión.</span>
        </h2>
        <p
          className="mt-3 text-xs lg:text-sm text-white/75 leading-relaxed"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.65)" }}
        >
          Trazabilidad completa, cajas de implantes, expedientes y facturación quirúrgica en tiempo real.
        </p>
      </div>

      {/* Bottom footer */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40 font-mono pt-3 border-t border-white/10">
        <span>v2.0 • Districorr Salud</span>
        <span>Arquitectura Quirúrgica</span>
      </div>
    </div>
  )
}

function ShuffleButton({
  onClick,
  paletteName,
}: {
  onClick: () => void
  paletteName: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-black/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14D8E6]/50"
    >
      <ShuffleIcon className="size-3 transition-transform group-hover:rotate-45" />
      <span className="font-mono text-[9px] uppercase tracking-[0.15em]">
        {paletteName}
      </span>
    </button>
  )
}

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG_SRC = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;
  float t = u_time * 0.00015;

  vec2 p0 = vec2(0.30 + sin(t * 0.70) * 0.25, 0.25 + cos(t * 0.60) * 0.20);
  vec2 p1 = vec2(0.75 + cos(t * 0.50) * 0.20, 0.70 + sin(t * 0.80) * 0.20);
  vec2 p2 = vec2(0.50 + sin(t * 0.40 + 1.0) * 0.30, 0.50 + cos(t * 0.70) * 0.25);
  vec2 p3 = vec2(0.20 + cos(t * 0.55) * 0.20, 0.85 + sin(t * 0.45) * 0.15);

  float r = 0.55;
  float d0 = pow(1.0 - smoothstep(0.0, r, distance(uv, p0)), 1.4);
  float d1 = pow(1.0 - smoothstep(0.0, r, distance(uv, p1)), 1.4);
  float d2 = pow(1.0 - smoothstep(0.0, r, distance(uv, p2)), 1.4);
  float d3 = pow(1.0 - smoothstep(0.0, r, distance(uv, p3)), 1.4);

  float total = d0 + d1 + d2 + d3 + 0.0001;
  vec3 col = (u_c0 * d0 + u_c1 * d1 + u_c2 * d2 + u_c3 * d3) / total;

  // subtle grain
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.025;

  gl_FragColor = vec4(col, 1.0);
}`

function MeshShader({ palette }: { palette: Palette }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const targetRef = useRef(palette.colors)
  const currentRef = useRef(palette.colors.map((c) => [...c]) as Palette["colors"])

  useEffect(() => {
    targetRef.current = palette.colors
  }, [palette])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vs || !fs) return

    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const posLoc = gl.getAttribLocation(prog, "a_position")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "u_resolution")
    const uTime = gl.getUniformLocation(prog, "u_time")
    const uC0 = gl.getUniformLocation(prog, "u_c0")
    const uC1 = gl.getUniformLocation(prog, "u_c1")
    const uC2 = gl.getUniformLocation(prog, "u_c2")
    const uC3 = gl.getUniformLocation(prog, "u_c3")

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = now - start
      const k = 0.06
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          currentRef.current[i][j] +=
            (targetRef.current[i][j] - currentRef.current[i][j]) * k
        }
      }
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      const c = currentRef.current
      gl.uniform3f(uC0, c[0][0], c[0][1], c[0][2])
      gl.uniform3f(uC1, c[1][0], c[1][1], c[1][2])
      gl.uniform3f(uC2, c[2][0], c[2][1], c[2][2])
      gl.uniform3f(uC3, c[3][0], c[3][1], c[3][2])
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 block h-full w-full"
    />
  )
}

function RightPanel() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="relative flex flex-col justify-between bg-card text-foreground p-6 sm:p-8 lg:p-10">
      {/* Top right theme toggle */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          disabled={!mounted}
          aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      {/* Main form section */}
      <div className="mx-auto flex w-full max-w-[340px] sm:max-w-[360px] flex-col justify-center py-2 sm:py-4">
        {/* Brand mark */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 p-2 shadow-xs border border-border">
            <OssumCorLogo className="size-8" />
          </div>
          <div className="mt-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              OSSUM <span className="text-[#1D2FC0] dark:text-[#14D8E6]">COR</span>
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
              ERP Quirúrgico
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="mt-5 mb-4 text-center">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Acceso Operativo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresá tus credenciales para continuar.
          </p>
        </div>

        {/* Credentials Form (Solo email y contraseña) */}
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
              Cargando formulario...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 pt-3 text-center">
        <p className="text-[10px] text-muted-foreground">
          Sistema de uso exclusivo para personal autorizado de Districorr.
        </p>
      </div>
    </div>
  )
}
