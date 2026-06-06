/**
 * CHATZAI-017I: Mock data de Clientes / Pagadores
 *
 * Datos comerciales/fiscales mínimos para los clientes que aparecen
 * en CLIENT_OPTIONS (statusHelpers.ts). La clave de lookup es el
 * campo `nombre`, que coincide con el `value` de CLIENT_OPTIONS.
 */
import type { Cliente } from "@/types"

export const MOCK_CLIENTES: Cliente[] = [
  {
    nombre: "OSDE Binario",
    cuit: "30-50001234-5",
    condicionIva: "Responsable Inscripto",
    estadoPagador: "Pagador",
  },
  {
    nombre: "Swiss Medical",
    cuit: "30-50015678-9",
    condicionIva: "Responsable Inscripto",
    estadoPagador: "Pagador",
  },
  {
    nombre: "Galeno",
    cuit: "30-50023456-7",
    condicionIva: "Responsable Inscripto",
    estadoPagador: "Pagador",
  },
  {
    nombre: "IOMA",
    cuit: "30-50034567-2",
    condicionIva: "Exento",
    estadoPagador: "Pagador",
  },
  {
    nombre: "PAMI",
    cuit: "30-50045678-1",
    condicionIva: "Exento",
    estadoPagador: "Pagador",
  },
  {
    nombre: "Particular",
    cuit: "—",
    condicionIva: "Consumidor Final",
    estadoPagador: "No pagador",
  },
  {
    nombre: "Medifé",
    cuit: "30-50056789-4",
    condicionIva: "Responsable Inscripto",
    estadoPagador: "Pagador",
  },
]

/**
 * Lookup: devuelve los datos comerciales/fiscales del cliente
 * por su nombre (coincide con el value de CLIENT_OPTIONS).
 * Retorna undefined si no se encuentra.
 */
export function getClienteByName(nombre: string): Cliente | undefined {
  return MOCK_CLIENTES.find((c) => c.nombre === nombre)
}

/**
 * CHATZAI-017J: Sugiere la alícuota de IVA para un presupuesto
 * en función de la condición fiscal del cliente/pagador.
 *
 * Regla de negocio:
 * - Responsable Inscripto → 21% (alícuota general AFIP)
 * - Exento → "Exento / No gravado" (alícuota 0, tratamiento exento)
 * - Consumidor Final → 21% (quien factura al consumidor final discrimina IVA)
 * - Responsable Monotributo → 0% (no discrimina IVA)
 * - No Responsable → 0%
 *
 * Retorna el `key` de IVA_OPTIONS (string para selector Radix).
 */
export function suggestIvaKey(condicionIva: string): string {
  switch (condicionIva) {
    case "Responsable Inscripto":
    case "Consumidor Final":
      return "21"
    case "Exento":
      return "exento"
    case "Responsable Monotributo":
    case "No Responsable":
      return "0"
    default:
      return "21"
  }
}
