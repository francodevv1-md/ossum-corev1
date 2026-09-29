"use client"

import React from "react"
import { motion } from "framer-motion"
import { formatCurrency } from "@/lib/formatters"
import type { ComputedInvoiceTotals } from "@/hooks/useInvoiceForm"
import { Sparkles, Percent, ShieldCheck } from "lucide-react"

interface InvoiceStickySummaryProps {
  totals: ComputedInvoiceTotals
  currency?: string
  layout?: "horizontal" | "card"
}

export function InvoiceStickySummary({
  totals,
  currency = "ARS",
  layout = "horizontal",
}: InvoiceStickySummaryProps) {
  if (layout === "card") {
    return (
      <div className="rounded-lg border border-slate-300 dark:border-slate-800 bg-card p-3 shadow-xs space-y-2 text-xs">
        <div className="flex items-center justify-between border-b pb-1.5 font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
          <span>Resumen de Liquidación</span>
          <span className="font-mono text-foreground">{currency}</span>
        </div>

        <div className="space-y-1 font-mono text-xs">
          {/* Neto */}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal Neto:</span>
            <span className="font-semibold text-foreground">{formatCurrency(totals.subtotalNeto)}</span>
          </div>

          {/* Descuento */}
          {totals.totalDescuento > 0 ? (
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Percent className="size-3" /> Descuento:
              </span>
              <span className="font-semibold">-{formatCurrency(totals.totalDescuento)}</span>
            </div>
          ) : null}

          {/* IVA */}
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span>IVA Total:</span>
            <span className="font-semibold">+{formatCurrency(totals.totalIva)}</span>
          </div>

          {/* Desglose alícuotas */}
          <div className="pl-2 text-[10px] text-muted-foreground space-y-0.5 border-l-2 border-emerald-500/30">
            {totals.gravado21 > 0 ? (
              <div className="flex justify-between">
                <span>IVA 21% (Base {formatCurrency(totals.gravado21)}):</span>
                <span>{formatCurrency(totals.iva21)}</span>
              </div>
            ) : null}
            {totals.gravado105 > 0 ? (
              <div className="flex justify-between">
                <span>IVA 10.5% (Base {formatCurrency(totals.gravado105)}):</span>
                <span>{formatCurrency(totals.iva105)}</span>
              </div>
            ) : null}
            {totals.noGravadoExento > 0 ? (
              <div className="flex justify-between">
                <span>No gravado / Exento:</span>
                <span>{formatCurrency(totals.noGravadoExento)}</span>
              </div>
            ) : null}
          </div>

          {/* Percepciones */}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Percepciones (IIBB):</span>
            <span className="font-semibold text-foreground">{formatCurrency(totals.totalPercepciones)}</span>
          </div>
        </div>

        {/* Total Hero */}
        <div className="pt-2 border-t border-border flex items-center justify-between bg-primary/10 p-2 rounded-md">
          <div className="flex items-center gap-1 text-primary font-bold text-xs">
            <Sparkles className="size-3.5" />
            <span>TOTAL:</span>
          </div>
          <span className="font-mono font-black text-primary text-base">
            {formatCurrency(totals.total)}
          </span>
        </div>

        {/* Saldo proyectado */}
        <div className="flex items-center justify-between text-[11px] pt-1 px-1 font-mono text-muted-foreground">
          <span>Saldo proyectado:</span>
          <span className="font-bold text-foreground">{formatCurrency(totals.balance)}</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-slate-300/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 px-3.5 py-2 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      {/* ─── Desglose Compacto (Izquierda) ─── */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Subtotal */}
        <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Neto:</span>
          <span className="font-mono font-bold text-foreground">{formatCurrency(totals.subtotalNeto)}</span>
        </div>

        {/* Descuento si existe */}
        {totals.totalDescuento > 0 ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md text-amber-700 dark:text-amber-400">
            <Percent className="size-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Dto:</span>
            <span className="font-mono font-bold">-{formatCurrency(totals.totalDescuento)}</span>
          </div>
        ) : null}

        {/* IVA Total + Alícuotas */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-emerald-700 dark:text-emerald-400">
          <span className="text-[10px] uppercase font-bold tracking-wider">IVA:</span>
          <span className="font-mono font-bold">{formatCurrency(totals.totalIva)}</span>

          <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-emerald-500/30">
            {totals.gravado21 > 0 ? (
              <span className="text-[9px] font-mono opacity-85">21%: {formatCurrency(totals.gravado21)}</span>
            ) : null}
            {totals.gravado105 > 0 ? (
              <span className="text-[9px] font-mono opacity-85 ml-1">10.5%: {formatCurrency(totals.gravado105)}</span>
            ) : null}
            {totals.noGravadoExento > 0 ? (
              <span className="text-[9px] font-mono opacity-85 ml-1">Ex.: {formatCurrency(totals.noGravadoExento)}</span>
            ) : null}
          </div>
        </div>

        {/* Percepciones */}
        {totals.totalPercepciones > 0 ? (
          <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Percep:</span>
            <span className="font-mono font-bold text-foreground">{formatCurrency(totals.totalPercepciones)}</span>
          </div>
        ) : null}

        {/* Saldo proyectado */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-muted-foreground font-mono text-[11px]">
          <span>Saldo proyectado:</span>
          <span className="font-bold text-foreground">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      {/* ─── Hero Total Factura (Derecha) ─── */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="flex items-center gap-2.5 bg-linear-to-r from-primary/20 via-primary/15 to-primary/10 border-2 border-primary/40 px-3.5 py-1 rounded-md shadow-xs ml-auto"
      >
        <div className="flex items-center gap-1">
          <Sparkles className="size-3.5 text-primary animate-pulse" />
          <span className="text-[11px] uppercase font-extrabold text-primary tracking-wider">Total {currency}:</span>
        </div>
        <span className="font-mono font-black text-primary text-base tracking-tight">
          {formatCurrency(totals.total)}
        </span>
      </motion.div>
    </motion.div>
  )
}
