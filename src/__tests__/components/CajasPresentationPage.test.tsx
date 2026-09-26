import { describe, expect, it, vi } from "vitest"

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect }))

import CajasPresentationPage from "@/app/cajas/presentacion/page"

describe("Cajas presentation route", () => {
  it("always redirects to the final Cajas workspace", () => {
    CajasPresentationPage()

    expect(redirect).toHaveBeenCalledWith("/cajas")
  })
})
