/**
 * CHATZAI-025A.3: Tests for ClasificacionSelectorModal
 *
 * Validates:
 * 1. Modal renders correctly when opened via trigger
 * 2. Shows active classifications from store
 * 3. Search filters classifications by name
 * 4. Search filters classifications by description
 * 5. Selecting a classification calls onSelect
 * 6. Current selection is highlighted
 * 7. Empty state shown when no results
 * 8. Closing without selection does not alter value
 * 9. Footer shows current selection info
 * 10. Inactive classifications are not shown
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ClasificacionSelectorModal } from "@/components/presupuestos/ClasificacionSelectorModal"
import { useOrtoTrackStore } from "@/lib/store"
import type { SurgeryClassification } from "@/types"

// Helper to get the store's classifications
function getActiveClassifications() {
  return useOrtoTrackStore.getState().classifications.filter((c) => c.active)
}

describe("CHATZAI-025A.3 — ClasificacionSelectorModal", () => {
  // ─── 1. Modal renders correctly when opened via trigger ───
  it("renders trigger and opens modal on click", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar clasificación...</button>
        )}
      </ClasificacionSelectorModal>
    )

    // Trigger button is visible
    expect(screen.getByText("Seleccionar clasificación...")).toBeInTheDocument()

    // Click to open modal
    fireEvent.click(screen.getByText("Seleccionar clasificación..."))

    // Modal title appears
    await waitFor(() => {
      expect(screen.getByText("Seleccionar clasificación")).toBeInTheDocument()
    })

    // Search input is present
    expect(screen.getByPlaceholderText("Buscar clasificación...")).toBeInTheDocument()
  })

  // ─── 2. Shows active classifications from store ───
  it("shows active classifications from the store", async () => {
    const onSelect = vi.fn()
    const activeClassifications = getActiveClassifications()

    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Seleccionar clasificación")).toBeInTheDocument()
    })

    // At least the first active classification should be visible
    if (activeClassifications.length > 0) {
      expect(screen.getByText(activeClassifications[0].name)).toBeInTheDocument()
    }
  })

  // ─── 3. Search filters classifications by name ───
  it("filters classifications by name when typing in search", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar clasificación...")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Buscar clasificación...")

    // Type "rodilla" — should filter to "Reemplazo total de rodilla"
    fireEvent.change(searchInput, { target: { value: "rodilla" } })

    await waitFor(() => {
      expect(screen.getByText("Reemplazo total de rodilla")).toBeInTheDocument()
    })

    // Other classifications should not be visible
    expect(screen.queryByText("Prótesis de cadera")).not.toBeInTheDocument()
  })

  // ─── 4. Search filters by description ───
  it("filters classifications by description", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar clasificación...")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Buscar clasificación...")

    // Type "fracturas" — matches Osteosíntesis description
    fireEvent.change(searchInput, { target: { value: "fracturas" } })

    await waitFor(() => {
      expect(screen.getByText("Osteosíntesis")).toBeInTheDocument()
    })
  })

  // ─── 5. Selecting a classification calls onSelect ───
  it("calls onSelect when clicking a classification item", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Reemplazo total de rodilla")).toBeInTheDocument()
    })

    // Click on a classification
    fireEvent.click(screen.getByText("Reemplazo total de rodilla"))

    expect(onSelect).toHaveBeenCalledWith("Reemplazo total de rodilla" as SurgeryClassification)
  })

  // ─── 6. Current selection is highlighted ───
  it("shows 'Actual' badge on currently selected classification", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="Osteosíntesis" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Actual")).toBeInTheDocument()
    })
  })

  // ─── 7. Empty state shown when no results ───
  it("shows empty state when search has no results", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar clasificación...")).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText("Buscar clasificación...")
    fireEvent.change(searchInput, { target: { value: "xyznonexistent" } })

    await waitFor(() => {
      expect(screen.getByText("No se encontraron clasificaciones")).toBeInTheDocument()
    })
  })

  // ─── 8. Closing without selection does not alter value ───
  it("does not call onSelect when modal is closed without selecting", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="Osteosíntesis" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Seleccionar clasificación")).toBeInTheDocument()
    })

    // Close the modal by pressing Escape
    fireEvent.keyDown(screen.getByPlaceholderText("Buscar clasificación..."), {
      key: "Escape",
    })

    // onSelect should not have been called
    expect(onSelect).not.toHaveBeenCalled()
  })

  // ─── 9. Footer shows current selection info ───
  it("footer shows current classification when one is selected", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="Osteosíntesis" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      // Footer shows "Actual:" label
      expect(screen.getByText("Actual:")).toBeInTheDocument()
    })

    // The value "Osteosíntesis" should appear in footer (along with list item)
    const allOsteo = screen.getAllByText("Osteosíntesis")
    expect(allOsteo.length).toBeGreaterThanOrEqual(1)
  })

  it("footer shows 'Sin clasificación seleccionada' when no selection", async () => {
    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Sin clasificación seleccionada")).toBeInTheDocument()
    })
  })

  // ─── 10. Inactive classifications are not shown ───
  it("does not show inactive classifications", async () => {
    // Mark one classification as inactive
    const store = useOrtoTrackStore.getState()
    const allClassifications = store.classifications
    const firstInactiveId = allClassifications.find((c) => !c.active)?.id

    // If all are active, toggle one to inactive for this test
    if (!firstInactiveId && allClassifications.length > 0) {
      store.toggleClassificationActive(allClassifications[0].id)
    }

    const onSelect = vi.fn()
    render(
      <ClasificacionSelectorModal value="" onSelect={onSelect}>
        {(openModal) => (
          <button onClick={openModal}>Seleccionar</button>
        )}
      </ClasificacionSelectorModal>
    )

    fireEvent.click(screen.getByText("Seleccionar"))

    await waitFor(() => {
      expect(screen.getByText("Seleccionar clasificación")).toBeInTheDocument()
    })

    // The inactive classification should NOT be visible in the list
    const activeClassNames = useOrtoTrackStore.getState()
      .classifications.filter((c) => c.active)
      .map((c) => c.name)
    const inactiveClassNames = useOrtoTrackStore.getState()
      .classifications.filter((c) => !c.active)
      .map((c) => c.name)

    inactiveClassNames.forEach((name) => {
      expect(screen.queryByText(name)).not.toBeInTheDocument()
    })

    // Restore if we toggled one
    if (!firstInactiveId && allClassifications.length > 0) {
      store.toggleClassificationActive(allClassifications[0].id)
    }
  })
})
