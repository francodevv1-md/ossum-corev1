/**
 * AiUploadZone.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, DESIGN §8.6)
 *
 * Focused render test for the compact upload affordance and its states.
 *
 * Repo convention: explicit assertions (no snapshot files).
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { AiUploadZone } from "@/components/cirugias/AiUploadZone"

describe("AiUploadZone — NUEVA-CIRUGIA-IA-UX-P1 (baseline)", () => {
  describe("idle state", () => {
    it("renders one accessible upload action", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(screen.getByRole("button", { name: /Arrastrá el archivo acá/ })).toBeInTheDocument()
    })

    it("renders one compact formats and max size hint", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(screen.getByText("PDF, JPG, JPEG, PNG o BMP · Máximo 4 MB")).toBeInTheDocument()
    })

    it("does not show the processing indicator when isProcessing is false", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(screen.queryByText("Subiendo archivo…")).toBeNull()
    })
  })

  describe("isProcessing state", () => {
    it("renders the processing indicator and disables the upload action", () => {
      render(<AiUploadZone isProcessing onFileSelected={vi.fn()} />)
      expect(screen.getByText("Subiendo archivo…")).toBeInTheDocument()
      expect(screen.getByText(/Esto puede tardar unos segundos/)).toBeInTheDocument()
      const uploadAction = screen.getByRole("button", { name: /Subiendo archivo/ })
      expect(uploadAction).toHaveAttribute("aria-disabled", "true")
      expect(uploadAction).toHaveAttribute("tabindex", "-1")
    })
  })

  describe("error state", () => {
    it("renders the error alert when an error is provided", () => {
      render(<AiUploadZone error="Error de prueba" onFileSelected={vi.fn()} />)
      expect(screen.getByText("Error de carga")).toBeInTheDocument()
      expect(screen.getByText("Error de prueba")).toBeInTheDocument()
    })
  })
})
