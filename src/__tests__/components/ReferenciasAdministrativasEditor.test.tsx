/**
 * ReferenciasAdministrativasEditor.test.tsx
 * CHATZAI-017 FASE 5 — Component tests for the ReferenciasAdministrativasEditor
 *
 * Tests the add/remove/edit functionality of the references editor
 * and verifies correct rendering of empty and populated states.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ReferenciasAdministrativasEditor } from "@/components/cirugias/ReferenciasAdministrativasEditor"
import type { ReferenciaAdministrativa } from "@/types"

describe("ReferenciasAdministrativasEditor", () => {
  // ═══════════════════════════════════════════════════════════════
  // Empty state
  // ═══════════════════════════════════════════════════════════════
  describe("empty state", () => {
    it("renders empty state with add button", () => {
      render(<ReferenciasAdministrativasEditor value={[]} onChange={() => {}} />)
      // "Agregar referencia" appears in both button text and empty state message
      // Use getAllByText since the text appears in multiple elements
      const matches = screen.getAllByText(/Agregar referencia/i)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("renders empty state message when no references", () => {
      render(<ReferenciasAdministrativasEditor value={[]} onChange={() => {}} />)
      expect(screen.getByText(/No hay referencias administrativas/i)).toBeTruthy()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Populated state
  // ═══════════════════════════════════════════════════════════════
  describe("populated state", () => {
    it("renders existing references with valor inputs", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "Autorización", valor: "AUT-001" },
      ]
      render(<ReferenciasAdministrativasEditor value={refs} onChange={() => {}} />)
      expect(screen.getByDisplayValue("AUT-001")).toBeTruthy()
    })

    it("renders multiple references", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "Autorización", valor: "AUT-001" },
        { id: "ref-2", tipo: "HC", valor: "HC-123" },
      ]
      render(<ReferenciasAdministrativasEditor value={refs} onChange={() => {}} />)
      expect(screen.getByDisplayValue("AUT-001")).toBeTruthy()
      expect(screen.getByDisplayValue("HC-123")).toBeTruthy()
    })

    it("renders observation input when reference has observation", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "HC", valor: "HC-123", observacion: "Historia clínica" },
      ]
      render(<ReferenciasAdministrativasEditor value={refs} onChange={() => {}} />)
      expect(screen.getByDisplayValue("Historia clínica")).toBeTruthy()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Add reference
  // ═══════════════════════════════════════════════════════════════
  describe("add reference", () => {
    it("calls onChange with new reference when add button is clicked", () => {
      const onChange = vi.fn()
      render(<ReferenciasAdministrativasEditor value={[]} onChange={onChange} />)

      // "Agregar referencia" appears in both the button and the empty state message
      // Find the button specifically by its role
      const addButtons = screen.getAllByRole("button", { name: /Agregar referencia/i })
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
      fireEvent.click(addButtons[0])

      expect(onChange).toHaveBeenCalledTimes(1)
      const newRefs = onChange.mock.calls[0][0] as ReferenciaAdministrativa[]
      expect(newRefs).toHaveLength(1)
      expect(newRefs[0].tipo).toBe("Autorización")
      expect(newRefs[0].valor).toBe("")
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Remove reference
  // ═══════════════════════════════════════════════════════════════
  describe("remove reference", () => {
    it("calls onChange without the removed reference when delete is clicked", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "Autorización", valor: "AUT-001" },
        { id: "ref-2", tipo: "HC", valor: "HC-123" },
      ]
      const onChange = vi.fn()
      render(<ReferenciasAdministrativasEditor value={refs} onChange={onChange} />)

      // Find delete buttons (trash icon buttons)
      const deleteButtons = screen.getAllByRole("button").filter(
        btn => btn.querySelector("svg.lucide-trash-2") || btn.innerHTML.includes("trash")
      )
      // There should be 2 delete buttons (one per reference)
      expect(deleteButtons.length).toBeGreaterThanOrEqual(1)

      // Click the first delete button
      fireEvent.click(deleteButtons[0])

      expect(onChange).toHaveBeenCalledTimes(1)
      const updatedRefs = onChange.mock.calls[0][0] as ReferenciaAdministrativa[]
      expect(updatedRefs).toHaveLength(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Edit reference
  // ═══════════════════════════════════════════════════════════════
  describe("edit reference", () => {
    it("calls onChange when valor input is changed", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "Autorización", valor: "AUT-001" },
      ]
      const onChange = vi.fn()
      render(<ReferenciasAdministrativasEditor value={refs} onChange={onChange} />)

      const valorInput = screen.getByDisplayValue("AUT-001")
      fireEvent.change(valorInput, { target: { value: "AUT-002" } })

      expect(onChange).toHaveBeenCalledTimes(1)
      const updatedRefs = onChange.mock.calls[0][0] as ReferenciaAdministrativa[]
      expect(updatedRefs[0].valor).toBe("AUT-002")
    })

    it("calls onChange when observation input is changed", () => {
      const refs: ReferenciaAdministrativa[] = [
        { id: "ref-1", tipo: "HC", valor: "HC-123" },
      ]
      const onChange = vi.fn()
      render(<ReferenciasAdministrativasEditor value={refs} onChange={onChange} />)

      // Find the observation input (placeholder "(opcional)")
      const obsInputs = screen.getAllByPlaceholderText("(opcional)")
      expect(obsInputs.length).toBeGreaterThanOrEqual(1)
      fireEvent.change(obsInputs[0], { target: { value: "Test observation" } })

      expect(onChange).toHaveBeenCalledTimes(1)
      const updatedRefs = onChange.mock.calls[0][0] as ReferenciaAdministrativa[]
      expect(updatedRefs[0].observacion).toBe("Test observation")
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Section label
  // ═══════════════════════════════════════════════════════════════
  describe("section label", () => {
    it("renders the section label 'Referencias administrativas'", () => {
      render(<ReferenciasAdministrativasEditor value={[]} onChange={() => {}} />)
      expect(screen.getByText("Referencias administrativas")).toBeTruthy()
    })
  })
})
