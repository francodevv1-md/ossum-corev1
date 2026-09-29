import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api/client")>()), apiFetch: mocks.apiFetch }))

import { useFiscalEvidence, type FiscalEvidence } from "@/hooks/useFiscalEvidence"

const evidence = (displayState: string): FiscalEvidence => ({ document: { state: displayState, displayState, createdAt: "2026-09-24T12:00:00.000Z", submittedAt: null, authorizedAt: null }, attempts: [] })

describe("useFiscalEvidence", () => {
  beforeEach(() => vi.clearAllMocks())

  it("clears stale evidence while the active company request changes", async () => {
    const pending = new Map<string, (value: FiscalEvidence) => void>()
    mocks.apiFetch.mockImplementation((url: string) => new Promise<FiscalEvidence>((resolve) => pending.set(url, resolve)))
    const { result, rerender } = renderHook(({ companyId }) => useFiscalEvidence(companyId, "invoice-1"), { initialProps: { companyId: "company-a" } })
    const companyAUrl = "/api/companies/company-a/invoices/invoice-1/fiscal-evidence"
    const companyBUrl = "/api/companies/company-b/invoices/invoice-1/fiscal-evidence"
    await waitFor(() => expect(pending.has(companyAUrl)).toBe(true))
    await act(async () => pending.get(companyAUrl)?.(evidence("AUTHORIZED")))
    await waitFor(() => expect(result.current.data?.document.displayState).toBe("AUTHORIZED"))
    rerender({ companyId: "company-b" })
    await waitFor(() => expect(pending.has(companyBUrl)).toBe(true))
    expect(result.current).toMatchObject({ data: null, loading: true, error: null, noEvidence: false })
  })
})
