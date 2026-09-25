"use client"

import Link from "next/link"
import { ShieldCheck, UserCircle, ExternalLink, Activity } from "lucide-react"

export function AdminTopBar() {
  return (
    <header className="w-full bg-[#071935] text-white px-4 py-3 border-b border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#1D2FC0] flex items-center justify-center font-bold text-white text-xs tracking-wider">
            OS
          </div>
          <span className="font-semibold tracking-tight text-base sm:text-lg">OSSUM COR</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Centro de Control</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono font-medium">Admin Coordinadores</span>
        </div>
      </div>

      {/* Navigation & User */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <Link
          href="/coordinadores/mi-bandeja"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
        >
          <UserCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Ir a Mi Bandeja</span>
          <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
        </Link>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline font-mono">En vivo</span>
        </div>
      </div>
    </header>
  )
}
