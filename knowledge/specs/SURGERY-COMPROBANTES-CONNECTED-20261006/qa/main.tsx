import React from "react"
import { createRoot } from "react-dom/client"
import { ComercialTabContent } from "@/components/expediente/ComercialTabContent"
import "@/app/globals.css"

const base = { companyId: "company-qa", surgeryId: "surgery-qa", createdAt: "2026-10-01T12:00:00Z", issuedAt: "2026-10-02T12:00:00Z", currency: "ARS", items: [] }
const rows = {
  presupuestos: [{ ...base, id: "budget-qa-001", visibleNumber: 71, state: "Aprobado", total: "125000.25", title: "Material para artroplastia", documentDate: "2026-10-01", items: [{ id: "item", description: "Prótesis de rodilla", quantity: "1", total: "125000.25" }] }],
  invoices: [{ ...base, id: "invoice-qa-001", visibleNumber: 82, type: "FV", state: "Parcialmente_cobrada", base: "presupuesto", total: "125000.25", balance: "95000.25" }],
  remitos: [{ ...base, id: "remito-qa-001", visibleNumber: 93, state: "Entregado", destinatarioSnapshot: { nombre: "Sanatorio Modelo" }, items: [{ id: "material", description: "Material quirúrgico", quantity: "2" }] }],
  payments: [{ ...base, id: "payment-qa-001", visibleNumber: 104, state: "Registrado", amount: "30000", receivedAt: "2026-10-04T12:00:00Z", imputations: [{ id: "imp", invoiceId: "invoice-qa-001", amount: "30000" }] }],
}
// Every API request terminates here. This harness never reaches a backend or DB.
window.fetch = async (input, init) => {
  const url = new URL(String(input), window.location.origin)
  const endpoint = url.pathname.split("/").at(-1) as keyof typeof rows
  if ((init?.method ?? "GET") !== "GET" || !/^\/api\/companies\/company-qa\/(presupuestos|invoices|remitos|payments)$/.test(url.pathname)) throw new Error("Unexpected QA request")
  return new Response(JSON.stringify({ data: rows[endpoint] }), { headers: { "Content-Type": "application/json" } })
}
createRoot(document.getElementById("root")!).render(
  <main className="min-h-screen bg-slate-100 px-3 py-6 text-foreground dark:bg-slate-950 sm:px-8">
    <div className="mx-auto max-w-6xl"><p className="mb-2 text-xs text-muted-foreground">Ficha CX / Expediente — datos sintéticos para QA</p>
      <ComercialTabContent surgery={{ id: "CX-QA", backendId: "surgery-qa" } as never} presupuestos={[]} comprobantes={[]} remitos={[]} resumenCobranza={{} as never} />
    </div>
  </main>
)
