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
