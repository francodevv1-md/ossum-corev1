import { afterEach, describe, expect, it, vi } from "vitest"
import { ALL_STATES, STATE_FILTER_OPTIONS } from "@/lib/cirugias.constants"
import { ACTIVE_STATES, PIPELINE_COLUMNS, PIPELINE_STATES } from "@/lib/shared-constants"
import { PIPELINE_COLUMNS as OLD_PIPELINE_COLUMNS } from "@/lib/constants"
import { SURGERY_STATE_OPTIONS } from "@/lib/statusHelpers"
import { SURGERY_STATE_CONFIGS } from "@/components/shared/selectors/SurgeryStateSelect"
import { getNextState } from "@/lib/automations"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { mapUiStateToCanonicalCxStatus } from "@/lib/api/backend-surgeries"
import { normalizeLegacySurgeryState, useOrtoTrackStore } from "@/lib/store"
import type { Surgery, SurgeryState } from "@/types"

// No Auth client, API requests, database or provider access in this suite.
vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn(() => { throw new Error("Offline test") }) }))

const storageKey = "ortotrack-v2-storage"
const initial = useOrtoTrackStore.getState()
afterEach(() => {
  useOrtoTrackStore.setState(initial, true)
  window.localStorage.removeItem(storageKey)
})

const surgery = (state: string, id = state): Surgery => ({
  ...initial.surgeries[0], id, state, date: "", time: "", backendId: `backend-${id}`,
  notes: "Sin fecha", referenciasAdministrativas: [{ id: "ref-1", tipo: "HC", valor: "KEEP" }],
}) as Surgery

describe("finite surgery legacy-state removal", () => {
  it("keeps exactly nine actual states and removes every legacy option/pipeline/advance membership", () => {
    expect(ALL_STATES).toEqual([
      "Sin autorizar", "Pendiente", "Autorizada", "En tránsito", "Realizada",
      "Finalizada", "Suspendida", "Cancelada", "Sin consumo",
    ])
    expect(STATE_FILTER_OPTIONS).toEqual(ALL_STATES)
    for (const states of [ACTIVE_STATES, PIPELINE_STATES,
      ...PIPELINE_COLUMNS.map((column) => column.states),
      ...OLD_PIPELINE_COLUMNS.map((column) => column.states),
      SURGERY_STATE_OPTIONS.map((option) => option.value), Object.keys(SURGERY_STATE_CONFIGS)]) {
      expect(states).not.toContain("Sin fecha")
    }
    expect(getNextState("Sin fecha" as SurgeryState)).toBeNull()
    expect(getNextState("Sin autorizar")).toBe("Pendiente")
  })

  it.each(["unauthorized", "Sin fecha", "Sin autorizar"])("maps inbound %s to Sin autorizar", (status) => {
    const [mapped] = mapApiSurgeryListToSurgeries([{ id: "backend-1", cxStatus: status, surgeryDate: null }])
    expect(mapped).toMatchObject({ state: "Sin autorizar", backendId: "backend-1", backendCxStatus: status, date: "" })
  })

  it.each(["Sin fecha", "sin fecha"])("maps outbound legacy %s only to unauthorized", (status) => {
    expect(mapUiStateToCanonicalCxStatus(status)).toBe("unauthorized")
  })

  it.each([
    ["Pendiente", "pending"], ["Autorizada", "authorized"],
    ["En tránsito", "in_transit"], ["en transito", "in_transit"],
    ["Realizada", "performed"], ["Finalizada", "finalized"],
    ["Suspendida", "suspended"], ["Cancelada", "cancelled"],
    ["Sin autorizar", "unauthorized"],
  ])("round-trips %s through canonical encoder", (ui, canonical) => {
    expect(mapUiStateToCanonicalCxStatus(ui)).toBe(canonical)
  })

  it.each([
    ["cancelled", "Cancelada"], ["suspended", "Suspendida"],
    ["performed", "Realizada"], ["finalized", "Finalizada"],
    ["unauthorized", "Sin autorizar"], ["authorized", "Autorizada"],
    ["pending", "Pendiente"], ["in_transit", "En tránsito"],
  ])("preserves %s in adapter state", (canonical, expected) => {
    const [mapped] = mapApiSurgeryListToSurgeries([{ id: "backend-1", cxStatus: canonical, surgeryDate: "2026-10-07" }])
    expect(mapped.state).toBe(expected)
  })

  it.each([
    ["pending", "Pendiente"], ["authorized", "Autorizada"],
    ["scheduled", "Pendiente"], ["unknown", "Pendiente"],
  ])("preserves inbound %s mapping without inferring authorization from missing dates", (status, expected) => {
    const [mapped] = mapApiSurgeryListToSurgeries([{ id: "backend-1", cxStatus: status, surgeryDate: null }])
    expect(mapped.state).toBe(expected)
    expect(mapped.backendCxStatus).toBe(status)
    expect(mapped.date).toBe("")
    expect(mapUiStateToCanonicalCxStatus(status)).toBe(status === "unknown" ? "pending" : status === "scheduled" ? "scheduled" : status)
  })

  it("normalizes only exact local state immutably, preserving dates, IDs and all unrelated data", () => {
    const original = surgery("Sin fecha")
    const before = structuredClone(original)
    expect(normalizeLegacySurgeryState(original)).toEqual({ ...original, state: "Sin autorizar" })
    expect(original).toEqual(before)
    for (const state of ["Pendiente", "Autorizada", "unknown", "sin fecha", " Sin fecha "]) {
      const other = surgery(state)
      expect(normalizeLegacySurgeryState(other)).toBe(other)
    }
    const patch: Partial<Surgery> = { notes: "Sin fecha" }
    expect(normalizeLegacySurgeryState(patch)).toBe(patch)
  })

  it.each([0, 1])("migrates synthetic v%s immutably and rehydrates/writes v2 with all other data retained", async (version) => {
    const payload = {
      surgeries: [surgery("Sin fecha"), surgery("Autorizada"), surgery("Pendiente"), surgery("unknown")],
      historyEntries: [{ id: "history-1", previousValue: "Sin fecha", newValue: "Autorizada" }],
      remitosProveedor: [{ id: "RP-0001" }, { id: "RP-REAL-001" }],
      notes: [{ id: "note-1", text: "Sin fecha" }], search: "Sin fecha", extra: { retain: true },
    }
    const before = structuredClone(payload)
    const expected = {
      ...payload,
      surgeries: payload.surgeries.map((item) => item.state === "Sin fecha" ? { ...item, state: "Sin autorizar" } : item),
      remitosProveedor: version === 0 ? [{ id: "RP-REAL-001" }] : payload.remitosProveedor,
    }
    const migrated = await useOrtoTrackStore.persist.getOptions().migrate!(payload, version)
    expect(migrated).toEqual(expected)
    expect(payload).toEqual(before)
    window.localStorage.setItem(storageKey, JSON.stringify({ state: payload, version }))
    await useOrtoTrackStore.persist.rehydrate()
    expect(useOrtoTrackStore.getState()).toMatchObject(expected)
    const written = JSON.parse(window.localStorage.getItem(storageKey)!)
    expect(written).toMatchObject({ version: 2, state: expected })
    await useOrtoTrackStore.persist.rehydrate()
    expect(useOrtoTrackStore.getState()).toMatchObject(expected)
    expect(JSON.parse(window.localStorage.getItem(storageKey)!)).toEqual(written)
  })

  it("does not override default surgeries or legitimate remittances when v1 fields are absent", async () => {
    const payload = { notes: [] }
    expect(await useOrtoTrackStore.persist.getOptions().migrate!(payload, 1)).toEqual(payload)
    window.localStorage.setItem(storageKey, JSON.stringify({ state: payload, version: 1 }))
    await useOrtoTrackStore.persist.rehydrate()
    expect(useOrtoTrackStore.getState().surgeries).toBe(initial.surgeries)
    expect(useOrtoTrackStore.getState().remitosProveedor).toBe(initial.remitosProveedor)
  })

  it("prevents legacy local create/update/status/replace/hydrate inputs from persisting the removed state", () => {
    const store = useOrtoTrackStore.getState()
    const legacy = surgery("Sin fecha", "local-1")
    const before = structuredClone(legacy)
    expect(store.createSurgery(legacy, { id: legacy.id }).state).toBe("Sin autorizar")
    store.updateSurgery(legacy.id, { state: "Sin fecha" as SurgeryState })
    expect(store.getSurgeryById(legacy.id)?.state).toBe("Sin autorizar")
    store.changeSurgeryStatus(legacy.id, "Sin fecha" as SurgeryState)
    expect(store.getSurgeryById(legacy.id)?.state).toBe("Sin autorizar")
    expect(useOrtoTrackStore.getState().historyEntries.at(-1)?.newValue).toBe("Sin autorizar")
    store.replaceSurgeries([legacy])
    expect(store.getSurgeryById(legacy.id)).toEqual({ ...legacy, state: "Sin autorizar" })
    store.hydrateBackendSurgeries([legacy, surgery("Pendiente"), surgery("Autorizada")])
    expect(useOrtoTrackStore.getState().surgeries.map((item) => item.state)).toEqual(["Sin autorizar", "Pendiente", "Autorizada"])
    expect(JSON.parse(window.localStorage.getItem(storageKey)!).state.surgeries.map((item: Surgery) => item.state)).toEqual(["Sin autorizar", "Pendiente", "Autorizada"])
    expect(legacy).toEqual(before)
    store.updateSurgery(legacy.id, { notes: "Unrelated edit" })
    expect(store.getSurgeryById(legacy.id)?.state).toBe("Sin autorizar")
  })
})
