"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { formatDate } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/shared"

type Remittance = { id: string; number: string; documentDate: string; observations: string | null; lines: unknown[]; supplier: { contact: { legalName: string | null; firstName: string | null; lastName: string | null } }; goodsReceipt: { id: string; status: string } | null }
const supplierName = (row: Remittance) => row.supplier.contact.legalName || `${row.supplier.contact.firstName ?? ""} ${row.supplier.contact.lastName ?? ""}`.trim() || "Proveedor"

export default function RemitosProveedorPage() {
  const { activeCompany } = useAuth(); const router = useRouter(); const [rows, setRows] = useState<Remittance[]>([]); const [search, setSearch] = useState(""); const [error, setError] = useState("")
  useEffect(() => { if (!activeCompany) return; let cancelled = false; void apiFetch<Remittance[]>(`/api/companies/${encodeURIComponent(activeCompany.id)}/supplier-remittances`).then((result) => { if (!cancelled) setRows(result) }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron cargar remitos") }); return () => { cancelled = true } }, [activeCompany])
  const filtered = useMemo(() => rows.filter((row) => `${row.number} ${supplierName(row)}`.toLowerCase().includes(search.toLowerCase())), [rows, search])
  return <div className="space-y-4"><div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Remitos de Proveedor</h1><p className="text-sm text-muted-foreground">Comprobantes persistidos por empresa</p></div><Button onClick={() => router.push("/compras/remitos-proveedor/nuevo")}>Cargar comprobante</Button></div><Card><CardContent className="pt-4"><SearchInput value={search} onChange={setSearch} placeholder="Número, proveedor..." />{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</CardContent></Card><Card><CardContent className="p-0"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Número</th><th className="p-3 text-left">Proveedor</th><th className="p-3 text-left">Fecha</th><th className="p-3 text-right">Líneas</th><th className="p-3 text-right">Recepción</th></tr></thead><tbody>{filtered.map((row) => <tr className="border-b" key={row.id}><td className="p-3 font-mono">{row.number}</td><td className="p-3">{supplierName(row)}</td><td className="p-3">{formatDate(row.documentDate.slice(0, 10))}</td><td className="p-3 text-right">{row.lines.length}</td><td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => router.push(`/compras/remitos-proveedor/${encodeURIComponent(row.id)}/recepcion`)}>{row.goodsReceipt ? `Abrir ${row.goodsReceipt.status}` : "Iniciar recepción"}</Button></td></tr>)}{!filtered.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No se encontraron remitos de proveedor</td></tr>}</tbody></table></CardContent></Card></div>
}
