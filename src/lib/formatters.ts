export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatNumberAR(value: number, decimals = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string): string {
  if (!date) return "—"
  try {
    return new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return date
  }
}

export function formatDateTime(date: string, time?: string): string {
  return `${formatDate(date)}${time ? ` ${time}` : ""}`
}

export type ContextualDateVariant = "today" | "tomorrow" | "yesterday" | "overdue" | "soon" | "neutral"

export interface ContextualDateResult {
  text: string
  variant: ContextualDateVariant
}

export function formatContextualDate(date: string): ContextualDateResult {
  if (!date) return { text: "—", variant: "neutral" }

  try {
    const parsed = new Date(date + "T00:00:00")
    if (Number.isNaN(parsed.getTime())) return { text: "—", variant: "neutral" }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const parsedStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
    const diffDays = Math.round((parsedStart.getTime() - todayStart.getTime()) / 86400000)

    if (diffDays === 0) return { text: "Hoy", variant: "today" }
    if (diffDays === 1) return { text: "Mañana", variant: "tomorrow" }
    if (diffDays === -1) return { text: "Ayer", variant: "yesterday" }
    if (diffDays < -7) return { text: `Vencida hace ${Math.abs(diffDays)}d`, variant: "overdue" }
    if (diffDays < 0) return { text: `Hace ${Math.abs(diffDays)}d`, variant: "overdue" }
    if (diffDays >= 2 && diffDays <= 3) return { text: `En ${diffDays}d`, variant: "soon" }

    return { text: formatDate(date), variant: "neutral" }
  } catch {
    return { text: "—", variant: "neutral" }
  }
}
