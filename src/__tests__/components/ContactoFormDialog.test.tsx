import { describe, expect, it } from "vitest"

import { sanitizeContactoSaveError } from "@/components/contactos/ContactoFormDialog"

describe("ContactoFormDialog — friendly save errors", () => {
  it("translates the known identifiable-field API validation error", () => {
    const message = sanitizeContactoSaveError(
      new Error("At least one identifiable field is required (firstName, lastName, legalName, email, phone, or documentNumber)")
    )

    expect(message).toBe(
      "Para guardar el contacto, completá al menos un dato identificable: nombre, email, teléfono, DNI o CUIT."
    )
  })
})
