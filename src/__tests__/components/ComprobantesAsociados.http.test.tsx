import React from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { PaymentApiRow } from "@/lib/api/payments"

const mocks = vi.hoisted(() => ({ companyId: "company-a" as string | undefined, token: vi.fn() }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.companyId ? { id: mocks.companyId } : null }) }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.token }))
// The API clients and apiFetch remain real; all requests terminate at mocked fetch.
import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"

function budget(overrides: Partial<PresupuestoApiRow> = {}): PresupuestoApiRow {
  return {
    id: "budget-real", visibleNumber: 71, companyId: "company-a", surgeryId: "surgery-a",
    familyId: "family", branchId: null, clientContactId: null, payerContactId: null,
    parentPresupuestoId: null, sourcePresupuestoId: null, versionNumber: 1, slot: "CURRENT", revision: 1,
    state: "Emitido", title: null, currency: "ARS", documentDate: "2026-10-01", paymentTerms: null,
    priceListCode: null, legend: null, notes: null, generalDiscountRate: "0", commercialSnapshot: null,
    commercial: null, subtotal: "1250.25", discountTotal: "0", taxTotal: "0", total: "1250.25",
    validUntil: null, issuedAt: "2026-10-01T10:00:00Z", approvedAt: null, rejectedAt: null,
    createdById: null, updatedById: null, metadata: null, createdAt: "2026-09-30T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z", items: [], actions: [], ...overrides,
  }
}
function invoice(overrides: Partial<InvoiceApiRow> = {}): InvoiceApiRow {
  return {
    id: "invoice-real", visibleNumber: 82, companyId: "company-a", surgeryId: "surgery-a",
    presupuestoId: null, consumoId: null, base: "manual", state: "Emitida", type: "FV", currency: "ARS",
    subtotal: "900", discountTotal: "0", taxTotal: "0", total: "900", paidTotal: "300", balance: "600",
    issuedAt: "2026-10-02T10:00:00Z", cancelledAt: null, createdById: null, updatedById: null,
    metadata: null, createdAt: "2026-09-30T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z", items: [], ...overrides,
  }
}
function remittance(overrides: Partial<RemitoApiRow> = {}): RemitoApiRow {
  return { id: "remito-real", visibleNumber: 93, companyId: "company-a", surgeryId: "surgery-a", state: "Emitido",
    issuedAt: "2026-10-03T10:00:00Z", createdAt: "2026-10-03T10:00:00Z", destinatarioSnapshot: { nombre: "Hospital" },
    items: [{ id: "material", description: "Material quirúrgico", quantity: "2" }], ...overrides } as RemitoApiRow
}
function payment(overrides: Partial<PaymentApiRow> = {}): PaymentApiRow {
  return { id: "payment-real", visibleNumber: 104, companyId: "company-a", surgeryId: "surgery-a", state: "Registrado",
    amount: "300", currency: "ARS", receivedAt: "2026-10-04T10:00:00Z", imputations: [{ id: "imputation", invoiceId: "invoice-real", amount: "300" }], ...overrides } as PaymentApiRow
}
function commercialResponse(url: URL, budgets: PresupuestoApiRow[] = [budget()], invoices: InvoiceApiRow[] = [invoice()]) {
  return response(url.pathname.endsWith("presupuestos") ? budgets : url.pathname.endsWith("invoices") ? invoices : [])
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(status >= 400 ? { error: { code: "read_rejected", message: "Lectura rechazada" } } : { data }), { status, headers: { "Content-Type": "application/json" } })
}
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(res => { resolve = res })
  return { promise, resolve }
}
function panel(backendId: string | undefined = "surgery-a") {
  return <ComprobantesAsociados surgery={{ id: "CX-visible-not-backend", backendId } as Surgery}
    comprobantes={[{ id: "legacy-invoice", number: "legacy-number", amount: 999999 }] as never}
    presupuestos={[{ id: "legacy-budget", total: 999999 }] as never}
    resumenCobranza={{ saldoPendiente: 999999, facturas: [] } as never} />
}
type Request = { url: string; method: string; auth: string | null }
let requests: Request[]
let unexpected: string[]
let handler: (url: URL) => Response | Promise<Response>

beforeEach(() => {
  mocks.companyId = "company-a"
  mocks.token.mockResolvedValue("mock-token")
  requests = []; unexpected = []
  handler = url => commercialResponse(url)
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://mock.invalid")
    const method = init?.method ?? "GET"
    requests.push({ url: String(input), method, auth: new Headers(init?.headers).get("Authorization") })
    // Exact method/endpoint/query-key allowlist: no mutations or accidental other endpoints.
    const isPayments = url.pathname.endsWith("payments")
    if (method !== "GET" || !/^\/api\/companies\/[^/]+\/(presupuestos|invoices|remitos|payments)$/.test(url.pathname) ||
      [...url.searchParams.keys()].sort().join(",") !== (isPayments ? "skip,take" : "skip,surgeryId,take") || (!isPayments && !url.searchParams.get("surgeryId"))) {
      unexpected.push(`${method} ${url}`)
      throw new Error(`Unexpected HTTP: ${method} ${url}`)
    }
    return Promise.resolve(handler(url))
  }))
})
afterEach(() => {
  cleanup(); vi.unstubAllGlobals()
  expect(unexpected).toEqual([])
})

describe("Comprobantes backend read through real HTTP clients", () => {
  it("uses backend scope and fields, never legacy debt or placeholder actions", async () => {
    render(panel())
    expect(screen.getByRole("status")).toHaveTextContent("Cargando")
    const table = await screen.findByRole("table")
    const pr = within(table).getByText("budget-real").closest("tr")!
    const fv = within(table).getByText("invoice-real").closest("tr")!
    expect(pr).toHaveTextContent("71")
    expect(pr).toHaveTextContent("01/10/2026")
    expect(pr).toHaveTextContent("Emitido")
    expect(pr).toHaveTextContent("1.250,25 ARS")
    expect(pr).toHaveTextContent("No aplica")
    expect(fv).toHaveTextContent("82")
    expect(fv).toHaveTextContent("Emitida")
    expect(fv).toHaveTextContent("900,00 ARS")
    expect(fv).toHaveTextContent("600,00 ARS")
    expect(screen.queryByText(/legacy/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Abrir PR 71" })).toBeInTheDocument()
    expect(screen.getByText(/Datos del sistema/)).toHaveTextContent("no disponibles en esta vista")
    expect(requests).toHaveLength(4)
    for (const request of requests) {
      expect(request.url).toMatch(/^\/api\/companies\/company-a\/(?:(presupuestos|invoices|remitos)\?surgeryId=surgery-a&|payments\?)take=500&skip=0$/)
      expect(request.auth).toBe("Bearer mock-token")
    }
  })

  it("distinguishes drafts, absence of numbering, and missing balance from zero balance", async () => {
    handler = url => commercialResponse(url, [budget({ visibleNumber: null, state: "Borrador" })], [
      invoice({ visibleNumber: null, state: "Borrador", issuedAt: null, balance: undefined }),
      invoice({ id: "paid-invoice", state: "Cobrada", balance: "0" }),
    ])
    render(panel())
    await screen.findByRole("table")
    expect(screen.getAllByText("Sin numeración")).toHaveLength(2)
    expect(within(screen.getByRole("table")).getAllByText("Borrador")).toHaveLength(4)
    expect(screen.getByText("invoice-real").closest("tr")).toHaveTextContent("No disponible")
    expect(screen.getByText("paid-invoice").closest("tr")).toHaveTextContent("0,00 ARS")
  })

  it("loads every page for both endpoints with the supported surgery filter", async () => {
    handler = url => {
      const first = url.searchParams.get("skip") === "0"
      return commercialResponse(url,
        first ? Array.from({ length: 500 }, (_, i) => budget({ id: `pr-${i}` })) : [budget({ id: "last-budget" })]
        , first ? Array.from({ length: 500 }, (_, i) => invoice({ id: `fv-${i}` })) : [invoice({ id: "last-invoice" })])
    }
    render(panel())
    await screen.findByText("last-invoice")
    expect(screen.getByText("last-budget")).toBeInTheDocument()
    expect(requests).toHaveLength(6)
    expect(requests.filter(r => r.url.endsWith("skip=500"))).toHaveLength(2)
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar comprobante" }), { target: { value: "last-budget" } })
    expect(screen.queryByText("last-invoice")).not.toBeInTheDocument()
    expect(screen.getByText("1 visibles")).toBeInTheDocument()
  }, 20000)

  it.each(["presupuestos", "invoices", "remitos", "payments"])("fails closed for %s errors and retries without local fallback", async endpoint => {
    handler = url => url.pathname.endsWith(endpoint) ? response(null, 503) : commercialResponse(url)
    render(panel())
    expect(await screen.findByRole("alert")).toHaveTextContent("Lectura rechazada")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText(/legacy/)).not.toBeInTheDocument()
    handler = () => response([])
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }))
    expect(screen.getByRole("status")).toHaveTextContent("Cargando")
    expect(await screen.findByText("Sin comprobantes vinculados a esta cirugía.")).toBeInTheDocument()
  })

  it("keeps missing company, missing backend identity and empty data distinct", async () => {
    mocks.companyId = undefined
    const view = render(panel())
    expect(screen.getByRole("status")).toHaveTextContent("Seleccioná una empresa")
    mocks.companyId = "company-a"
    view.rerender(<ComprobantesAsociados surgery={{ id: "CX-visible-not-backend" } as Surgery} comprobantes={[]} presupuestos={[]} resumenCobranza={{} as never} />)
    expect(screen.getByRole("status")).toHaveTextContent("no tiene identidad backend")
    expect(requests).toHaveLength(0)
    handler = () => response([])
    view.rerender(panel())
    await screen.findByText("Sin comprobantes vinculados a esta cirugía.")
    expect(requests).toHaveLength(4)
  })

  it.each([ ["surgery", false], ["company", false], ["surgery", true], ["company", true] ] as const)("discards late responses after changing %s (error=%s)", async (scope, fails) => {
    const lateBudget = deferred(); const lateInvoice = deferred()
    handler = url => {
      const oldScope = url.pathname.includes("company-a") && url.searchParams.get("surgeryId") === "surgery-a"
      if (oldScope && url.pathname.endsWith("presupuestos")) return lateBudget.promise
      if (oldScope && url.pathname.endsWith("invoices")) return lateInvoice.promise
      return response(url.pathname.endsWith("presupuestos") ? [budget({ id: "new-budget", companyId: mocks.companyId!, surgeryId: scope === "surgery" ? "surgery-b" : "surgery-a" })] : [])
    }
    const view = render(panel())
    await act(async () => { await Promise.resolve() })
    if (scope === "company") mocks.companyId = "company-b"
    view.rerender(panel(scope === "surgery" ? "surgery-b" : "surgery-a"))
    await screen.findByText("new-budget")
    await act(async () => { lateBudget.resolve(response([budget()])); lateInvoice.resolve(fails ? response(null, 503) : response([invoice()])) })
    expect(screen.getByText("new-budget")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText("budget-real")).not.toBeInTheDocument()
  })

  it("hides already loaded rows on scope change and rejects mismatched response scope", async () => {
    const view = render(panel())
    await screen.findByText("invoice-real")
    handler = () => response([])
    mocks.companyId = "company-b"
    view.rerender(panel("surgery-b"))
    expect(screen.queryByText("invoice-real")).not.toBeInTheDocument()
    await screen.findByText("Sin comprobantes vinculados a esta cirugía.")
    handler = url => response(url.pathname.endsWith("presupuestos") ? [budget()] : [])
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("no corresponde a la empresa y cirugía")
    expect(screen.queryByText("budget-real")).not.toBeInTheDocument()
  })

  it("lists remittances and payments, filters by type/state, and opens real read-only details", async () => {
    handler = url => response(url.pathname.endsWith("remitos") ? [remittance()] : url.pathname.endsWith("payments") ? [payment()] : url.pathname.endsWith("invoices") ? [invoice()] : [])
    render(panel())
    await screen.findByText("remito-real")
    expect(screen.getByText("payment-real")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remitos 1" }))
    expect(screen.queryByText("payment-real")).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole("combobox", { name: "Estado del comprobante" }), { target: { value: "Emitido" } })
    fireEvent.click(screen.getByRole("button", { name: "Abrir NR 93" }))
    const detail = screen.getByRole("dialog")
    expect(within(detail).getByText("Material quirúrgico")).toBeInTheDocument()
    expect(within(detail).getByText("Cantidad: 2")).toBeInTheDocument()
    expect(within(detail).getByText(/no disponibles en esta vista/)).toBeInTheDocument()
    fireEvent.click(within(detail).getByRole("button", { name: "Close" }))
    fireEvent.click(screen.getByRole("button", { name: "Todos 3" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Estado del comprobante" }), { target: { value: "Registrado" } })
    fireEvent.click(screen.getByRole("button", { name: "Abrir CO 104" }))
    expect(within(screen.getByRole("dialog")).getByText("Factura invoice-real")).toBeInTheDocument()
    expect(requests).toHaveLength(4)
  })

  it("drops open record details and filters immediately when the scope changes", async () => {
    const view = render(panel())
    await screen.findByText("budget-real")
    fireEvent.click(screen.getByRole("button", { name: "Abrir PR 71" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    handler = () => response([])
    mocks.companyId = "company-b"
    view.rerender(panel("surgery-b"))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("budget-real")).not.toBeInTheDocument()
    await screen.findByText("Sin comprobantes vinculados a esta cirugía.")
  })

  it("distinguishes no filter results from no linked documents", async () => {
    render(panel())
    await screen.findByRole("table")
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar comprobante" }), { target: { value: "missing" } })
    expect(screen.getByText("Ningún comprobante coincide con los filtros.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("includes indirect invoice payments, excludes unrelated payments, and keeps amounts scoped", async () => {
    handler = url => url.pathname.endsWith("payments") ? response([
      payment({ id: "indirect-payment", surgeryId: null, amount: "900", imputations: [
        { id: "related", invoiceId: "invoice-real", amount: "300" } as never,
        { id: "unrelated", invoiceId: "other-invoice", amount: "600" } as never,
      ] }), payment({ id: "unrelated-payment", surgeryId: "other-surgery", imputations: [] }),
    ]) : commercialResponse(url)
    render(panel())
    await screen.findByText("indirect-payment")
    expect(screen.queryByText("unrelated-payment")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Abrir CO 104" }))
    const detail = screen.getByRole("dialog")
    expect(within(detail).getByText("Importe total del recibo")).toBeInTheDocument()
    expect(within(detail).getByText("900,00 ARS")).toBeInTheDocument()
    expect(within(detail).getByText("300,00 ARS")).toBeInTheDocument()
    expect(within(detail).queryByText("Factura other-invoice")).not.toBeInTheDocument()
  })

  it("rejects another company's payment even when its invoice matches", async () => {
    handler = url => url.pathname.endsWith("payments") ? response([payment({ companyId: "company-b" })]) : commercialResponse(url)
    render(panel())
    expect(await screen.findByRole("alert")).toHaveTextContent("no corresponde a la empresa y cirugía")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("loads all remittance and payment pages too", async () => {
    handler = url => {
      const first = url.searchParams.get("skip") === "0"
      return response(url.pathname.endsWith("remitos")
        ? first ? Array.from({ length: 500 }, (_, i) => remittance({ id: `nr-${i}` })) : [remittance({ id: "last-remittance" })]
        : url.pathname.endsWith("payments")
          ? first ? Array.from({ length: 500 }, (_, i) => payment({ id: `co-${i}` })) : [payment({ id: "last-payment" })]
          : [])
    }
    render(panel())
    await screen.findByText("last-remittance")
    expect(screen.getByText("last-payment")).toBeInTheDocument()
    expect(requests).toHaveLength(6)
    expect(requests.filter(request => request.url.endsWith("skip=500"))).toHaveLength(2)
  }, 20000)

  it("closes loaded detail and hides old rows synchronously on reload", async () => {
    render(panel())
    await screen.findByText("invoice-real")
    fireEvent.click(screen.getByRole("button", { name: "Abrir FV 82" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    const late = deferred()
    handler = async () => (await late.promise).clone()
    fireEvent.click(screen.getByRole("button", { name: "Recargar", hidden: true }))
    expect(screen.getByRole("status")).toHaveTextContent("Cargando")
    expect(screen.queryByText("invoice-real")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await act(async () => { late.resolve(response([])) })
    await screen.findByText("Sin comprobantes vinculados a esta cirugía.")
  })

  it("labels unavailable actions instead of pretending to print, download or edit", async () => {
    render(panel())
    await screen.findByText("invoice-real")
    fireEvent.keyDown(screen.getByRole("button", { name: "Acciones FV 82" }), { key: "ArrowDown" })
    const menu = await screen.findByRole("menu")
    for (const name of ["Descargar PDF · No disponible", "Imprimir · No disponible", "Modificar · No disponible"]) {
      expect(within(menu).getByRole("menuitem", { name })).toHaveAttribute("aria-disabled", "true")
    }
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Abrir comprobante" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Factura operativa")
    expect(requests).toHaveLength(4)
  })
})
