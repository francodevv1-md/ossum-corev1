import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
const fetcher = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ value: { activeCompany: { id: "company-a" }, currentUser: { email: "user@example.com" } } }))
vi.mock("@/lib/api/client", () => ({ apiFetch: fetcher }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.value }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock("lucide-react", () => ({ Loader2: () => null, Mail: () => null }))
vi.mock("@/components/ui/button", () => ({ Button: (props: React.ComponentProps<"button">) => React.createElement("button", props, props.children) }))
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: (props: React.ComponentProps<"input">) => React.createElement("input", { ...props, type: "checkbox" }) }))
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children), DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children) }))
vi.mock("@/components/ui/input", () => ({ Input: (props: React.ComponentProps<"input">) => React.createElement("input", props) }))
vi.mock("@/components/ui/label", () => ({ Label: ({ children }: { children: React.ReactNode }) => React.createElement("label", null, children) }))
vi.mock("@/components/ui/select", () => ({ Select: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), SelectItem: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), SelectTrigger: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children), SelectValue: () => null }))
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: React.ComponentProps<"textarea">) => React.createElement("textarea", props) }))
import { fetchPresupuestos } from "@/lib/api/presupuestos"
import { canEmailInvoiceState, canEmailPresupuestoState, canSendFinancialDocumentEmail } from "@/lib/permissions/financial-document-email"
import { SendExistingFinancialDocumentDialog } from "@/components/email/SendExistingFinancialDocumentDialog"

describe("recovered financial read client and existing email policy", () => {
  it("encodes tenant and pagination without dropping zero", async () => {
    fetcher.mockResolvedValue([])
    await fetchPresupuestos("tenant/a", { state: "Aprobado", take: 500, skip: 0 })
    expect(fetcher).toHaveBeenCalledWith("/api/companies/tenant%2Fa/presupuestos?state=Aprobado&take=500&skip=0")
  })
  it.each(["admin", "coordinador", "vendedor"])("retains allowed role %s", (role) => {
    expect(canSendFinancialDocumentEmail(role)).toBe(true)
  })
  it.each(["logistica", "matrona", "instrumentador", "unknown", "", null, undefined])("fails closed for %s", (role) => {
    expect(canSendFinancialDocumentEmail(role)).toBe(false)
  })
  it("centralizes document email eligibility by kind", () => {
    expect(canEmailPresupuestoState("Emitido")).toBe(true)
    expect(canEmailPresupuestoState("Borrador")).toBe(false)
    expect(canEmailInvoiceState("Emitida", 1, "2026-09-17")).toBe(true)
    expect(canEmailInvoiceState("Borrador", 1, "2026-09-17")).toBe(false)
    expect(canEmailInvoiceState("Emitida", null, "2026-09-17")).toBe(false)
  })
  it("loads every page and clears stale documents when the company changes", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `a-${index}`, visibleNumber: index + 1, state: "Emitido", issuedAt: null, currency: "ARS", total: "1" }))
    fetcher.mockImplementation((url: string) => url.includes("company-a") ? Promise.resolve(url.includes("skip=0") ? firstPage : [{ id: "a-100", visibleNumber: 101, state: "Emitido", issuedAt: null, currency: "ARS", total: "1" }]) : Promise.resolve([{ id: "b-1", visibleNumber: 1, state: "Emitido", issuedAt: null, currency: "ARS", total: "1" }]))
    const view = render(React.createElement(SendExistingFinancialDocumentDialog, { kind: "presupuesto", onOpenChange: vi.fn() }))
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("skip=100")))
    expect(screen.getByText("P-0101 · Emitido · ARS 1")).toBeInTheDocument()
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "old@example.com" } })
    auth.value = { ...auth.value, activeCompany: { id: "company-b" } }
    view.rerender(React.createElement(SendExistingFinancialDocumentDialog, { kind: "presupuesto", onOpenChange: vi.fn() }))
    await waitFor(() => expect(screen.getByText("P-0001 · Emitido · ARS 1")).toBeInTheDocument())
    expect(screen.queryByText("P-0101 · Emitido · ARS 1")).not.toBeInTheDocument()
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("")
  })
})
