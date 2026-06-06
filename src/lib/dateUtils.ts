/**
 * dateUtils.ts
 * Funciones utilitarias de fecha compartidas del proyecto OSSUM COR.
 * Extraídas del módulo Calendario Quirúrgico para reutilización
 * en Coordinadores, Tableros Operativos y futuros módulos.
 */

/**
 * Genera el arreglo de días para la grilla mensual,
 * incluyendo días del mes anterior y siguiente para completar semanas.
 * La semana empieza en lunes.
 */
export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []
  const startDow = (firstDay.getDay() + 6) % 7
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d))
    }
  }
  return days
}

/**
 * Genera los 7 días de la semana que contiene la fecha dada.
 * La semana empieza en lunes.
 */
export function getWeekDays(date: Date): Date[] {
  const dow = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/**
 * Convierte una Date a string "YYYY-MM-DD" para uso como clave de mapa.
 */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Retorna true si la fecha es hoy (comparando año, mes y día local).
 */
export function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/**
 * Retorna true si dos fechas pertenecen al mismo mes y año.
 */
export function isSameMonth(d: Date, ref: Date): boolean {
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}
