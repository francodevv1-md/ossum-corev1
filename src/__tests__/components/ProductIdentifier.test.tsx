import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProductIdentifier } from "@/components/stock/ProductIdentifier"

describe("ProductIdentifier", () => {
  it("combines a second manual code with the unresolved first scan", async () => {
    const resolve = vi.fn()
      .mockResolvedValueOnce({ status: "not_found" })
      .mockResolvedValueOnce({ status: "identified", item: { id: "article-1", description: "Implante" } })

    render(<ProductIdentifier resolve={resolve} onContinue={() => undefined} />)
    const input = screen.getByLabelText("Ingresar código")
    fireEvent.change(input, { target: { value: "REF-123" } })
    fireEvent.click(screen.getByRole("button", { name: /Resolver código ingresado/i }))

    expect(await screen.findByText(/Producto todavía no cargado/i)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /Agregar otro código/i }))
    fireEvent.change(screen.getByLabelText("Ingresar código"), { target: { value: "07798325708674" } })
    fireEvent.click(screen.getByRole("button", { name: /Resolver código ingresado/i }))

    await waitFor(() => expect(resolve).toHaveBeenLastCalledWith([
      { rawValue: "REF-123", symbology: "manual" },
      { rawValue: "07798325708674", symbology: "manual" },
    ]))
    expect(await screen.findByText("Implante")).toBeVisible()
  })
})
