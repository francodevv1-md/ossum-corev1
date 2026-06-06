import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Accent-insensitive normalization for string comparison.
 * Strips diacritical marks so that "González" matches "Gonzalez".
 * Usage: normalizeAccents(fieldValue).includes(normalizeAccents(query))
 */
export function normalizeAccents(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}
