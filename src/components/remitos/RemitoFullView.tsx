"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, PackageSearch } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { RemitoStateSurface } from "@/components/remitos/RemitoStateSurface"
import { fetchRemito, getRemitoDestinatarioName, getRemitoVisibleNumber, type RemitoApiRow } from "@/lib/api/remitos"

function value(label: string, content: string | number | null | undefined) {
  return <div><dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">{label}</dt><dd className="mt-0.5 text-xs text-gray-800">{content ?? "—"}</dd></div>
}

export function RemitoFullView({ remitoId }: { remitoId: string }) {
  const { activeCompany, currentUserLoading } = useAuth()
  const [remito, setRemito] = useState<RemitoApiRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentUserLoading || !activeCompany?.id) return
    let active = true
    fetchRemito(activeCompany.id, remitoId)
      .then((result) => { if (active) setRemito(result) })
      .catch(() => { if (active) setError("No se pudo cargar el remito") })
    return () => { active = false }
  }, [activeCompany?.id, currentUserLoading, remitoId])

  if (error) return <div className="flex h-full items-center justify-center"><RemitoStateSurface kind="error" message={error} onRetry={() => window.location.reload()} /></div>
  if (!remito) return <div className="flex h-full items-center justify-center"><RemitoStateSurface kind="loading" /></div>

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      <div className="flex h-10 shrink-0 items-center border-b border-[var(--ossum-line)] bg-white px-5"><Link href="/remitos" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ossum-action)] hover:underline"><ArrowLeft className="size-3.5" />Volver a Remitos</Link></div>
      <main className="min-h-0 flex-1 overflow-auto p-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--ossum-line)] pb-4"><div><h1 className="font-mono text-lg font-bold text-[var(--ossum-navy)]">{getRemitoVisibleNumber(remito)}</h1><p className="mt-1 text-xs text-gray-500">{getRemitoDestinatarioName(remito)} · {remito.state.replace(/_/g, " ")} · {remito.items.length} ítems</p></div></header>
        <dl className="grid gap-4 border-b border-[var(--ossum-line)] py-4 sm:grid-cols-3 lg:grid-cols-6">{value("Destinatario", getRemitoDestinatarioName(remito))}{value("Cirugía", remito.surgeryLabel ?? remito.surgeryId)}{value("Sucursal", remito.issuedBranchLabel)}{value("Depósito", remito.branchLabel ?? remito.branchId)}{value("Transporte", remito.transportSnapshot?.nombre)}{value("Estado", remito.state.replace(/_/g, " "))}</dl>
        <section className="mt-4 overflow-auto border border-[var(--ossum-line)] bg-white"><table className="w-full min-w-[760px] text-xs"><thead className="bg-[var(--ossum-navy)] text-white"><tr>{["SKU", "Descripción", "Cantidad", "Unidad", "Lote", "Serie", "Vencimiento"].map((label) => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}</tr></thead><tbody>{remito.items.map((item) => <tr key={item.id} className="border-b border-[var(--ossum-line)]"><td className="px-3 py-2 font-mono text-gray-500">{item.sku ?? "—"}</td><td className="px-3 py-2 font-medium">{item.description}</td><td className="px-3 py-2 tabular-nums">{String(item.quantity)}</td><td className="px-3 py-2">{item.unit ?? "—"}</td><td className="px-3 py-2 font-mono">{item.lotNumber ?? "—"}</td><td className="px-3 py-2 font-mono">{item.serialNumber ?? "—"}</td><td className="px-3 py-2">{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString("es-AR") : "—"}</td></tr>)}</tbody></table>{!remito.items.length && <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-500"><PackageSearch className="size-4" />Sin material informado.</div>}</section>
      </main>
    </div>
  )
}
