/**
 * CONTACTO-CODIGO-AUTO-P1: Pure helper unit tests for src/lib/contact-code.ts.
 * Verifies format/parse/validate/normalize behavior per spec §10.1.
 */
import { describe, it, expect } from "vitest"
import {
  formatContactCode,
  parseContactCode,
  isValidContactCodeFormat,
  normalizeContactCode,
  CONTACT_CODE_REGEX,
} from "@/lib/contact-code"

describe("contact-code helpers", () => {
  describe("formatContactCode(n)", () => {
    it("formats 1 as C-0001", () => {
      expect(formatContactCode(1)).toBe("C-0001")
    })
    it("formats 42 as C-0042", () => {
      expect(formatContactCode(42)).toBe("C-0042")
    })
    it("formats 9999 as C-9999", () => {
      expect(formatContactCode(9999)).toBe("C-9999")
    })
    it("formats 10000 as C-10000 (auto-grow, no truncation)", () => {
      expect(formatContactCode(10000)).toBe("C-10000")
    })
    it("formats 123456 as C-123456", () => {
      expect(formatContactCode(123456)).toBe("C-123456")
    })
    it("throws RangeError for 0", () => {
      expect(() => formatContactCode(0)).toThrow(RangeError)
    })
    it("throws RangeError for -1", () => {
      expect(() => formatContactCode(-1)).toThrow(RangeError)
    })
    it("throws RangeError for 1.5 (not integer)", () => {
      expect(() => formatContactCode(1.5)).toThrow(RangeError)
    })
    it("throws RangeError for NaN", () => {
      expect(() => formatContactCode(NaN)).toThrow(RangeError)
    })
  })

  describe("parseContactCode(code)", () => {
    it("parses C-0001 as 1", () => {
      expect(parseContactCode("C-0001")).toBe(1)
    })
    it("parses C-0042 as 42", () => {
      expect(parseContactCode("C-0042")).toBe(42)
    })
    it("parses C-10000 as 10000", () => {
      expect(parseContactCode("C-10000")).toBe(10000)
    })
    it("parses C-0000 as 0 (regex matches; never produced by counter)", () => {
      expect(parseContactCode("C-0000")).toBe(0)
    })
    it("returns null for C0001 (no dash)", () => {
      expect(parseContactCode("C0001")).toBeNull()
    })
    it("returns null for c-0001 (case-sensitive, canonical only)", () => {
      expect(parseContactCode("c-0001")).toBeNull()
    })
    it("returns null for 0001 (no prefix)", () => {
      expect(parseContactCode("0001")).toBeNull()
    })
    it("returns null for transient C-T0001", () => {
      expect(parseContactCode("C-T0001")).toBeNull()
    })
    it("returns null for empty string", () => {
      expect(parseContactCode("")).toBeNull()
    })
    it("returns null for C-1 (must be ≥4 digits in canonical)", () => {
      expect(parseContactCode("C-1")).toBeNull()
    })
    it("returns null for C-abc", () => {
      expect(parseContactCode("C-abc")).toBeNull()
    })
  })

  describe("isValidContactCodeFormat(code)", () => {
    it("returns true for C-0001", () => {
      expect(isValidContactCodeFormat("C-0001")).toBe(true)
    })
    it("returns true for C-10000", () => {
      expect(isValidContactCodeFormat("C-10000")).toBe(true)
    })
    it("returns false for c-0001 (case-sensitive)", () => {
      expect(isValidContactCodeFormat("c-0001")).toBe(false)
    })
    it("returns false for C0001 (no dash)", () => {
      expect(isValidContactCodeFormat("C0001")).toBe(false)
    })
    it("returns false for 0001", () => {
      expect(isValidContactCodeFormat("0001")).toBe(false)
    })
    it("returns false for legacy 8527", () => {
      expect(isValidContactCodeFormat("8527")).toBe(false)
    })
    it("returns false for transient C-T0001", () => {
      expect(isValidContactCodeFormat("C-T0001")).toBe(false)
    })
    it("returns false for empty string", () => {
      expect(isValidContactCodeFormat("")).toBe(false)
    })
    it("returns true for C-0000 (passes regex; never produced by counter)", () => {
      expect(isValidContactCodeFormat("C-0000")).toBe(true)
    })
  })

  describe("normalizeContactCode(input)", () => {
    it('normalizes "1" → "C-0001"', () => {
      expect(normalizeContactCode("1")).toBe("C-0001")
    })
    it('normalizes "42" → "C-0042"', () => {
      expect(normalizeContactCode("42")).toBe("C-0042")
    })
    it('normalizes "0001" → "C-0001"', () => {
      expect(normalizeContactCode("0001")).toBe("C-0001")
    })
    it('normalizes "C-1" → "C-0001"', () => {
      expect(normalizeContactCode("C-1")).toBe("C-0001")
    })
    it('normalizes "C-0001" → "C-0001"', () => {
      expect(normalizeContactCode("C-0001")).toBe("C-0001")
    })
    it('normalizes "c-0001" → "C-0001" (case-insensitive prefix)', () => {
      expect(normalizeContactCode("c-0001")).toBe("C-0001")
    })
    it('normalizes "C0001" → "C-0001" (optional dash)', () => {
      expect(normalizeContactCode("C0001")).toBe("C-0001")
    })
    it('normalizes "C-10000" → "C-10000" (auto-grow)', () => {
      expect(normalizeContactCode("C-10000")).toBe("C-10000")
    })
    it('normalizes "  C-0042  " → "C-0042" (trims whitespace)', () => {
      expect(normalizeContactCode("  C-0042  ")).toBe("C-0042")
    })
    it('returns null for empty string', () => {
      expect(normalizeContactCode("")).toBeNull()
    })
    it('returns null for "   " (only whitespace)', () => {
      expect(normalizeContactCode("   ")).toBeNull()
    })
    it('returns null for "abc"', () => {
      expect(normalizeContactCode("abc")).toBeNull()
    })
    it('returns null for "C-abc"', () => {
      expect(normalizeContactCode("C-abc")).toBeNull()
    })
    it('returns null for "C-"', () => {
      expect(normalizeContactCode("C-")).toBeNull()
    })
    it('returns null for "12a"', () => {
      expect(normalizeContactCode("12a")).toBeNull()
    })
    it('returns null for "0" (zero is not a valid n)', () => {
      expect(normalizeContactCode("0")).toBeNull()
    })
    it('returns null for "-1" (regex rejects; dash only allowed after C)', () => {
      expect(normalizeContactCode("-1")).toBeNull()
    })
  })

  describe("regex constants", () => {
    it("CONTACT_CODE_REGEX matches C-0001 and rejects transient C-T0001", () => {
      expect(CONTACT_CODE_REGEX.test("C-0001")).toBe(true)
      expect(CONTACT_CODE_REGEX.test("C-T0001")).toBe(false)
    })
  })
})