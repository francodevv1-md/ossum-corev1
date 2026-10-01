"use client"

import { useEffect, useState } from "react"

/**
 * Subscribe to a CSS media query.
 * ponytail: media query list is the standard primitive — no need for a polyfill or
 * heavier breakpoint library. Add ResizeObserver-based container queries when we
 * need component-level (not viewport-level) breakpoints.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}