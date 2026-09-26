import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), params: { remitoId: "remittance-1" }, activeCompany: { id: "company-1" } }))
vi.mock("next/navigation", () => ({ useParams: () => mocks.params }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.activeCompany }) }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/compras/ReceiptOperationalWorkspace", () => ({ ReceiptOperationalWorkspace: ({ sourceRemito, initialReceipt }: { sourceRemito: { number: string }; initialReceipt: { id: string; documentReference: string } }) => <p>{sourceRemito.number} · {initialReceipt.id} · {initialReceipt.documentReference}</p> }))

import SupplierRemittanceReceiptPage from "@/app/compras/remitos-proveedor/[remitoId]/recepcion/page"

describe("SupplierRemittanceReceiptPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("loads the persisted remittance and opens its single linked receipt through the remittance endpoint", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ id: "remittance-1", number: "RP-100" }).mockResolvedValueOnce({ id: "receipt-1", documentReference: "RP-100", status: "DRAFT", idempotencyKey: null, supplierRemittanceId: "remittance-1" })
    render(<SupplierRemittanceReceiptPage />)

    expect(await screen.findByText("RP-100 · receipt-1 · RP-100")).toBeVisible()
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
    expect(mocks.apiFetch.mock.calls).toEqual([
      ["/api/companies/company-1/supplier-remittances/remittance-1"],
      ["/api/companies/company-1/supplier-remittances/remittance-1/goods-receipt", { method: "POST" }],
    ])
  })
})
