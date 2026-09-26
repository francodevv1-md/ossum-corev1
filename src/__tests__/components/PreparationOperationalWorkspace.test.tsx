import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1", name: "Demo" } }) }))

import { PreparationOperationalWorkspace } from "@/components/stock/PreparationOperationalWorkspace"

describe("PreparationOperationalWorkspace", () => {
  beforeEach(() => { apiFetch.mockReset() })

  it("creates a preparation and renders partial progress with a reservation control", async () => {
    apiFetch.mockRejectedValueOnce(new Error("Preparation not found")).mockResolvedValueOnce({ id: "prep-1", status: "OPEN", lines: [{ id: "line-1", articleId: "a1", requestedQuantity: "2", preparedQuantity: "0", stockUnit: "u" }] })
    render(<PreparationOperationalWorkspace surgeryId="surgery-1" />)
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText("ID de artículo"), { target: { value: "a1" } })
    fireEvent.click(screen.getByRole("button", { name: /Crear/i }))
    expect(await screen.findByTestId("preparation-id")).toHaveTextContent("prep-1")
    expect(screen.getByText("0 u")).toBeVisible()
    expect(screen.getByRole("button", { name: /Reservar/i })).toBeEnabled()
  })

  it("shows a server mismatch error without changing the rendered preparation", async () => {
    apiFetch.mockResolvedValueOnce({ id: "prep-1", status: "OPEN", lines: [{ id: "line-1", articleId: "a1", requestedQuantity: "1", preparedQuantity: "0", stockUnit: "u" }] }).mockRejectedValueOnce(new Error("Preparation does not belong to this surgery"))
    render(<PreparationOperationalWorkspace surgeryId="surgery-1" />)
    expect(await screen.findByTestId("preparation-id")).toHaveTextContent("prep-1")
    fireEvent.change(screen.getByLabelText(/Posición para a1/i), { target: { value: "position-1" } })
    fireEvent.click(screen.getByRole("button", { name: /Reservar/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/does not belong/i)
    expect(screen.getByText("a1")).toBeVisible()
  })
})
