/**
 * AiResultsPanel.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-02/AC-03/AC-09/AC-10)
 *
 * Focused integration test for the confidence pill + collapsible Material autorizado.
 * - ok confidence → emerald pill "Confianza NN%"
 * - low confidence → amber pill "Confianza baja · NN%" + AlertTriangle (Alert absorbed)
 * - the standalone amber Alert block and the Progress bar are no longer rendered
 * - Material autorizado renders inside a collapsed <details> with the count summary
 * - "Aplicar al formulario" stays driven only by canApply (confidence does NOT gate apply)
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { AiResultsPanel } from "@/components/cirugias/AiResultsPanel"
import type { AutorizacionAIResponse, MaterialAutorizadoItem } from "@/lib/validators/autorizacion-ai"

function buildMaterialItem(overrides: Partial<MaterialAutorizadoItem> = {}): MaterialAutorizadoItem {
  return {
    codigo: "IMP-RTR-001",
    descripcion: "Implante rtb",
    cantidad: "2",
    precio_referencia: "$85.000",
    ...overrides,
  }
}

function buildResult(overrides: Partial<AutorizacionAIResponse> = {}): AutorizacionAIResponse {
  return {
    provider: "openai",
    confidence: 0.72,
    looks_like_authorization: true,
    warnings: [],
    raw_text_preview: "",
    extracted: {
      paciente: "Juan Pérez",
      dni: "28456789",
      medico: "Dr. Gómez",
      institucion: "Hospital A",
      obra_social: "OSDE",
      patologia_sugerida: "RTR",
      numero_autorizacion: "AUT-001",
      numero_siniestro: "",
      numero_poliza: "",
      fecha_autorizacion: "2026-01-01",
      fecha_cirugia: "2026-02-01",
      fecha_probable: "",
      provincia_sugerida: "CABA",
      localidad_sugerida: "CABA",
      material_autorizado: [buildMaterialItem()],
      observaciones: "",
    },
    ...overrides,
  }
}

describe("AiResultsPanel — NUEVA-CIRUGIA-IA-UX-P1", () => {
  describe("confidence pill (AC-02 / AC-09)", () => {
    it("renders the ok emerald pill with 'Confianza NN%' when confidence >= threshold", () => {
      render(<AiResultsPanel result={buildResult({ confidence: 0.72 })} onApply={vi.fn()} onReset={vi.fn()} />)
      const pill = screen.getByText(/Confianza 72%/)
      expect(pill).toBeInTheDocument()
      // Emerald token classes for the ok state (DESIGN §7.2).
      expect(pill.className).toContain("border-emerald-300")
      expect(pill.className).toContain("text-emerald-800")
    })

    it("renders the low amber pill with 'Confianza baja · NN%' + AlertTriangle when confidence < threshold", () => {
      const { container } = render(
        <AiResultsPanel result={buildResult({ confidence: 0.18 })} onApply={vi.fn()} onReset={vi.fn()} />
      )
      const pill = screen.getByText(/Confianza baja · 18%/)
      expect(pill).toBeInTheDocument()
      expect(pill.className).toContain("border-amber-300")
      expect(pill.className).toContain("text-amber-800")
      // AlertTriangle icon is rendered inside the low pill (absorbed Alert semantics).
      // Query the svg generically — lucide renders the icon with its canonical class
      // (lucide-triangle-alert in recent versions), so we avoid coupling to the class name.
      const svg = pill.querySelector("svg")
      expect(svg).not.toBeNull()
      // The native title tooltip preserves the removed AlertDescription text.
      expect(pill).toHaveAttribute("title", "Confianza baja — revisá los datos antes de aplicar.")
      // Sanity: container rendered.
      expect(container.firstChild).not.toBeNull()
    })

    it("does NOT render an icon inside the ok pill (icon is unique to the low state)", () => {
      render(<AiResultsPanel result={buildResult({ confidence: 0.72 })} onApply={vi.fn()} onReset={vi.fn()} />)
      const pill = screen.getByText(/Confianza 72%/)
      expect(pill.querySelector("svg")).toBeNull()
    })

    it("does NOT render the standalone amber Alert block (absorbed into the pill)", () => {
      render(<AiResultsPanel result={buildResult({ confidence: 0.18 })} onApply={vi.fn()} onReset={vi.fn()} />)
      // The AlertDescription text must not appear as standalone alert text.
      // (It only survives as the pill's native title tooltip, not as visible text.)
      expect(screen.queryByText("Confianza baja — revisá los datos antes de aplicar.")).toBeNull()
    })

    it("does NOT render the Progress bar anymore", () => {
      const { container } = render(
        <AiResultsPanel result={buildResult({ confidence: 0.72 })} onApply={vi.fn()} onReset={vi.fn()} />
      )
      // shadcn Progress renders a <div> with role="progressbar" — must be absent.
      expect(container.querySelector('[role="progressbar"]')).toBeNull()
    })
  })

  describe("Material autorizado collapsible details (AC-03)", () => {
    it("renders material autorizado inside a collapsed <details> with the count summary", () => {
      const items = [
        buildMaterialItem({ codigo: "IMP-RTR-001", descripcion: "Implante A" }),
        buildMaterialItem({ codigo: "NOPE-999", descripcion: "Implante B" }),
      ]
      const { container } = render(
        <AiResultsPanel result={buildResult({ extracted: { ...buildResult().extracted, material_autorizado: items } })} onApply={vi.fn()} onReset={vi.fn()} />
      )
      const details = container.querySelector("details")
      expect(details).not.toBeNull()
      expect(details?.hasAttribute("open")).toBe(false)
      expect(screen.getByText("Material autorizado (2 ítems detectados)")).toBeInTheDocument()
    })

    it("expanding the material details reveals the per-item code badges", () => {
      const items = [
        buildMaterialItem({ codigo: "IMP-RTR-001", descripcion: "Implante A" }),
        buildMaterialItem({ codigo: "NOPE-999", descripcion: "Implante B" }),
      ]
      const { container } = render(
        <AiResultsPanel result={buildResult({ extracted: { ...buildResult().extracted, material_autorizado: items } })} onApply={vi.fn()} onReset={vi.fn()} />
      )
      fireEvent.click(container.querySelector("details summary") as HTMLElement)
      expect(screen.getByText("IMP-RTR-001")).toBeInTheDocument()
      expect(screen.getByText("NOPE-999")).toBeInTheDocument()
      expect(screen.getByText("En catálogo")).toBeInTheDocument()
      expect(screen.getByText("No en catálogo")).toBeInTheDocument()
    })
  })

  describe("apply button gating (AC-09 / AC-10)", () => {
    it("keeps 'Aplicar al formulario' enabled when looks_like_authorization=true regardless of low confidence", () => {
      render(
        <AiResultsPanel
          result={buildResult({ confidence: 0.18, looks_like_authorization: true })}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      )
      const applyBtn = screen.getByRole("button", { name: "Aplicar al formulario" })
      // Confidence is low but looks_like_authorization is true → canApply=true → enabled.
      // Confidence must NOT gate apply (AC-09).
      expect(applyBtn).not.toBeDisabled()
    })

    it("disables 'Aplicar al formulario' only when looks_like_authorization=false (canApply=false)", () => {
      render(
        <AiResultsPanel
          result={buildResult({ confidence: 0.95, looks_like_authorization: false })}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      )
      const applyBtn = screen.getByRole("button", { name: "Aplicar al formulario" })
      expect(applyBtn).toBeDisabled()
    })

    it("calls onApply when the apply button is clicked (bulk-apply semantics unchanged, AC-10)", () => {
      const onApply = vi.fn()
      render(<AiResultsPanel result={buildResult()} onApply={onApply} onReset={vi.fn()} />)
      fireEvent.click(screen.getByRole("button", { name: "Aplicar al formulario" }))
      expect(onApply).toHaveBeenCalledTimes(1)
    })
  })
})
