"use client"

import { useRef, type TouchEventHandler } from "react"

interface SwipeHandlers {
  onTouchStart: TouchEventHandler<HTMLElement>
  onTouchMove: TouchEventHandler<HTMLElement>
  onTouchEnd: TouchEventHandler<HTMLElement>
}

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Minimum pixels of horizontal travel to count as a swipe. */
  threshold?: number
}

/**
 * Horizontal swipe detection for touch surfaces.
 * ponytail: keep it simple — single-touch, horizontal-only. Add
 * velocity-based detection if we ever need flick-to-dismiss.
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 72,
}: SwipeOptions): SwipeHandlers {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  return {
    onTouchStart: (e) => {
      const t = e.targetTouches[0]
      if (!t) return
      startX.current = t.clientX
      startY.current = t.clientY
    },
    onTouchMove: () => {
      // no-op: we just need start + end positions
    },
    onTouchEnd: (e) => {
      const t = e.changedTouches[0]
      if (!t || startX.current === null || startY.current === null) {
        startX.current = null
        startY.current = null
        return
      }
      const dx = t.clientX - startX.current
      const dy = t.clientY - startY.current
      startX.current = null
      startY.current = null
      // require horizontal-dominant motion to avoid hijacking vertical scroll
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    },
  }
}