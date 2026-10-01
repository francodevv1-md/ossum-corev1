"use client"

import { useMediaQuery } from "./useMediaQuery"

/**
 * Returns true when the viewport should render mobile-first layouts.
 *
 * Triggers mobile UI when EITHER:
 * - viewport width is small (<1024px), OR
 * - the primary pointer is coarse (touch) regardless of width.
 *
 * The pointer check matters because high-DPI Windows tablets (e.g. 2712x1220
 * @ ~446 DPI with Windows scaling) report a large CSS viewport yet are touch
 * devices. Width-only breakpoints miss those entirely.
 */
export function useIsMobile(): boolean {
  const isSmallScreen = useMediaQuery("(max-width: 1023px)")
  const isCoarsePointer = useMediaQuery("(pointer: coarse)")
  return isSmallScreen || isCoarsePointer
}