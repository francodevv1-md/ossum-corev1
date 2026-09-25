import { useEffect, useRef } from "react"

interface UseSurgeryModalA11yOptions {
  isOpen: boolean
  onClose: () => void
}

export function useSurgeryModalA11y({ isOpen, onClose }: UseSurgeryModalA11yOptions) {
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const modalContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus()
        lastFocusedElementRef.current = null
      }
      return
    }

    // Save active element
    lastFocusedElementRef.current = document.activeElement as HTMLElement

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    const originalHeight = document.body.style.height
    const originalTouchAction = document.body.style.touchAction

    document.body.classList.add("modal-open")
    document.body.style.overflow = "hidden"
    document.body.style.height = "100vh"
    document.body.style.touchAction = "none"

    // Focus first interactive element in modal
    const focusTimeout = setTimeout(() => {
      if (modalContainerRef.current) {
        const focusable = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length > 0) {
          focusable[0].focus()
        }
      }
    }, 50)

    // Keydown handler for Escape & Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === "Tab" && modalContainerRef.current) {
        const focusable = Array.from(
          modalContainerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true")

        if (focusable.length === 0) return

        const firstElement = focusable[0]
        const lastElement = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearTimeout(focusTimeout)
      document.body.classList.remove("modal-open")
      document.body.style.overflow = originalOverflow
      document.body.style.height = originalHeight
      document.body.style.touchAction = originalTouchAction
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  return { modalContainerRef }
}
