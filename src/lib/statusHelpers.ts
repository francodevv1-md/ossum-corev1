export function getBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" {
  const map: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info"
  > = {
    // Estado CX — protagonist cromático
    "Sin autorizar": "secondary",   // gris (was warning)
    "Sin fecha": "secondary",       // gris (was warning)
    Pendiente: "warning",         // yellow
    Autorizada: "info",           // light blue
    "En preparación": "info",     // cyan
    "En tránsito": "info",        // blue
    Realizada: "success",         // green
    Finalizada: "info",           // azul oscuro (was success)
    Suspendida: "destructive",    // purple/violet
    Cancelada: "destructive",     // red
    "Sin consumo": "warning",     // brown/terracotta
    // Preparación states (5 values)
    "Sin preparar": "secondary",
    Congelado: "warning",
    "Congelado con faltantes": "destructive",
    Entregado: "info",
    Retirado: "secondary",
    Borrador: "warning",
    Aprobado: "success",
    Rechazado: "destructive",
    Validado: "success",
    Facturado: "success",
    Incompleta: "destructive",
    Completa: "info",
    "Apta para facturar": "success",
    PR: "secondary",
    PE: "info",
    NR: "warning",
    FV: "success",
    CO: "default",
    NC: "destructive",
    ND: "destructive",
    Emitida: "info",
    Aplicada: "success",
    Anulada: "destructive",
    Parcial: "warning",
    Cobrado: "success",
    Pagada: "success",
    Recibida: "success",
    "Parcialmente recibida": "warning",
    "En OC": "info",
    Solicitada: "info",
    Urgente: "destructive",
    Verificado: "success",
    Recibido: "info",
  }
  return map[status] || "secondary"
}

export const comprobanteTypeLabels: Record<string, string> = {
  PR: "Presupuesto",
  PE: "Pedido",
  NR: "Nota de remisión",
  FV: "Factura",
  CO: "Cobro",
  NC: "Nota de crédito",
  ND: "Nota de débito",
}

export const CLASSIFICATION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "Reemplazo total de rodilla", label: "Reemplazo total de rodilla" },
  { value: "Prótesis de cadera", label: "Prótesis de cadera" },
  { value: "Osteosíntesis", label: "Osteosíntesis" },
  { value: "Artroscopía", label: "Artroscopía" },
  { value: "Columna", label: "Columna" },
  { value: "Tobillo", label: "Tobillo" },
  { value: "Hombro", label: "Hombro" },
  { value: "Descartable", label: "Descartable" },
  { value: "Otro", label: "Otro" },
]

export const SURGERY_STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Sin autorizar", label: "Sin autorizar" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Autorizada", label: "Autorizada" },
  { value: "En preparación", label: "En preparación" },
  { value: "En tránsito", label: "En tránsito" },
  { value: "Realizada", label: "Realizada" },
  { value: "Finalizada", label: "Finalizada" },
  { value: "Suspendida", label: "Suspendida" },
  { value: "Cancelada", label: "Cancelada" },
]

export const CLIENT_OPTIONS = [
  { value: "", label: "Todos los clientes" },
  { value: "OSDE Binario", label: "OSDE Binario" },
  { value: "Swiss Medical", label: "Swiss Medical" },
  { value: "Galeno", label: "Galeno" },
  { value: "IOMA", label: "IOMA" },
  { value: "PAMI", label: "PAMI" },
  { value: "Particular", label: "Particular" },
  { value: "Medifé", label: "Medifé" },
]

export const INSTITUTION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "Hospital Italiano", label: "Hospital Italiano" },
  { value: "Sanatorio Trinidad", label: "Sanatorio Trinidad" },
  { value: "Hospital Alemán", label: "Hospital Alemán" },
  { value: "Sanatorio Güemes", label: "Sanatorio Güemes" },
]

export const PREPARATION_STATE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "Sin preparar", label: "Sin preparar" },
  { value: "Congelado", label: "Congelado" },
  { value: "Congelado con faltantes", label: "Congelado con faltantes" },
  { value: "Entregado", label: "Entregado" },
  { value: "Retirado", label: "Retirado" },
]

export const DOCUMENTATION_OPTIONS = [
  { value: "", label: "Toda" },
  { value: "Incompleta", label: "Incompleta" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Completa", label: "Completa" },
  { value: "Apta para facturar", label: "Apta para facturar" },
]

export const ALL_GRID_COLUMNS = [
  { key: "id", label: "ID", defaultVisible: true },
  { key: "prNumber", label: "PR Nº", defaultVisible: true },
  { key: "state", label: "Estado", defaultVisible: true },
  { key: "date", label: "Fecha CX", defaultVisible: true },
  { key: "client", label: "Cliente", defaultVisible: true },
  { key: "institution", label: "Institución", defaultVisible: true },
  { key: "surgeon", label: "Médico", defaultVisible: true },
  { key: "patient", label: "Paciente", defaultVisible: true },
  { key: "classification", label: "Clasificación", defaultVisible: true },
  { key: "urgente", label: "Urgente", defaultVisible: true },
  { key: "provincia", label: "Provincia", defaultVisible: false },
  { key: "vendedor", label: "Vendedor", defaultVisible: false },
  { key: "preparationState", label: "Preparación", defaultVisible: true },
  { key: "expedienteNumber", label: "Expediente", defaultVisible: true },
  { key: "facturado", label: "Facturado", defaultVisible: true },
  { key: "autorizado", label: "Autorizado", defaultVisible: false },
  { key: "instrumentador", label: "Instrumentador", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
] as const
