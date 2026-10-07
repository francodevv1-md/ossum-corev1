"use client"

import { useEffect, useRef, useState } from "react"
import { fetchRemito } from "@/lib/api/remitos"
import { renderRemitoPdf } from "@/lib/remito-pdf"

export function useRemitoPdfDownload(companyId?: string, surgeryId?: string, readStatus?: string) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const revision = useRef(0)
  useEffect(() => {
    setDownloading(false)
    setError(null)
    return () => { revision.current++; pending.current = false }
  }, [companyId, surgeryId, readStatus])

  async function download(id: string) {
    if (!companyId || !surgeryId || readStatus !== "ready" || pending.current) return
    const token = ++revision.current
    pending.current = true
    setDownloading(true)
    setError(null)
    try {
      const remito = await fetchRemito(companyId, id)
      if (revision.current !== token) return
      if (remito.id !== id || remito.companyId !== companyId || remito.surgeryId !== surgeryId) throw new Error("Remito fuera de alcance")
      const blob = await renderRemitoPdf(remito)
      if (revision.current !== token) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      try {
        link.href = url
        link.download = `Remito-${remito.visibleNumber ?? "sin-numeracion"}.pdf`
        document.body.append(link)
        link.click()
      } finally {
        link.remove()
        // Give the browser time to consume the download before releasing its URL.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch {
      if (revision.current === token) setError("No pudimos descargar el PDF de este remito. Volvé a intentar.")
    } finally {
      if (revision.current === token) { pending.current = false; setDownloading(false) }
    }
  }

  return { download, downloading, error, clearError: () => setError(null) }
}
