/**
 * MaterialAutorizadoDetails.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-03)
 *
 * Validates the collapsible Material autorizado region:
 * - 0 items: flat summary "Material autorizado (0 ítems detectados)" + empty message, no <details>
 * - N items: <details> without `open` (collapsed by default); summary count string
 * - expanding reveals the per-item rendering (code badge, catalog badge,
 *   description, cantidad, precio ref.) preserved verbatim from AiResultsPanel
 * - no Implantes/Instrumental grouping (Phase B)
 */
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { MaterialAutorizadoDetails } from "@/components/cirugias/MaterialAutorizadoDetails"
import type { MaterialAutorizadoItem } from "@/lib/validators/autorizacion-ai"

// IMP-RTR-001 exists in mock-stock → "En catálogo". NOPE-999 does not → "No en catálogo".
function buildItem(overrides: Partial<MaterialAutorizadoItem> = {}): MaterialAutorizadoItem {
  return {
    codigo: "IMP-RTR-001",
    descripcion: "Implante rtb prueba",
    cantidad: "2",
    precio_referencia: "$85.000",
    ...overrides,
  }
}

describe("MaterialAutorizadoDetails — NUEVA-CIRUGIA-IA-UX-P1", () => {
  describe("empty case", () => {
    it("renders the flat summary 'Material autorizado (0 ítems detectados)' and the empty message", () => {
      const { container } = render(<MaterialAutorizadoDetails items={[]} />)
      expect(screen.getByText("Material autorizado (0 ítems detectados)")).toBeInTheDocument()
      expect(screen.getByText("No se detectó material autorizado.")).toBeInTheDocument()
      // No <details> element when there is nothing to expand (DESIGN §4.2).
      expect(container.querySelector("details")).toBeNull()
    })
  })

  describe("populated case", () => {
    const items: MaterialAutorizadoItem[] = [
      buildItem({ codigo: "IMP-RTR-001", descripcion: "Implante rtb", cantidad: "2", precio_referencia: "$85.000" }),
      buildItem({ codigo: "NOPE-999", descripcion: "Otro ítem", cantidad: "1", precio_referencia: "$10.000" }),
      buildItem({ codigo: "IMP-PC-002", descripcion: "Tercer ítem", cantidad: "4", precio_referencia: "$120.000" }),
    ]

    it("renders a <details> element collapsed by default (no open attribute)", () => {
      const { container } = render(<MaterialAutorizadoDetails items={items} />)
      const details = container.querySelector("details")
      expect(details).not.toBeNull()
      expect(details?.hasAttribute("open")).toBe(false)
    })

    it("summary shows the detected item count string", () => {
      render(<MaterialAutorizadoDetails items={items} />)
      expect(screen.getByText("Material autorizado (3 ítems detectados)")).toBeInTheDocument()
    })

    it("expanding reveals the per-item rendering (code badges + descriptions + cantidad/precio)", () => {
      const { container } = render(<MaterialAutorizadoDetails items={items} />)
      const details = container.querySelector("details") as HTMLDetailsElement
      // Toggle open to reveal the item list (native <details>).
      fireEvent.click(details.querySelector("summary") as HTMLElement)
      // Code badges — one per item (unique).
      expect(screen.getByText("IMP-RTR-001")).toBeInTheDocument()
      expect(screen.getByText("NOPE-999")).toBeInTheDocument()
      expect(screen.getByText("IMP-PC-002")).toBeInTheDocument()
      // Descriptions (unique).
      expect(screen.getByText("Implante rtb")).toBeInTheDocument()
      expect(screen.getByText("Otro ítem")).toBeInTheDocument()
      expect(screen.getByText("Tercer ítem")).toBeInTheDocument()
      // Cantidad / Precio ref. — each item has a distinct value here.
      expect(screen.getByText(/Cantidad: 4/)).toBeInTheDocument()
      expect(screen.getByText(/Precio ref.: \$85\.000/)).toBeInTheDocument()
      expect(screen.getByText(/Precio ref.: \$120\.000/)).toBeInTheDocument()
    })

    it("renders the catalog badge 'En catálogo' for known codes and 'No en catálogo' otherwise", () => {
      const { container } = render(<MaterialAutorizadoDetails items={items} />)
      fireEvent.click(container.querySelector("details summary") as HTMLElement)
      // IMP-RTR-001 and IMP-PC-002 match the catalog → two "En catálogo" badges.
      expect(screen.getAllByText("En catálogo")).toHaveLength(2)
      // NOPE-999 does not match → one "No en catálogo" badge.
      expect(screen.getByText("No en catálogo")).toBeInTheDocument()
    })

    it("does not render any Implantes/Instrumental grouping (Phase B is out of scope)", () => {
      const { container } = render(<MaterialAutorizadoDetails items={items} />)
      // No grouping headings are introduced by Phase A.
      expect(screen.queryByText("Implantes")).toBeNull()
      expect(screen.queryByText("Instrumental")).toBeNull()
      // Sanity: exactly one <details> (no per-group details).
      expect(container.querySelectorAll("details").length).toBe(1)
    })

    it("single item still uses the 'ítems detectados' summary form per spec §6.3", () => {
      render(<MaterialAutorizadoDetails items={[buildItem()]} />)
      expect(screen.getByText("Material autorizado (1 ítems detectados)")).toBeInTheDocument()
    })
  })
})
