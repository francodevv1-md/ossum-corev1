import React from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ImageViewerDialog } from "@/components/shared/image/ImageViewerDialog"

describe("ImageViewerDialog", () => {
  it("renders when open with image, title, and zoom/rotation controls", () => {
    const onOpenChange = vi.fn()
    const onDownload = vi.fn()

    render(
      <ImageViewerDialog
        open={true}
        onOpenChange={onOpenChange}
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        alt="Test Document"
        title="documento-evidencia.png"
        subtitle="150 KB · Imagen adjunta"
        onDownload={onDownload}
      />
    )

    expect(screen.getAllByText("documento-evidencia.png").length).toBeGreaterThan(0)
    expect(screen.getAllByText("150 KB · Imagen adjunta").length).toBeGreaterThan(0)
    expect(screen.getByTitle("Acercar (+)")).toBeInTheDocument()
    expect(screen.getByTitle("Alejar (-)")).toBeInTheDocument()
    expect(screen.getByTitle("Rotar 90° horario (R)")).toBeInTheDocument()
    expect(screen.getByTitle("Rotar antihorario (Shift+R)")).toBeInTheDocument()
  })

  it("updates zoom and rotation state on control clicks", () => {
    render(
      <ImageViewerDialog
        open={true}
        onOpenChange={vi.fn()}
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        title="imagen.png"
      />
    )

    const zoomInBtn = screen.getByTitle("Acercar (+)")
    const rotateBtn = screen.getByTitle("Rotar 90° horario (R)")

    expect(screen.getByText("100%")).toBeInTheDocument()
    fireEvent.click(zoomInBtn)
    expect(screen.getByText("125%")).toBeInTheDocument()

    fireEvent.click(rotateBtn)
    expect(screen.getByText("90°")).toBeInTheDocument()

    // Reset button should appear when modified
    const resetBtn = screen.getByTitle("Restablecer imagen")
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)

    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.queryByText("90°")).not.toBeInTheDocument()
  })
})
