import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
import type { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"

const child = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/components/expediente/ComprobantesAsociados", () => ({
  ComprobantesAsociados: (props: ComponentProps<typeof ComprobantesAsociados>) => {
    child.props(props)
    return <section aria-label="Integrated backend panel">Backend panel</section>
  },
}))
import { ComercialTabContent } from "@/components/expediente/ComercialTabContent"

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

it("removes contradictory legacy cards and forwards the existing panel contract unchanged", () => {
  const fetch = vi.fn(() => { throw new Error("Parent must not query HTTP") })
  vi.stubGlobal("fetch", fetch)
  const props = {
    surgery: { id: "CX-legacy-98765", backendId: "surgery-real", client: "Contradictory legacy client" },
    presupuestos: [{ id: "PR-legacy-654321", total: 7654321 }],
    comprobantes: [{ id: "legacy-invoice", number: "FV-legacy-123456", amount: 1111111 }],
    resumenCobranza: { saldoPendiente: 9999999, facturas: [] },
    remitos: [],
    onAutorizar: vi.fn(),
    onOpenPresupuestoDialog: vi.fn(),
  } as unknown as ComponentProps<typeof ComercialTabContent>
  const { container } = render(<ComercialTabContent {...props} />)
  expect(screen.getByRole("heading", { name: "Comprobantes asociados" })).toBeInTheDocument()
  expect(screen.getByRole("region", { name: "Integrated backend panel" })).toBeInTheDocument()
  for (const legacy of ["Cliente", "Presupuesto base", "Saldo pendiente", "Contradictory legacy client", "PR-legacy-654321", "FV-legacy-123456", "CX-legacy-98765", "Sin PR generado", "Sin saldo"]) {
    expect(screen.queryByText(legacy)).not.toBeInTheDocument()
  }
  expect(container.textContent).not.toMatch(/7654321|7\.654\.321|9999999|9\.999\.999|1111111|1\.111\.111/)
  const forwarded = child.props.mock.calls[0][0]
  expect(Object.keys(forwarded).sort()).toEqual(["comprobantes", "presupuestos", "resumenCobranza", "surgery"])
  for (const key of ["surgery", "presupuestos", "comprobantes", "resumenCobranza"] as const) {
    expect(forwarded[key]).toBe(props[key])
  }
  expect(fetch).not.toHaveBeenCalled()
  expect(props.onAutorizar).not.toHaveBeenCalled()
  expect(props.onOpenPresupuestoDialog).not.toHaveBeenCalled()
})
