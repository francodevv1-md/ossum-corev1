"use client"

import { useEffect } from "react"
import { useOrtoTrackStore } from "@/lib/store"

/**
 * Hydrates the Zustand persist store on the client side.
 * This is necessary because we use `skipHydration: true` in the persist
 * config to prevent SSR crashes (localStorage is undefined on the server).
 */
export function StoreHydration() {
  useEffect(() => {
    useOrtoTrackStore.persist.rehydrate()
  }, [])

  return null
}
