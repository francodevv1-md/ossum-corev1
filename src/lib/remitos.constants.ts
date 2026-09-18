import type { RemitoEstado, DestinatarioTipo } from "@/types"

export const REMITO_ESTADO_LABELS: Record<RemitoEstado, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  enviado: "Enviado",
  entregado: "Entregado",
  cerrado: "Cerrado",
  anulado: "Anulado",
}

export const REMITO_ESTADO_COLORS: Record<RemitoEstado, string> = {
  borrador: "bg-gray-100 text-gray-700 border-gray-300",
  emitido: "bg-blue-100 text-blue-700 border-blue-300",
  enviado: "bg-sky-100 text-sky-700 border-sky-300",
  entregado: "bg-teal-100 text-teal-700 border-teal-300",
  cerrado: "bg-green-100 text-green-700 border-green-300",
  anulado: "bg-red-100 text-red-700 border-red-300",
}

export const DESTINATARIO_LABELS: Record<DestinatarioTipo, string> = {
  cliente_pagador: "Cliente / Pagador",
  institucion: "Institución",
  medico: "Médico",
  paciente: "Paciente",
}

/** Valid state transitions for Remito */
export const REMITO_TRANSITIONS: Record<RemitoEstado, RemitoEstado[]> = {
  borrador: ["emitido", "anulado"],
  emitido: ["enviado", "anulado"],
  enviado: ["entregado", "anulado"],
  entregado: ["cerrado", "anulado"],
  cerrado: [],
  anulado: [],
}
