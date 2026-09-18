import type { PlantillaPresupuesto } from "@/types"

/**
 * CHATZAI-017D — Plantillas de presupuesto organizadas por categoría.
 * 
 * Categorías:
 * - "clasificacion": plantillas base por tipo de cirugía
 * - "cliente": plantillas específicas por pagador (PAMI, OSDE, etc.)
 * - "medico": plantillas preferidas por médico
 * 
 * Cada categoría tiene plantillas funcionales y placeholders documentados.
 * Solo se muestran en el selector las que tienen items reales.
 */

export const PRESUPUESTO_TEMPLATES: PlantillaPresupuesto[] = [
  // ═══════════════════════════════════════════════════════════
  // Por clasificación / tipo de cirugía (5 activas)
  // ═══════════════════════════════════════════════════════════
  {
    id: "tpl-rtr",
    nombre: "Reemplazo total de rodilla — Estándar",
    clasificacion: "Reemplazo total de rodilla",
    categoria: "clasificacion",
    items: [
      { code: "RTR-001", name: "Implante femoral TCR", quantity: 1, unitPrice: 2850000, isArticuloZ: false },
      { code: "RTR-002", name: "Implante tibial TCR", quantity: 1, unitPrice: 2200000, isArticuloZ: false },
      { code: "RTR-003", name: "Inserto de polietileno", quantity: 1, unitPrice: 950000, isArticuloZ: false },
      { code: "RTR-004", name: "Patela componente", quantity: 1, unitPrice: 780000, isArticuloZ: false },
      { code: "Z-LIBRE", name: "Instrumental específico", quantity: 1, unitPrice: 0, isArticuloZ: true, descripcionLibre: "Instrumental específico TCR" },
    ],
  },
  {
    id: "tpl-pcd",
    nombre: "Prótesis de cadera — Estándar",
    clasificacion: "Prótesis de cadera",
    categoria: "clasificacion",
    items: [
      { code: "PCD-001", name: "Vástago femoral", quantity: 1, unitPrice: 3200000, isArticuloZ: false },
      { code: "PCD-002", name: "Copa acetabular", quantity: 1, unitPrice: 2400000, isArticuloZ: false },
      { code: "PCD-003", name: "Inserto de polietileno cadera", quantity: 1, unitPrice: 850000, isArticuloZ: false },
      { code: "PCD-004", name: "Cabeza femoral cerámica", quantity: 1, unitPrice: 1100000, isArticuloZ: false },
    ],
  },
  {
    id: "tpl-col",
    nombre: "Columna — Estándar",
    clasificacion: "Columna",
    categoria: "clasificacion",
    items: [
      { code: "COL-001", name: "Tornillo pedicular", quantity: 4, unitPrice: 650000, isArticuloZ: false },
      { code: "COL-002", name: "Barra de conexión", quantity: 2, unitPrice: 480000, isArticuloZ: false },
      { code: "COL-003", name: "Conector transversal", quantity: 1, unitPrice: 350000, isArticuloZ: false },
    ],
  },
  {
    id: "tpl-art",
    nombre: "Artroscopía — Estándar",
    clasificacion: "Artroscopía",
    categoria: "clasificacion",
    items: [
      { code: "ART-001", name: "Shaver blade", quantity: 1, unitPrice: 420000, isArticuloZ: false },
      { code: "ART-002", name: "Cámara artroscópica descartable", quantity: 1, unitPrice: 280000, isArticuloZ: false },
      { code: "Z-LIBRE", name: "Material descartable artroscopía", quantity: 1, unitPrice: 0, isArticuloZ: true, descripcionLibre: "Set descartable de artroscopía" },
    ],
  },
  {
    id: "tpl-ost",
    nombre: "Osteosíntesis — Estándar",
    clasificacion: "Osteosíntesis",
    categoria: "clasificacion",
    items: [
      { code: "OST-001", name: "Placa LCP", quantity: 1, unitPrice: 890000, isArticuloZ: false },
      { code: "OST-002", name: "Tornillos de cortical", quantity: 6, unitPrice: 125000, isArticuloZ: false },
      { code: "OST-003", name: "Tornillos de esponjosa", quantity: 2, unitPrice: 145000, isArticuloZ: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Por cliente / pagador (3 activas — CHATZAI-017D)
  // ═══════════════════════════════════════════════════════════
  {
    id: "tpl-rtr-pami",
    nombre: "Rodilla total — PAMI",
    clasificacion: "Reemplazo total de rodilla",
    categoria: "cliente",
    cliente: "PAMI",
    items: [
      { code: "RTR-001", name: "Implante femoral TCR", quantity: 1, unitPrice: 2850000, isArticuloZ: false },
      { code: "RTR-002", name: "Implante tibial TCR", quantity: 1, unitPrice: 2200000, isArticuloZ: false },
      { code: "RTR-003", name: "Inserto de polietileno", quantity: 1, unitPrice: 950000, isArticuloZ: false },
      { code: "Z-LIBRE", name: "Instrumental específico PAMI", quantity: 1, unitPrice: 0, isArticuloZ: true, descripcionLibre: "Instrumental PAMI TCR" },
    ],
  },
  {
    id: "tpl-pcd-osde",
    nombre: "Cadera — OSDE",
    clasificacion: "Prótesis de cadera",
    categoria: "cliente",
    cliente: "OSDE",
    items: [
      { code: "PCD-001", name: "Vástago femoral", quantity: 1, unitPrice: 3200000, isArticuloZ: false },
      { code: "PCD-002", name: "Copa acetabular", quantity: 1, unitPrice: 2400000, isArticuloZ: false },
      { code: "PCD-003", name: "Inserto de polietileno cadera", quantity: 1, unitPrice: 850000, isArticuloZ: false },
      { code: "PCD-004", name: "Cabeza femoral cerámica", quantity: 1, unitPrice: 1100000, isArticuloZ: false },
      { code: "PCD-005", name: "Copas extra premium OSDE", quantity: 1, unitPrice: 450000, isArticuloZ: false },
    ],
  },
  {
    id: "tpl-col-galeno",
    nombre: "Columna — Galeno",
    clasificacion: "Columna",
    categoria: "cliente",
    cliente: "Galeno",
    items: [
      { code: "COL-001", name: "Tornillo pedicular", quantity: 4, unitPrice: 650000, isArticuloZ: false },
      { code: "COL-002", name: "Barra de conexión", quantity: 2, unitPrice: 480000, isArticuloZ: false },
      { code: "COL-003", name: "Conector transversal", quantity: 1, unitPrice: 350000, isArticuloZ: false },
      { code: "Z-LIBRE", name: "Injerto óseo", quantity: 1, unitPrice: 0, isArticuloZ: true, descripcionLibre: "Injerto óseo a confirmar" },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Por médico (3 activas — CHATZAI-017D)
  // ═══════════════════════════════════════════════════════════
  {
    id: "tpl-dr-gomez-rtr",
    nombre: "Dr. Gómez — Rodilla preferida",
    clasificacion: "Reemplazo total de rodilla",
    categoria: "medico",
    medico: "Dr. Gómez",
    items: [
      { code: "RTR-001", name: "Implante femoral TCR", quantity: 1, unitPrice: 2850000, isArticuloZ: false },
      { code: "RTR-002", name: "Implante tibial TCR", quantity: 1, unitPrice: 2200000, isArticuloZ: false },
      { code: "RTR-003", name: "Inserto de polietileno", quantity: 1, unitPrice: 950000, isArticuloZ: false },
      { code: "RTR-004", name: "Patela componente", quantity: 1, unitPrice: 780000, isArticuloZ: false },
      { code: "RTR-G01", name: "Guía de corte específica Gómez", quantity: 1, unitPrice: 350000, isArticuloZ: false },
    ],
  },
  {
    id: "tpl-dr-fernandez-pcd",
    nombre: "Dra. Fernández — Cadera preferida",
    clasificacion: "Prótesis de cadera",
    categoria: "medico",
    medico: "Dra. Fernández",
    items: [
      { code: "PCD-001", name: "Vástago femoral corto", quantity: 1, unitPrice: 3400000, isArticuloZ: false },
      { code: "PCD-002", name: "Copa acetabular dual mobility", quantity: 1, unitPrice: 2800000, isArticuloZ: false },
      { code: "PCD-003", name: "Inserto de polietileno cadera", quantity: 1, unitPrice: 850000, isArticuloZ: false },
    ],
  },
  {
    id: "tpl-dr-ruiz-col",
    nombre: "Dr. Ruiz — Columna preferida",
    clasificacion: "Columna",
    categoria: "medico",
    medico: "Dr. Ruiz",
    items: [
      { code: "COL-001", name: "Tornillo pedicular", quantity: 6, unitPrice: 650000, isArticuloZ: false },
      { code: "COL-002", name: "Barra de conexión", quantity: 2, unitPrice: 480000, isArticuloZ: false },
      { code: "COL-003", name: "Conector transversal", quantity: 2, unitPrice: 350000, isArticuloZ: false },
      { code: "Z-LIBRE", name: "Injerto Dr. Ruiz", quantity: 1, unitPrice: 0, isArticuloZ: true, descripcionLibre: "Injerto según preferencia Dr. Ruiz" },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // Plantillas futuras (placeholders documentados)
  // ═══════════════════════════════════════════════════════════
  // Para agregar nuevas plantillas:
  // 1. Copiar una existente como base
  // 2. Asignar id único (formato: tpl-{siglas}-{sufijo})
  // 3. Setear categoria: "clasificacion" | "cliente" | "medico"
  // 4. Si es "cliente": agregar campo cliente: "Nombre del cliente"
  // 5. Si es "medico": agregar campo medico: "Dr./Dra. Apellido"
  // 6. Solo plantillas con items.length > 0 se muestran en el selector
]

/**
 * Returns only templates that have actual items (non-skeleton).
 */
export function getActiveTemplates(): PlantillaPresupuesto[] {
  return PRESUPUESTO_TEMPLATES.filter((t) => t.items.length > 0)
}

/**
 * Group templates by their category for the template selector.
 */
export function getTemplatesGroupedByCategory(): Record<string, PlantillaPresupuesto[]> {
  const active = getActiveTemplates()
  const groups: Record<string, PlantillaPresupuesto[]> = {}
  for (const t of active) {
    const key = t.categoria
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
}

/**
 * Get unique client names from templates (for filter dropdown).
 */
export function getTemplateClientes(): string[] {
  const clients = new Set<string>()
  for (const t of PRESUPUESTO_TEMPLATES) {
    if (t.cliente) clients.add(t.cliente)
  }
  return Array.from(clients).sort()
}

/**
 * Get unique médico names from templates (for filter dropdown).
 */
export function getTemplateMedicos(): string[] {
  const medicos = new Set<string>()
  for (const t of PRESUPUESTO_TEMPLATES) {
    if (t.medico) medicos.add(t.medico)
  }
  return Array.from(medicos).sort()
}

/**
 * Category labels for display in the selector.
 */
export const PLANTILLA_CATEGORY_LABELS: Record<string, string> = {
  clasificacion: "Por tipo de cirugía",
  cliente: "Por cliente / pagador",
  medico: "Por médico",
}
