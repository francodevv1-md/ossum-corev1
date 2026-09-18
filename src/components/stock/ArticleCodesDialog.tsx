"use client"

import React, { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { Barcode, Copy, Download, Printer, QrCode } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { renderCode128BSvg } from "@/lib/code128"
import type { StockItem } from "@/data/stock-mock"

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("Valor copiado")
  } catch {
    toast.error("No se pudo copiar")
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const QR_MODES: Array<{ id: "gtin" | "url" | "code"; label: string; hint: string }> = [
  { id: "gtin", label: "GTIN", hint: "Identificación global del producto" },
  { id: "url", label: "Enlace", hint: "Abre la página del artículo" },
  { id: "code", label: "Código", hint: "Código interno (SKU)" },
]

export function ArticleCodesDialog({ item, open, onOpenChange }: {
  item: StockItem | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const [qr, setQr] = useState<string>("")
  const [qrMode, setQrMode] = useState<"gtin" | "url" | "code">("gtin")

  const code = item?.code ?? ""

  const qrValue = useMemo(() => {
    if (!item) return ""
    if (qrMode === "url") return `${typeof window !== "undefined" ? window.location.origin : ""}/stock/articulos/${item.id}`
    if (qrMode === "code") return item.code
    return item.gtin || item.code
  }, [qrMode, item])

  useEffect(() => {
    if (!open || !item) return
    let cancelled = false
    QRCode.toDataURL(qrValue, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((url) => { if (!cancelled) setQr(url) })
      .catch(() => { if (!cancelled) setQr("") })
    return () => { cancelled = true }
  }, [open, item, qrValue])

  const svg = useMemo(() => (code ? renderCode128BSvg(code) : ""), [code])
  const svgBlobUrl = useMemo(() => {
    if (!svg) return ""
    return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  }, [svg])

  if (!item) return null

  const printLabel = () => {
    const win = window.open("", "_blank", "width=340,height=520")
    if (!win) {
      toast.error("Permití las ventanas emergentes para imprimir")
      return
    }
    win.document.write(
      `<!doctype html><html><head><title>Etiqueta ${escHtml(code)}</title></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:center">` +
      `<p style="font-weight:600;margin:0 0 2px;font-size:14px">${escHtml(item.name)}</p>` +
      `<p style="font-size:12px;color:#555;margin:0 0 12px">${escHtml(code)}</p>` +
      `<div style="margin-bottom:16px">${svg}</div>` +
      `<img src="${escHtml(qr)}" style="width:180px;height:180px" alt="QR ${escHtml(qrValue)}" />` +
      `<p style="font-size:11px;color:#555;margin-top:6px">${escHtml(qrValue)}</p>` +
      `<script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>` +
      `</body></html>`,
    )
    win.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[var(--ossum-line)] px-5 py-3.5">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">Códigos del artículo</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-mono">{item.code}</span> · {item.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
          {/* Code 128 */}
          <div className="rounded-lg border border-[var(--ossum-line)] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <Barcode className="size-3.5" /> Code 128 · interno
            </div>
            <div className="flex items-center justify-center rounded bg-white px-2 py-3 [&_svg]:h-14 [&_svg]:w-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-2 truncate text-center font-mono text-xs text-gray-600" title={code}>{code}</p>
            <Button variant="outline" size="sm" className="mt-2 h-7 w-full text-xs" onClick={() => copyText(code)}>
              <Copy className="size-3.5" /> Copiar valor
            </Button>
          </div>

          {/* QR */}
          <div className="rounded-lg border border-[var(--ossum-line)] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <QrCode className="size-3.5" /> QR
              </span>
              <div className="flex overflow-hidden rounded border border-[var(--ossum-line)]" role="tablist" aria-label="Contenido del QR">
                {QR_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={qrMode === m.id}
                    onClick={() => setQrMode(m.id)}
                    className={`px-2 py-1 text-[10px] font-medium transition-colors ${qrMode === m.id ? "bg-[var(--ossum-action)] text-white" : "bg-white text-gray-500 hover:bg-[var(--ossum-surface-2)]"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center rounded bg-white px-2 py-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- QR data URL generado en cliente
                <img src={qr} alt={`QR ${qrValue}`} className="h-28 w-28" />
              ) : (
                <span className="h-28 w-28 rounded bg-gray-100" />
              )}
            </div>
            <p className="mt-2 truncate text-center font-mono text-xs text-gray-600" title={qrValue}>{qrValue}</p>
            <p className="mt-0.5 text-center text-[10px] text-gray-400">{QR_MODES.find((m) => m.id === qrMode)?.hint}</p>
            <Button variant="outline" size="sm" className="mt-2 h-7 w-full text-xs" onClick={() => copyText(qrValue)}>
              <Copy className="size-3.5" /> Copiar valor
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-[var(--ossum-line)] px-5 py-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href={svgBlobUrl} download={`${code}-barcode.svg`}><Download className="size-3.5" /> Código de barras</a>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href={qr || undefined} download={`${code}-qr.png`}><Download className="size-3.5" /> QR (PNG)</a>
          </Button>
          <Button size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={printLabel}>
            <Printer className="size-3.5" /> Imprimir etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
