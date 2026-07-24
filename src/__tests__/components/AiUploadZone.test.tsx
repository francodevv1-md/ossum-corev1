/**
 * AiUploadZone.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, DESIGN §8.6)
 *
 * Baseline render test for AiUploadZone (idle + isProcessing states) to
 * establish a regression baseline for the AI stack. The component itself is
 * NOT modified in Phase A (L3 lock held defensively); this test guards against
 * incidental regression (spec/proposal R2: zero existing tests cover the AI stack).
 *
 * Repo convention: explicit assertions (no snapshot files).
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { AiUploadZone } from "@/components/cirugias/AiUploadZone"

describe("AiUploadZone — NUEVA-CIRUGIA-IA-UX-P1 (baseline)", () => {
  describe("idle state", () => {
    it("renders the upload prompt and the 'Seleccionar archivo' button", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(
        screen.getByText("Arrastrá un archivo acá o hacé click para seleccionarlo")
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Seleccionar archivo" })).toBeInTheDocument()
    })

    it("renders the supported formats and max size hints", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(screen.getByText(/Formatos soportados: PDF, JPG, JPEG, PNG, WebP o BMP/)).toBeInTheDocument()
      expect(screen.getByText(/Tamaño máximo: 20\.0 MB/)).toBeInTheDocument()
    })

    it("does not show the processing indicator when isProcessing is false", () => {
      render(<AiUploadZone onFileSelected={vi.fn()} />)
      expect(screen.queryByText("Procesando con IA…")).toBeNull()
    })
  })

  describe("isProcessing state", () => {
    it("renders the processing indicator and disables the 'Seleccionar archivo' button", () => {
      render(<AiUploadZone isProcessing onFileSelected={vi.fn()} />)
      expect(screen.getByText("Procesando con IA…")).toBeInTheDocument()
      expect(screen.getByText("Esto puede tardar unos segundos.")).toBeInTheDocument()
      const selectBtn = screen.getByRole("button", { name: "Seleccionar archivo" }) as HTMLButtonElement
      expect(selectBtn.disabled).toBe(true)
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
