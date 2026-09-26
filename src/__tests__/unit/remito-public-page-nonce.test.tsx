import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const requestHeaders = vi.fn()
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }))
vi.mock("next/headers", () => ({ headers: () => requestHeaders() }))

import Page from "@/app/verificar/remito/[token]/page"

const dto = { verificationStatus: "valid" as const, issuerDisplayName: "Issuer", issuerTaxId: "30123456789",
  documentType: "REMITO_SALIDA", issuedDate: "2026-08-12", remitoShortCode: "RM1-SAFE", verificationVersion: 1,
  fingerprint: "fingerprint", checkedAt: "2026-08-12T12:00:00.000Z" }

describe("public Remito page nonce boundary", () => {
  it("throws instead of rendering an HTTP-200 unavailable state when proxy evidence is missing", async () => {
    requestHeaders.mockResolvedValue(new Headers())
    const params = { then: vi.fn() } as unknown as Promise<{ token: string }>
    await expect(Page({ params })).rejects.toThrow("Public verification boundary unavailable")
    expect(params.then).not.toHaveBeenCalled()
  })

  it("uses injected server verification without token-bearing HTTP or navigation", async () => {
    requestHeaders.mockResolvedValue(new Headers({ "x-nonce": "request-nonce", "x-remito-verification": Buffer.from(JSON.stringify(dto)).toString("base64url") }))
    render(await Page({ params: Promise.resolve({ token: "secret-token" }) }))
    expect(screen.getByRole("status")).toHaveTextContent("Verified")
    expect(document.body.innerHTML).not.toContain("secret-token")
    expect(document.querySelector("a")).toBeNull()
  })
})
