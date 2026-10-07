import { describe, expect, it } from "vitest"

import { removeLegacyDemoSupplierRemittances, useOrtoTrackStore } from "@/lib/store"
import type { RemitoProveedor } from "@/types"

const remito = (id: string): RemitoProveedor => ({
  id,
  proveedorId: "provider-1",
  proveedorName: "Provider",
  number: id,
  date: "2026-08-26",
  items: [],
  state: "Pendiente",
})

describe("supplier remittance Zustand cleanup", () => {
  it("removes only legacy demos and preserves user-created remittances", () => {
    expect(removeLegacyDemoSupplierRemittances([
      remito("RP-0001"),
      remito("RP-0002"),
      remito("RP-0003"),
      remito("RP-REAL-001"),
    ])).toEqual([remito("RP-REAL-001")])
    expect(useOrtoTrackStore.getState().remitosProveedor).toEqual([])
  })

  it("migrates persisted version 0 once and rewrites storage as version 2", async () => {
    window.localStorage.setItem("ortotrack-v2-storage", JSON.stringify({
      state: { remitosProveedor: [remito("RP-0001"), remito("RP-REAL-001")] },
      version: 0,
    }))

    await useOrtoTrackStore.persist.rehydrate()

    expect(useOrtoTrackStore.getState().remitosProveedor).toEqual([remito("RP-REAL-001")])
    expect(JSON.parse(window.localStorage.getItem("ortotrack-v2-storage") ?? "{}")).toMatchObject({ version: 2 })

    window.localStorage.setItem("ortotrack-v2-storage", JSON.stringify({
      state: { remitosProveedor: [remito("RP-0001"), remito("RP-REAL-002")] },
      version: 1,
    }))
    await useOrtoTrackStore.persist.rehydrate()

    expect(useOrtoTrackStore.getState().remitosProveedor).toEqual([remito("RP-0001"), remito("RP-REAL-002")])
    window.localStorage.removeItem("ortotrack-v2-storage")
  })
})
