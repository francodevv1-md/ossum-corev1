// OSSUM COR — CUIT module-11 validation utility.
//
// Standalone helper used by the lookup service and the form UI to reject
// malformed CUITs before any network call. Mirrors the well-known
// Argentine CUIT algorithm (multipliers 5-4-3-2-7-6-5-4-3-2).

const MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/**
 * Validates an Argentine CUIT string using the módulo-11 algorithm.
 *
 * Accepts:
 *   - "20123456786" (11 digits)
 *   - "20-12345678-6" (formatted with dashes)
 *
 * Strips non-digits, requires exactly 11 digits, then verifies the
 * check digit. Does NOT enforce prefix semantics (20/23/27/30/33/34)
 * because ARCA sometimes issues CUITs that we still want to query.
 */
export function validateCuitFormat(input: string | null | undefined): boolean {
  if (!input) return false;
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (!MULTIPLIERS.every((_, index) => Number.isFinite(Number(digits[index])))) return false;

  let sum = 0;
  for (let i = 0; i < MULTIPLIERS.length; i += 1) {
    sum += Number(digits[i]) * MULTIPLIERS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 0 : remainder;
  return expected === Number(digits[10]);
}

/**
 * Strips a CUIT string to its 11-digit numeric form.
 */
export function normalizeCuit(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/\D/g, "");
}