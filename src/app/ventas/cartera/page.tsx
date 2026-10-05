"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import { AGE_LABELS, PAYMENT_WINDOWS, buildCollectionsDashboard, filterCollectionRows, invoiceLabel } from "@/lib/collections-dashboard.utils"
import { formatDecimalCurrency } from "@/lib/decimal-money"

const PAGE_SIZE = 20
const controlClass = "h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
const money = (value: bigint, currency: string) => `${currency} ${formatDecimalCurrency(value, 4).replace(/^\$ /, "")}`

export default function CollectionsPage() {
  const invoices = useInvoices()
  const payments = usePayments()
  return <CollectionsDashboard key={`${invoices.companyId ?? "none"}:${payments.companyId ?? "none"}`} invoices={invoices} payments={payments} />
}

function CollectionsDashboard({ invoices, payments }: {
  invoices: ReturnType<typeof useInvoices>; payments: ReturnType<typeof usePayments>
}) {
  const [initialized, setInitialized] = useState(false)
  const [search, setSearch] = useState("")
  const [currency, setCurrency] = useState("all")
  const [age, setAge] = useState("all")
  const [sort, setSort] = useState<"oldest" | "largest">("oldest")
  const [page, setPage] = useState(0)
  useEffect(() => { setInitialized(true) }, [])
  const companyId = invoices.companyId
  const loading = !initialized || invoices.loading || payments.loading || companyId !== payments.companyId
  const error = invoices.error || payments.error
  const dashboard = useMemo(() => buildCollectionsDashboard(
    invoices.invoices.filter((row) => row.companyId === companyId),
    payments.payments.filter((row) => row.companyId === companyId), new Date(),
  ), [companyId, invoices.invoices, payments.payments])
  const filtered = useMemo(() => filterCollectionRows(dashboard.rows, { search, currency, age, sort }), [dashboard.rows, search, currency, age, sort])
  const currencyOptions = [...new Set([...dashboard.currencies.map((entry) => entry.currency), ...dashboard.rows.flatMap((row) => row.currency ? [row.currency] : [])])].sort()
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const visibleRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const refresh = () => { void Promise.all([invoices.refresh(), payments.refresh()]) }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Cartera de cobros</h1>
          <p className="text-sm text-muted-foreground">Saldos pendientes y cobros registrados, separados por moneda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link href="/ventas/cobros">Ir a Cobros</Link></Button>
          <Button variant="outline" size="sm" asChild><Link href="/ventas/facturacion">Ir a Facturación</Link></Button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={!companyId || loading}><RefreshCw aria-hidden="true" className="size-4" />Actualizar</Button>
        </div>
      </header>
      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        Solo lectura. Se muestra el saldo informado por el backend, incluidos sus ajustes, sin recalcularlo a partir de cobros.
        La antigüedad desde emisión no indica vencimiento ni mora. Días calendario UTC; importes con cuatro decimales, sin conversión de monedas.
      </p>
      {!companyId ? <p role="status">Seleccioná una empresa para consultar la cartera.</p>
        : loading ? <p role="status" className="py-10 text-center text-muted-foreground">Cargando cartera completa…</p>
          : error ? <div role="alert" className="rounded-md border border-destructive p-4 text-sm">
            <p>No se pudo cargar la cartera completa. No se muestran totales parciales.</p><p>{error}</p>
            <Button variant="outline" size="sm" onClick={refresh} className="mt-2">Reintentar</Button>
          </div> : <>
            {dashboard.issues.length > 0 ? <div role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <p className="font-semibold">Datos a revisar</p>
              <p>Los totales incluyen solo saldos y monedas válidos. Las fechas no utilizables conservan su saldo en un grupo separado.</p>
              <ul className="mt-2 list-disc pl-5">{dashboard.issues.map((issue) => <li key={issue.label}>{issue.label}: {issue.count}</li>)}</ul>
            </div> : null}
            {dashboard.currencies.length === 0 ? <p className="rounded-md border p-5">Sin saldos válidos ni cobros registrados en los últimos 28 días.</p> : null}
            <section aria-label="Saldos por moneda" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.currencies.map((entry) => <Card key={entry.currency}>
                <CardHeader><CardTitle className="text-base">Saldo pendiente · {entry.currency}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="break-words text-2xl font-semibold tabular-nums">{money(entry.balance, entry.currency)}</p>
                  <p className="text-sm text-muted-foreground">{entry.count} facturas con saldo válido</p>
                  <dl className="space-y-2 text-sm">{Object.entries(AGE_LABELS).map(([key, label]) => <div key={key} className="flex flex-wrap justify-between gap-1">
                    <dt>{label}</dt><dd className="tabular-nums">{money(entry.ages[key as keyof typeof AGE_LABELS], entry.currency)}</dd>
                  </div>)}</dl>
                </CardContent>
              </Card>)}
            </section>
            <section aria-labelledby="priority-heading" className="space-y-3">
              <h2 id="priority-heading" className="text-base font-semibold">Facturas para priorizar</h2>
              <p className="text-sm text-muted-foreground">Los filtros afectan solo esta lista. Mayor saldo ordena dentro de cada moneda; las monedas no se comparan entre sí.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-sm">Buscar factura, cirugía o ítem<input className={controlClass} value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} /></label>
                <label className="space-y-1 text-sm">Moneda<select className={controlClass} value={currency} onChange={(event) => { setCurrency(event.target.value); setPage(0) }}>
                  <option value="all">Todas las monedas</option>{currencyOptions.map((code) => <option key={code} value={code}>{code}</option>)}<option value="invalid">Moneda inválida</option>
                </select></label>
                <label className="space-y-1 text-sm">Antigüedad desde emisión<select className={controlClass} value={age} onChange={(event) => { setAge(event.target.value); setPage(0) }}>
                  <option value="all">Todas las antigüedades</option>{Object.entries(AGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select></label>
                <label className="space-y-1 text-sm">Prioridad<select className={controlClass} value={sort} onChange={(event) => { setSort(event.target.value as "oldest" | "largest"); setPage(0) }}>
                  <option value="oldest">Más antiguas primero</option><option value="largest">Mayor saldo por moneda</option>
                </select></label>
              </div>
              <Card><CardContent className="p-0">
                {visibleRows.length === 0 ? <p role="status" className="p-6 text-sm">{dashboard.rows.length ? "Sin resultados para los filtros aplicados." : "No hay facturas abiertas con saldo pendiente."}</p>
                  : <div className="overflow-x-auto" role="region" aria-label="Lista de facturas" tabIndex={0}>
                    <table className="w-full min-w-[640px] text-sm">
                      <caption className="sr-only">Facturas abiertas con saldo backend; antigüedad desde emisión, no vencimiento</caption>
                      <thead className="border-b bg-muted/50"><tr>{["Factura", "Cirugía / Expediente", "Emisión (UTC)", "Antigüedad", "Saldo backend"].map((label) => <th scope="col" key={label} className="px-3 py-3 text-left font-medium">{label}</th>)}</tr></thead>
                      <tbody>{visibleRows.map((row) => <tr key={row.invoice.id} className="border-b last:border-0">
                        <th scope="row" className="px-3 py-3 text-left font-mono font-medium">{invoiceLabel(row.invoice)}</th>
                        <td className="px-3 py-3">{row.invoice.surgeryId || "Sin cirugía asociada"}</td>
                        <td className="px-3 py-3">{row.days === null ? AGE_LABELS[row.age] : new Date(row.invoice.issuedAt!).toLocaleDateString("es-AR", { timeZone: "UTC" })}</td>
                        <td className="px-3 py-3">{row.days === null ? "No calculable" : `${row.days} días`}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.balance === null ? "Saldo inválido" : row.currency === null ? "Moneda inválida; importe no agregado" : money(row.balance, row.currency)}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>}
              </CardContent></Card>
              <nav aria-label="Paginación de facturas" className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span role="status">{filtered.length} resultados · Página {currentPage + 1} de {pages}</span>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div>
              </nav>
            </section>
            <section aria-labelledby="payments-heading" className="space-y-3">
              <h2 id="payments-heading" className="text-base font-semibold">Tendencia de cobros registrados · últimos 28 días</h2>
              <p className="text-sm text-muted-foreground">Por fecha de cobro (UTC), del más reciente al más antiguo. Anulados excluidos; no es una proyección de cobro.</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.currencies.map((entry) => <Card key={entry.currency}>
                <CardHeader><CardTitle className="text-base">Cobros · {entry.currency}</CardTitle></CardHeader>
                <CardContent><p className="mb-3 text-sm text-muted-foreground">{entry.paymentCount} cobros registrados en el período</p><dl className="space-y-2 text-sm">{PAYMENT_WINDOWS.map((label, index) => <div key={label} className="flex flex-wrap justify-between gap-1"><dt>Hace {label}</dt><dd className="tabular-nums">{money(entry.payments[index], entry.currency)}</dd></div>)}</dl></CardContent>
              </Card>)}</div>
            </section>
          </>}
    </div>
  )
}
