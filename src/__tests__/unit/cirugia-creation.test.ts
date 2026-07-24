/**
 * cirugia-creation.test.ts
 * CHATZAI-017 FASE 5 — Unit tests for cirugía creation with new fields
 *
 * Tests the store's createSurgery action with the new FASE 2-4 fields:
 * - urgente, localidad, leyendaDestacada, fechaEnvioMaterial, referenciasAdministrativas
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useOrtoTrackStore } from "@/lib/store"
import type { Surgery, ReferenciaAdministrativa } from "@/types"

// Helper to build a complete Surgery creation payload (Omit<Surgery, "id">)
// CHATZAI-017C: patientDni is no longer in NewSurgeryForm but still in Surgery model.
// It can be auto-synced from referenciasAdministrativas where tipo === "DNI".
function makeSurgeryPayload(overrides: Partial<Omit<Surgery, "id">> = {}): Omit<Surgery, "id"> {
  return {
    patient: "Test Patient",
    patientDni: "", // CHATZAI-017C: empty by default; can be synced from referencias with tipo "DNI"
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "Buenos Aires",
    procedure: "",
    date: "",
    time: "",
    state: "Sin autorizar",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    client: "OSDE Binario",
    classification: "Reemplazo total de rodilla",
    urgente: false,
    localidad: "CABA",
    leyendaDestacada: false,
    fechaEnvioMaterial: "2026-05-15",
    referenciasAdministrativas: [] as ReferenciaAdministrativa[],
    coordinadorCx: "Sin asignar",
    vendedor: "Andrea Ruiz",
    instrumentador: "Sin asignar",
    provincia: "CABA",
    ...overrides,
  }
}

describe("Cirugía creation with new fields", () => {
  beforeEach(() => {
    // Reset store to a clean state for each test
    const { surgeries } = useOrtoTrackStore.getState()
    // We can't fully reset the store (it uses persist), but we can remove
    // all surgeries added during tests by tracking them.
    // Instead, we snapshot the length and filter later.
  })

  it("creates surgery with urgente=true", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({
      urgente: true,
    }))
    expect(surgery.urgente).toBe(true)
    expect(surgery.localidad).toBe("CABA")
    expect(surgery.fechaEnvioMaterial).toBe("2026-05-15")
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("creates surgery without Fecha CX (date empty string)", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({
      date: "",
      urgente: false,
      vendedor: "Sin asignar",
      provincia: undefined,
      localidad: undefined,
      fechaEnvioMaterial: undefined,
    }))
    expect(surgery.date).toBe("")
    expect(surgery.id).toBeTruthy()
    expect(surgery.id).toMatch(/^CX-/)
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("creates surgery with referenciasAdministrativas", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const refs = [
      { id: "ref-1", tipo: "Autorización" as const, valor: "AUT-001" },
      { id: "ref-2", tipo: "HC" as const, valor: "HC-123", observacion: "Historia clínica" },
    ]
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({
      date: "2026-05-20",
      urgente: false,
      referenciasAdministrativas: refs,
    }))
    expect(surgery.referenciasAdministrativas).toHaveLength(2)
    expect(surgery.referenciasAdministrativas[0].tipo).toBe("Autorización")
    expect(surgery.referenciasAdministrativas[1].observacion).toBe("Historia clínica")
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("creates surgery with leyendaDestacada=true", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({
      leyendaDestacada: true,
    }))
    expect(surgery.leyendaDestacada).toBe(true)
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("defaults urgente to false when not provided (store internal default)", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    // createSurgery signature requires urgente, but the store defaults it via ?? operator.
    // We test by passing the full payload and verifying the value is stored correctly.
    const surgery = store.createSurgery(makeSurgeryPayload({ urgente: false }))
    expect(surgery.urgente).toBe(false)
    // Also verify the store's internal default by calling with missing field (cast to bypass TS)
    const payloadMissingUrgente = { ...makeSurgeryPayload() } as Record<string, unknown>
    delete payloadMissingUrgente.urgente
    const surgery2 = store.createSurgery(payloadMissingUrgente as Omit<Surgery, "id">)
    expect(surgery2.urgente).toBe(false)
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("defaults leyendaDestacada to false when not provided (store internal default)", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({ leyendaDestacada: false }))
    expect(surgery.leyendaDestacada).toBe(false)
    // Also verify the store's internal default
    const payloadMissingLeyenda = { ...makeSurgeryPayload() } as Record<string, unknown>
    delete payloadMissingLeyenda.leyendaDestacada
    const surgery2 = store.createSurgery(payloadMissingLeyenda as Omit<Surgery, "id">)
    expect(surgery2.leyendaDestacada).toBe(false)
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("creates surgery with referenciasAdministrativas including DNI tipo", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const refs = [
      { id: "ref-dni", tipo: "DNI" as const, valor: "28456789" },
      { id: "ref-aut", tipo: "Autorización" as const, valor: "AUT-001" },
    ]
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({
      referenciasAdministrativas: refs,
      patientDni: "28456789", // CHATZAI-017C: auto-synced from DNI referencia
    }))
    expect(surgery.referenciasAdministrativas).toHaveLength(2)
    expect(surgery.referenciasAdministrativas[0].tipo).toBe("DNI")
    expect(surgery.referenciasAdministrativas[0].valor).toBe("28456789")
    expect(surgery.patientDni).toBe("28456789")
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("defaults referenciasAdministrativas to empty array when not provided (store internal default)", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload({ referenciasAdministrativas: [] }))
    expect(surgery.referenciasAdministrativas).toEqual([])
    // Also verify the store's internal default
    const payloadMissingRefs = { ...makeSurgeryPayload() } as Record<string, unknown>
    delete payloadMissingRefs.referenciasAdministrativas
    const surgery2 = store.createSurgery(payloadMissingRefs as Omit<Surgery, "id">)
    expect(surgery2.referenciasAdministrativas).toEqual([])
    // Clean up
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })

  it("uses provided id override when syncing a persisted surgery reference", () => {
    const initialCount = useOrtoTrackStore.getState().surgeries.length
    const store = useOrtoTrackStore.getState()
    const surgery = store.createSurgery(makeSurgeryPayload(), { id: "CX-PERSISTED-123" })
    expect(surgery.id).toBe("CX-PERSISTED-123")
    useOrtoTrackStore.setState({
      surgeries: useOrtoTrackStore.getState().surgeries.slice(0, initialCount),
    })
  })
})
