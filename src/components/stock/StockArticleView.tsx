"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"

import { STOCK_ITEMS } from "@/data/stock-mock"
import { StockArticleFicha } from "@/components/stock/StockArticleSheet"

export function StockArticleView({ id }: { id: string }) {
  const item = STOCK_ITEMS.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Package className="size-5 text-muted-foreground" />
        <div>
          <p className="font-medium">Artículo no encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">El artículo que buscás no existe o fue dado de baja.</p>
        </div>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--ossum-line)] bg-white px-5">
        <Link href="/stock" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ossum-action)] hover:underline">
          <ArrowLeft className="size-3.5" /> Volver a Stock
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <StockArticleFicha item={item} />
      </div>
    </div>
  )
}
