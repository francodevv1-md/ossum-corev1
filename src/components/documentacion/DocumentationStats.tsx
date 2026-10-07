"use client"

import React from "react"
import { BookOpen, FileCheck, FileClock, FileX, Layers } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface DocumentationStatsProps {
  totalSurgeries: number
  filteredSurgeries: number
}

export function DocumentationStats({
  totalSurgeries,
  filteredSurgeries,
}: DocumentationStatsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cirugías</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSurgeries}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <BookOpen className="size-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cirugías Filtradas</p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{filteredSurgeries}</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <Layers className="size-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Alcance de Datos</p>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Contratos Backend Reales
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <FileCheck className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
