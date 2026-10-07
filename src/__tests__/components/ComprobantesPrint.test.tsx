import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"
import { buildCommercialPrintHtml } from "@/lib/comprobante-print"

const mocks = vi.hoisted(() => ({ companyId: "company-a" as string | undefined, token: vi.fn() }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.companyId ? { id: mocks.companyId, name: "Empresa QA" } : null }) }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.token }))
// Keep menu actions in the DOM to exercise handlers/lifecycle; actual Radix tested in browser QA.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, disabled, onSelect }: { children: React.ReactNode; disabled?: boolean; onSelect?: () => void }) => <button role="menuitem" disabled={disabled} onClick={onSelect}>{children}</button>,
}))
import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"

const base = { companyId: "company-a", surgeryId: "surgery-a", visibleNumber: 71, state: "Borrador", createdAt: "2026-10-01T12:00:00Z", currency: "ARS", issuedAt: null }
const item = { id: "item", sku: "ART-1", description: "Prótesis <script>window.bad=true</script>", quantity: "2", unit: "u", unitPrice: "12.75", discount: "1.25", tax: "5.09", total: "29.34" }
const budget = { ...base, id: "budget-a", subtotal: "25.50", discountTotal: "1.25", taxTotal: "5.09", total: "29.34", items: [item],
  commercialSnapshot: { client: { legalName: "Cliente guardado" }, payer: { legalName: "Financiador guardado" } },
  metadata: { patient: "Paciente QA", institution: "Hospital Córdoba" }, commercial: null, versionNumber: 2, documentDate: "2026-10-01", validUntil: "2026-10-30T12:00:00Z",
  paymentTerms: "30 días", legend: "Estimativo guardado", notes: "Nota guardada", generalDiscountRate: "0", title: "Presupuesto real",
} as unknown as PresupuestoApiRow
const invoice = { ...base, id: "invoice-a", visibleNumber: 82, type: "FV", base: "manual", subtotal: "25.50", discountTotal: "1.25", taxTotal: "5.09", total: "29.34", paidTotal: "10", balance: "19.34", items: [item] } as unknown as InvoiceApiRow
const payment = { ...base, id: "payment-a", visibleNumber: 104, surgeryId: null, state: "Registrado", receivedAt: "2026-10-04T12:00:00Z", method: "transfer", amount: "100", metadata: { reference: "REF-93", notes: "Nota cobro <script>window.bad=true</script>" },
  imputations: [{ id: "allocation", invoiceId: "invoice-a", amount: "10" }, { id: "other", invoiceId: "other-invoice", amount: "90" }],
} as unknown as PaymentApiRow
type PrintType = "PR" | "FV" | "CO" | "NR"
const remito = { ...base, id: "remito-a", visibleNumber: 93, state: "Emitido", items: [{ ...item, returnedQuantity: "0" }], destinatarioSnapshot: { nombre: "Hospital QA" }, deliveredAt: null, returnedAt: null }
const documents = { PR: budget, FV: invoice, CO: payment, NR: remito }
const endpoints = { PR: "presupuestos", FV: "invoices", CO: "payments", NR: "remitos" }
const response = (data: unknown, status = 200) => new Response(JSON.stringify(status >= 400 ? { error: { message: "Lectura rechazada" } } : { data }), { status })
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done }); return { promise, resolve } }
const panel = (backendId = "surgery-a") => <ComprobantesAsociados surgery={{ id: "legacy", backendId, visibleNumber: "CX-201" } as Surgery} comprobantes={[]} presupuestos={[]} resumenCobranza={{} as never} />
let requests: { path: string; method: string; token: string | null }[]
let detail: unknown
let failure: number
let pending: ReturnType<typeof deferred> | undefined
let linkedInvoices: InvoiceApiRow[]
let write: ReturnType<typeof vi.fn<(html: string) => void>>
let print: ReturnType<typeof vi.fn<() => void>>
let close: ReturnType<typeof vi.fn<() => void>>
let open: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  mocks.companyId = "company-a"; mocks.token.mockResolvedValue("qa-token")
  requests = []; failure = 200; detail = undefined; pending = undefined; linkedInvoices = [invoice]
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://mock.invalid")
    const method = init?.method ?? "GET"
    requests.push({ path: String(input), method, token: new Headers(init?.headers).get("Authorization") })
    if (method !== "GET") throw new Error("Unexpected mutation")
    const endpoint = url.pathname.split("/")[4]
    if (url.pathname.split("/").length === 6) return pending ? pending.promise : response(detail ?? Object.values(documents).find(row => row.id === url.pathname.split("/")[5]), failure)
    if (endpoint === "invoices") {
      const skip = Number(url.searchParams.get("skip") ?? 0)
      return response(linkedInvoices.slice(skip, skip + 500))
    }
    return response(endpoint === "presupuestos" ? [budget] : endpoint === "payments" ? [payment] : [remito])
  }))
  write = vi.fn(); print = vi.fn(); close = vi.fn()
  open = vi.spyOn(window, "open").mockReturnValue({ closed: false, opener: {}, document: { body: { textContent: "" }, open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print, close } as unknown as Window)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks() })

function select(type: PrintType) {
  const row = screen.getByRole("button", { name: `Acciones ${type} ${documents[type].visibleNumber}` }).closest("tr")!
  fireEvent.click([...row.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(button => button.textContent === "Imprimir")!)
}

describe("Comprobantes printing", () => {
  it.each(["PR", "FV", "CO", "NR"] as const)("prints fresh scoped %s through authenticated GET without changing documents", async type => {
    render(panel()); await screen.findByRole("table")
    if (type === "PR") detail = { ...budget, total: "31.99" }
    select(type)
    expect(open).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    const html = write.mock.calls[0][0]
    expect(requests.some(request => request.path === `/api/companies/company-a/${endpoints[type]}/${documents[type].id}`)).toBe(true)
    expect(requests.every(request => request.method === "GET" && request.token === "Bearer qa-token")).toBe(true)
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    if (type === "PR") { expect(html).toContain("31,99 ARS"); expect(html).toContain("Cliente guardado"); expect(html).toContain("30 días") }
    if (type === "FV") { expect(html).toContain("Sin validez fiscal"); expect(html).toContain("19,34 ARS"); expect(html).not.toContain("CAE:") }
    if (type === "CO") { expect(html).toContain("Importe total del recibo"); expect(html).toContain("100,00 ARS"); expect(html).toContain("10,00 ARS"); expect(html).not.toContain("90,00 ARS"); expect(html).toContain("Transferencia"); expect(html).toContain("REF-93") }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each(["PR", "FV", "CO"] as const)("rejects wrong returned company or id for %s", async type => {
    render(panel()); await screen.findByRole("table")
    detail = { ...documents[type], companyId: "other-company" }; select(type)
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar")
    expect(print).not.toHaveBeenCalled(); expect(close).toHaveBeenCalled()
    detail = { ...documents[type], id: "other-id" }; select(type)
    await waitFor(() => expect(close).toHaveBeenCalledTimes(2))
    expect(print).not.toHaveBeenCalled()
  })

  it.each(["PR", "FV"] as const)("rejects %s from another surgery", async type => {
    render(panel()); await screen.findByRole("table")
    detail = { ...documents[type], surgeryId: "other-surgery" }; select(type)
    await screen.findByRole("alert"); expect(write).not.toHaveBeenCalled()
  })

  it("accepts a directly linked payment without allocations", async () => {
    render(panel()); await screen.findByRole("table")
    detail = { ...payment, surgeryId: "surgery-a", imputations: [] }; select("CO")
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(write.mock.calls[0][0]).toContain("Sin imputaciones a facturas de esta cirugía")
  })

  it("rejects a payment whose only current-surgery link has disappeared", async () => {
    render(panel()); await screen.findByRole("table")
    linkedInvoices = []; select("CO")
    await screen.findByRole("alert"); expect(print).not.toHaveBeenCalled()
  })

  it("rejects mismatched scoped invoice responses when resolving payment links", async () => {
    render(panel()); await screen.findByRole("table")
    linkedInvoices = [{ ...invoice, surgeryId: "other-surgery" }]; select("CO")
    await screen.findByRole("alert"); expect(write).not.toHaveBeenCalled()
  })

  it("resolves payment links beyond the first invoice page", async () => {
    render(panel()); await screen.findByRole("table")
    linkedInvoices = [...Array.from({ length: 500 }, (_, index) => ({ ...invoice, id: `page-one-${index}` })), invoice]
    select("CO"); await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(requests.some(request => request.path.endsWith("skip=500"))).toBe(true)
    expect(write.mock.calls[0][0]).toContain("10,00 ARS")
  })

  it("does not write or print if the user closes the pending popup", async () => {
    render(panel()); await screen.findByRole("table")
    const popup = open.getMockImplementation()!() as Window
    pending = deferred(); const late = pending; select("FV")
    await waitFor(() => expect(requests).toHaveLength(5))
    Object.defineProperty(popup, "closed", { value: true })
    await act(async () => { late.resolve(response(invoice)) })
    expect(write).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled()
  })

  it("handles popup blockers without a detail GET", async () => {
    render(panel()); await screen.findByRole("table")
    open.mockReturnValue(null); const count = requests.length; select("FV")
    expect(screen.getByRole("alert")).toHaveTextContent("bloqueó")
    expect(requests).toHaveLength(count); expect(print).not.toHaveBeenCalled()
  })

  it("reports HTTP failure, closes popup and permits retry", async () => {
    render(panel()); await screen.findByRole("table")
    failure = 403; select("PR"); await screen.findByRole("alert")
    expect(close).toHaveBeenCalledTimes(1); expect(print).not.toHaveBeenCalled()
    failure = 200; select("PR"); await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it.each(["reload", "surgery", "company", "unmount"])("closes pending popup and ignores late detail after %s", async change => {
    const view = render(panel()); await screen.findByRole("table")
    pending = deferred(); const late = pending; select("FV")
    await waitFor(() => expect(requests).toHaveLength(5))
    pending = undefined
    if (change === "reload") fireEvent.click(screen.getByRole("button", { name: "Recargar" }))
    if (change === "surgery") view.rerender(panel("surgery-b"))
    if (change === "company") { mocks.companyId = "company-b"; view.rerender(panel()) }
    if (change === "unmount") view.unmount()
    await act(async () => { late.resolve(response(invoice)) })
    expect(close).toHaveBeenCalled(); expect(write).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled()
  })

  it("opens synchronously and prevents overlapping print requests", async () => {
    render(panel()); await screen.findByRole("table")
    pending = deferred(); const late = pending; select("PR"); select("FV")
    expect(open).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(requests).toHaveLength(5))
    await act(async () => { late.resolve(response(budget)) })
    expect(print).toHaveBeenCalledTimes(1)
  })

  it("keeps missing amounts unavailable, zero distinct, and malicious context escaped", () => {
    const html = buildCommercialPrintHtml({ type: "FV", row: { ...invoice, visibleNumber: null, total: "0", balance: undefined as never } }, { companyName: '<img src=x onerror="alert(1)">', surgeryLabel: "CX-201" })
    expect(html).toContain("Sin numeración"); expect(html).toContain("Borrador"); expect(html).toContain("0,00 ARS"); expect(html).toContain("No disponible")
    expect(html).not.toContain("<img"); expect(html).toContain("&lt;img")
  })
})
