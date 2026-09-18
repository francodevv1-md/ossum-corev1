// ===== Surgery States =====
export type SurgeryState =
  | "Sin autorizar" | "Sin fecha" | "Pendiente" | "Autorizada"
  | "En tránsito" | "Realizada" | "Finalizada"
  | "Suspendida" | "Cancelada" | "Sin consumo"

// ===== Logistics States =====
export type LogisticsState =
  | "Sin preparar" | "Congelado" | "Congelado con faltantes"
  | "Preparado" | "Enviado" | "Retirado" | "Devuelto" | "Controlado"

// ===== Preparation States =====
export type PreparationState =
  | "Sin preparar" | "Congelado" | "Congelado con faltantes"
  | "En preparación" | "Enviado" | "Entregado" | "Retirado"

// ===== User Roles =====
export type UserRole =
  | "Administrador" | "Gerencia" | "Coordinador" | "Depósito"
  | "Logística" | "Instrumentador" | "Facturación"
  | "Administración" | "Compras" | "Solo lectura"

// ===== Comprobante Types =====
export type ComprobanteType = "PR" | "PE" | "NR" | "FV" | "CO" | "NC" | "ND"

// ===== Document Checklist Item Types =====
export type DocumentChecklistType =
  | "Certificado de implantes" | "Protocolo" | "Remito"
  | "RX" | "Sticker" | "Sin diferencia de consumo" | "Autoriza facturación"

// ===== Document Status =====
export type DocumentStatus = "Incompleta" | "Pendiente" | "Completa" | "Apta para facturar"

// ===== Surgery Classification =====
export type SurgeryClassification =
  | "Reemplazo total de rodilla" | "Prótesis de cadera" | "Osteosíntesis"
  | "Artroscopía" | "Columna" | "Tobillo" | "Hombro" | "Descartable" | "Otro"

// ===== Note Type =====
export type NoteType = "General" | "Urgente" | "Logística" | "Facturación" | "Interna" | "preparacion_pedido"
export type NotePriority = "Baja" | "Media" | "Alta"

// ===== Instrumentador State =====
export type InstrumentadorState =
  | "Pendiente" | "Realizada" | "Finalizada" | "Doc. incompleta"
  | "Doc. completa" | "Autorización OK" | "Pagada" | "Facturada"

// ===== Stock Movement Type =====
export type StockMovementType = "Ingreso" | "Egreso" | "Ajuste positivo" | "Ajuste negativo" | "Devolución" | "Traspaso"

// ===== Transit Type =====
export type TransitType = "En tránsito CX" | "En tránsito permanente"

// ===== Expiry Status =====
export type ExpiryStatus = "Vencido" | "Próximo a vencer" | "Correcto"

// ===== Referencia Administrativa =====
export type TipoReferencia =
  | "Autorización" | "DNI" | "Expediente" | "Siniestro" | "Concurso"
  | "Afiliado" | "CM" | "HC" | "Orden" | "Ref" | "Otro"

export interface ReferenciaAdministrativa {
  id: string
  tipo: TipoReferencia
  valor: string
  observacion?: string
}

// ===== Plantilla Presupuesto =====
export type PlantillaCategory = "clasificacion" | "cliente" | "medico"

export interface PlantillaPresupuesto {
  id: string
  nombre: string
  clasificacion: SurgeryClassification
  categoria: PlantillaCategory
  cliente?: string        // Future: filter by client/pagador
  medico?: string         // Future: filter by surgeon
  items: PlantillaItem[]
}

export interface PlantillaItem {
  code: string
  name: string
  quantity: number
  unitPrice: number
  isArticuloZ: boolean
  descripcionLibre?: string
}

// ===== Surgery =====
export type CoordinatorAssignmentSlaBasis =
  | { status: "valid"; createdAt: string; epochMs: number }
  | { status: "missing"; diagnosticCode: "assignment_created_at_missing" }
  | { status: "invalid"; diagnosticCode: "assignment_created_at_invalid" }

export type SurgeryCoordinatorAssignment = {
  assignmentId: string
  contactId: string
  label: string
  isPrimary: boolean
  slaBasis: CoordinatorAssignmentSlaBasis
}

export interface Surgery {
  id: string
  /** Backend technical identifier used for API relations/actions when available. */
  backendId?: string
  /** Canonical backend CX state; UI labels are derived separately. */
  backendCxStatus?: string
  /** Visible operational surgery code, e.g. CX-0001. Do not fall back to technical IDs for display. */
  visibleNumber?: string
  patient: string
  patientDni: string
  surgeon: string
  institution: string
  institutionCity: string
  procedure: string
  date: string
  time: string
  probableDate?: string
  state: SurgeryState
  boxId?: string
  remitoId?: string
  presupuestoId?: string
  notes?: string
  client: string
  obraSocial?: string
  financiador?: string
  classification: SurgeryClassification
  expedienteNumber?: string
  altaExpediente?: string
  preparationState: PreparationState
  facturado: boolean
  autorizado: boolean
  fechaAutorizacion?: string
  usuarioAutorizacion?: string
  fechaFactura?: string
  facturaNumber?: string
  instrumentador?: string
  vendedor?: string
  titular?: string
  provincia?: string
  tipoGestion?: string
  leyenda?: string
  aQuienRemitir?: string
  aQuienFacturar?: string
  horaEnvio?: string
  prNumber?: string
  coordinadorCx?: string
  urgente: boolean
  localidad?: string
  leyendaDestacada: boolean
  fechaEnvioMaterial?: string
  /** Canonical backend material availability date (YYYY-MM-DD). */
  materialAvailabilityDate?: string
  /** Canonical planned material transport for Coordination. */
  materialTransport?: string
  referenciasAdministrativas: ReferenciaAdministrativa[]
  // CHATZAI-020: Contact references (transition — legacy text fields preserved)
  clientContactId?: string
  surgeonContactId?: string
  patientContactId?: string
  institutionContactId?: string
  // CHATZAI-025: Additional contact references
  vendedorContactId?: string
  instrumentadorContactId?: string
  coordinadorContactId?: string
  coordinatorAssignmentState?: "none" | "resolved" | "ambiguous"
  coordinatorAssignments?: SurgeryCoordinatorAssignment[]
}

// ===== Stock Item =====
export interface StockItem {
  id: string
  code: string
  name: string
  description: string
  category: string
  section: string
  rubro: string
  department: string
  brand: string
  supplier: string
  lot: string
  serial?: string
  expiry: string
  quantity: number
  minStock: number
  location: string
  deposit: string
  sterilized: boolean
  sterilizationDate?: string
  unitPrice: number
  ingresoComprobante?: string
  /** CHATZAI-025: Alícuota de IVA por artículo. Key de IVA_OPTIONS ("21", "10.5", "exento", "0", "27"). Default "21". */
  ivaKey?: string
}

// ===== Stock Movement =====
export interface StockMovement {
  id: string
  date: string
  type: StockMovementType
  stockItemId: string
  itemName: string
  code: string
  lot: string
  quantity: number
  userId: string
  userName: string
  details: string
  relatedId?: string
}

// ===== Box =====
export interface Box {
  id: string
  name: string
  type: string
  surgeryId?: string
  contents: BoxContent[]
  state: LogisticsState
  preparedAt?: string
  sentAt?: string
  returnedAt?: string
}

export interface BoxContent {
  stockItemId: string
  name: string
  code: string
  quantity: number
  consumed: number
  returned: number
}

// ===== Remito =====
export interface Remito {
  id: string
  surgeryId: string
  boxId: string
  destination: string
  date: string
  state: LogisticsState
  items: RemitoItem[]
}

export interface RemitoItem {
  stockItemId: string
  name: string
  code: string
  sentQuantity: number
  returnedQuantity: number
  consumedQuantity: number
}

// ===== Presupuesto =====
export type PresupuestoState = "Borrador" | "Enviado" | "Aprobado" | "Rechazado"

export interface Presupuesto {
  id: string
  surgeryId?: string              // CHANGED: now optional (DF-002)

  // --- Datos Comerciales ---
  client: string                  // OBLIGATORIO
  obraSocial?: string
  financiador?: string
  vendedor: string                // CHANGED: now REQUIRED (was optional)
  patient?: string                // CHANGED: now optional (was required)
  institution?: string            // CHANGED: now optional (was required)
  concepto?: string               // NEW

  // --- Condiciones ---
  fechaEmision: string            // NEW — OBLIGATORIO, default = today
  vigencia: string                // CHANGED: now REQUIRED (was optional, DF-005)
  listaPrecios: string            // CHANGED: now REQUIRED (was optional, DF-005)
  condicionPago?: string          // NEW
  descuento?: number              // NEW — percentage

  // --- Ítems y Totales ---
  items: PresupuestoItem[]
  subtotal: number                // NEW — sum of items before discount
  total: number                   // CHANGED: now = subtotal - discount

  // --- Estado y Ciclo de Vida ---
  state: PresupuestoState
  createdAt: string
  approvedAt?: string
  observaciones?: string
  bloqueado: boolean

  // --- Preparatorios (sin UI en V1) ---
  version: number                 // NEW (DF-003)
  versionStatus: "vigente" | "aprobada" | "reemplazada"  // NEW (DF-003)
  parentPresupuestoId?: string    // NEW (DF-003)
  revisorInternoId?: string       // NEW (DF-007)
  fechaRevisionInterna?: string   // NEW (DF-007)
  aprobadoInternamente?: boolean  // NEW (DF-007)
}

export interface PresupuestoItem {
  stockItemId: string
  name: string
  code: string
  quantity: number
  unitPrice: number
  /** CHATZAI-017K: Descuento por ítem (porcentaje 0-100). Default 0. */
  discountPercent?: number
  subtotal: number
  /** CHATZAI-017L: ID del artículo en el catálogo/stock. Vacío = artículo libre. */
  catalogItemId?: string
  /** @deprecated Use catalogItemId + derived logic instead. Kept for backward compat. */
  isArticuloZ?: boolean
  descripcionLibre?: string
  /** CHATZAI-025: Alícuota de IVA por ítem. Key de IVA_OPTIONS. Default = global presupuesto IVA. */
  ivaKey?: string
}

// ===== Consumo =====
export interface Consumo {
  id: string
  surgeryId: string
  boxId: string
  items: ConsumoItem[]
  validatedBy: string
  validatedAt?: string
  state: "Pendiente" | "Validado" | "Facturado"
  origen?: "remito" | "manual"
  justificacion?: string
  remitoId?: string
}

export interface ConsumoItem {
  stockItemId: string
  name: string
  code: string
  lot: string
  serial?: string
  department: string
  rubro: string
  brand: string
  expiry?: string
  consumed: number
  returned: number
  observacionesFaltante?: string
  remitoOrigen?: string
}

// ===== User =====
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

// ===== Comprobante =====
export interface Comprobante {
  id: string
  surgeryId: string
  type: ComprobanteType
  number: string
  date: string
  client: string
  expiry?: string
  amount: number
  /** @deprecated Use getSaldoPendienteFactura from cobros.utils for dynamic calculation */
  toCollect: number
  concept: string
  state: string
  facturaData?: FacturaVentaData  // CHATZAI-010: datos extendidos para FV
}

// ===== Logistics Detail =====
export interface LogisticsDetail {
  surgeryId: string
  ida: LogisticsState
  vuelta: LogisticsState
  amount: number
  preparation: PreparationState
  fechaEnvioMateriales?: string
  registroSalida?: string
  registroRetiro?: string
  registroDevolucion?: string
  cajaState?: string
}

// ===== History Entry =====
export interface HistoryEntry {
  id: string
  surgeryId: string
  date: string
  time: string
  userId: string
  userName: string
  action: string
  details: string
  previousValue?: string
  newValue?: string
}

// ===== Surgery Note =====
export interface SurgeryNote {
  id: string
  surgeryId: string
  date: string
  time: string
  userId: string
  userName: string
  text: string
  type: NoteType
  priority: NotePriority
  isInternal: boolean
  preparacionItems?: PreparacionPedidoItem[]
  preparacionEstado?: "pendiente" | "confirmado_por_deposito"
  confirmadoPor?: string
  fechaConfirmacion?: string
}

// ===== Document Checklist =====
export interface SurgeryDocumentChecklist {
  id: string
  surgeryId: string
  items: DocumentChecklistItem[]
  status: DocumentStatus
}

export interface DocumentChecklistItem {
  type: DocumentChecklistType
  completed: boolean
  uploadedAt?: string
  uploadedBy?: string
  observations?: string
}

// ===== Instrumentador =====
export interface Instrumentador {
  id: string
  name: string
  email: string
  phone: string
  speciality: string
}

export interface InstrumentadorSurgery {
  id: string
  instrumentadorId: string
  instrumentadorName: string
  surgeryId: string
  patient: string
  surgeon: string
  institution: string
  date: string
  classification: SurgeryClassification
  state: InstrumentadorState
  price: number
  pagada: boolean
  documentacionCompleta: boolean
  autorizacionOK: boolean
}

// ===== Material en Tránsito =====
export interface MaterialTransito {
  id: string
  stockItemId: string
  articleName: string
  articleCode: string
  department: string
  section: string
  rubro: string
  type: TransitType
  surgeryId: string
  surgeryDate: string
  nrNumber?: string
  institution: string
  institutionCity: string
  surgeon: string
  patient: string
  comprobanteSalida: string
  deposit: string
  consumoId?: string
}

// ===== Expiry Item =====
export interface ExpiryItem {
  id: string
  stockItemId: string
  articleName: string
  articleCode: string
  lot: string
  section: string
  rubro: string
  department: string
  brand: string
  supplier: string
  expiry: string
  quantity: number
  deposit: string
  ingresoComprobante: string
  status: ExpiryStatus
}

// ===== Classification Config =====
export interface ClassificationConfig {
  id: string
  name: SurgeryClassification
  description: string
  active: boolean
}

// ===== Traceability Entry =====
export interface TraceEntry {
  id: string
  stockItemId: string
  itemName: string
  code: string
  lot: string
  serial?: string
  action: string
  timestamp: string
  userId: string
  userName: string
  details: string
}

// ===== FACTURACIÓN TYPES (CHATZAI-010) =====
export type BaseFacturacion = "presupuesto" | "consumo" | "mixto"

export type EstadoFacturacion =
  | "sin_facturar"
  | "autorizado_para_facturar"
  | "pendiente_sin_documentacion"
  | "listo_para_facturar"
  | "facturado"
  | "factura_sin_cobrar"
  | "factura_cobrada_parcialmente"
  | "factura_cobrada"
  | "vencida"

export type ConsumoState = "Pendiente" | "Validado" | "Facturado"

export interface DiferenciaFactura {
  stockItemId: string
  name: string
  code: string
  cantPresupuestada: number
  cantConsumida: number
  precioUnitario: number
  diferencia: number               // cantConsumida - cantPresupuestada
  impactoMonetario: number         // diferencia × precioUnitario
  tipo: "cantidad" | "no_consumido" | "no_presupuestado" | "articulo_z" | "precio"
}

export interface FacturaVentaData {
  // Base de facturación
  baseFacturacion: BaseFacturacion
  presupuestoBaseId: string
  totalPresupuestado: number
  totalConsumidoValorizado: number
  deltaDetectado: number
  diferenciasAceptadas: number
  totalAFacturar: number

  // Snapshot de presupuesto (DF-Fact-08)
  presupuestoVersion?: string
  presupuestoFechaSnapshot?: string

  // Diferencias registradas
  diferencias?: DiferenciaFactura[]

  // Referencia fiscal (futuro - TusFacturasAPP)
  cae?: string
  caeVencimiento?: string
  qrBase64?: string
  pdfUrl?: string
  externalReference?: string
  fiscalEmitidaAt?: string
}

// ===== VENTAS TYPES =====
export type NotaCreditoState = "Borrador" | "Emitida" | "Aplicada" | "Anulada"

export interface NotaCredito {
  id: string
  facturaId: string
  surgeryId: string
  client: string
  motivo: string
  importe: number
  state: NotaCreditoState
  createdAt: string
  observaciones?: string
}

export type NotaDebitoState = "Borrador" | "Emitida" | "Aplicada" | "Anulada"

export interface NotaDebito {
  id: string
  facturaId: string
  surgeryId: string
  client: string
  motivo: string
  importe: number
  state: NotaDebitoState
  createdAt: string
  observaciones?: string
}

// ===== COBROS V2 TYPES (CHATZAI-013) =====
export type MedioCobro = "transferencia" | "cheque" | "efectivo" | "deposito" | "otro"

export type EstadoCobro = "registrado" | "parcialmente_imputado" | "imputado_completo"

export type EstadoCobranzaFactura = "sin_cobrar" | "cobro_parcial" | "cobrada" | "vencida"

export interface CobroV2 {
  id: string
  fecha: string
  clienteId: string
  clienteNombre: string
  importe: number
  medioCobro: MedioCobro
  referencia?: string
  observaciones?: string
  fechaRegistro: string
}

export interface ImputacionCobro {
  id: string
  cobroId: string
  facturaId: string         // Comprobante.number of the FV
  importeImputado: number
  fechaImputacion: string
}

// ===== COMPRAS TYPES =====
export interface Proveedor {
  id: string
  name: string
  cuit: string
  email: string
  phone: string
  address: string
  category: string
  rating: number
  active: boolean
}

export type NecesidadCompraState = "Pendiente" | "En OC" | "Solicitada" | "Enviada" | "Recibida" | "Cancelada"
export type NecesidadCompraPriority = "Baja" | "Media" | "Alta" | "Urgente"
export type NecesidadCompraOrigin = "Consumo" | "Stock crítico" | "Faltante preparación" | "Artículo Z" | "Diferencia presupuesto" | "Vencimiento próximo"

export interface NecesidadCompra {
  id: string
  stockItemId?: string
  articleName: string
  articleCode: string
  isArticuloZ: boolean
  descripcionLibre?: string
  proveedorSugerido?: string
  proveedorId?: string
  cantidad: number
  priority: NecesidadCompraPriority
  origin: NecesidadCompraOrigin
  surgeryId?: string
  observacion?: string
  state: NecesidadCompraState
  ordenCompraId?: string
  createdAt: string
}

export type OrdenCompraState = "Borrador" | "Emitida" | "Enviada" | "Parcialmente recibida" | "Recibida" | "Cancelada"

export interface OrdenCompra {
  id: string
  proveedorId: string
  proveedorName: string
  items: OrdenCompraItem[]
  total: number
  state: OrdenCompraState
  createdAt: string
  enviadaAt?: string
  recibidaAt?: string
  observaciones?: string
  necesidadCompraIds: string[]
}

export interface OrdenCompraItem {
  stockItemId: string
  name: string
  code: string
  quantity: number
  unitPrice: number
  subtotal: number
  received: number
  isArticuloZ?: boolean
  descripcionLibre?: string
}

export interface MovimientoCompra {
  id: string
  ordenCompraId: string
  proveedorId: string
  proveedorName: string
  remitoEntrada?: string
  date: string
  items: { stockItemId: string; name: string; code: string; quantity: number; unitPrice: number }[]
  total: number
  state: "Pendiente" | "Recibido" | "Verificado"
}

export type OrdenPagoState = "Pendiente" | "Pagada" | "Anulada"
export type MedioPago = "Transferencia" | "Cheque" | "Efectivo" | "Tarjeta" | "Retención"

export interface OrdenPago {
  id: string
  proveedorId: string
  proveedorName: string
  facturaCompraId?: string
  ordenCompraId?: string
  remitoEntradaId?: string
  importe: number
  vencimiento: string
  state: OrdenPagoState
  medioPago: MedioPago
  fechaPago?: string
  observaciones?: string
}

/** Línea de una factura de compra. */
export interface FacturaCompraItem {
  name: string
  code: string
  quantity: number
  unitPrice: number
  subtotal: number
  /** ID del StockItem en catálogo si se matcheó. */
  stockItemId?: string
}

export interface FacturaCompra {
  id: string
  proveedorId: string
  proveedorName: string
  number: string
  date: string
  items: FacturaCompraItem[]
  total: number
  state: "Pendiente" | "Pagada" | "Anulada"
  ordenCompraId?: string
}

/** Línea de un remito de proveedor (mercadería recibida). */
export interface RemitoProveedorItem {
  name: string
  code: string
  quantity: number
  /** Cantidad recibida efectivamente; por defecto igual a quantity. */
  received?: number
  /** Lote / serie reportado por el proveedor, si trae trazabilidad. */
  lot?: string
  /** Vencimiento reportado por el proveedor (YYYY-MM-DD), si aplica. */
  expiry?: string
  /** ID del StockItem en catálogo si se matcheó, sino vacío/artículo libre. */
  stockItemId?: string
}

export type RemitoProveedorState = "Pendiente" | "Recibido" | "Verificado" | "Anulado"

/** Remito de proveedor: documento de ingreso de mercadería por compra. */
export interface RemitoProveedor {
  id: string
  proveedorId: string
  proveedorName: string
  number: string
  date: string
  items: RemitoProveedorItem[]
  state: RemitoProveedorState
  ordenCompraId?: string
  facturaCompraId?: string
  remitoEntradaRef?: string
  observaciones?: string
}

export interface ForecastItem {
  id: string
  stockItemId: string
  articleName: string
  articleCode: string
  category: string
  consumoHistorico3m: number
  consumoHistorico6m: number
  consumoHistorico12m: number
  consumoPorMedico: { medico: string; cantidad: number }[]
  consumoPorInstitucion: { institucion: string; cantidad: number }[]
  consumoPorClasificacion: { clasificacion: string; cantidad: number }[]
  stockActual: number
  stockMinimo: number
  vencimientosProximos: number
  cirugiasFuturas: number
  sugerenciaCompra: number
  prioridad: "Baja" | "Media" | "Alta" | "Urgente"
}

export interface EvaluacionProveedor {
  id: string
  proveedorId: string
  proveedorName: string
  fecha: string
  calidad: number
  puntualidad: number
  precio: number
  servicio: number
  promedio: number
  observaciones?: string
}

// ─── CHATZAI-017I: Cliente / Pagador ───

/** Condición frente al IVA del cliente/pagador */
export type CondicionIvaCliente =
  | "Responsable Inscripto"
  | "Responsable Monotributo"
  | "Exento"
  | "Consumidor Final"
  | "No Responsable"

/** Estado comercial del cliente/pagador respecto al pago de cirugías */
export type EstadoPagador = "Pagador" | "No pagador"

/** Entidad Cliente / Pagador con datos comerciales/fiscales mínimos */
export interface Cliente {
  /** Nombre que aparece en CLIENT_OPTIONS (clave de lookup) */
  nombre: string
  /** CUIT con formato XX-XXXXXXXX-X */
  cuit: string
  /** Condición frente al IVA */
  condicionIva: CondicionIvaCliente
  /** Estado comercial: si pagará o no la cirugía / presupuesto */
  estadoPagador: EstadoPagador
}

// ═══════════════════════════════════════════════════════════════
// CHATZAI-025A.1: MAESTRO DE CONTACTOS — Roles + Grupos
// ═══════════════════════════════════════════════════════════════

/**
 * Roles V1 del Maestro de Contactos (LEGACY — mantener para compatibilidad).
 * @deprecated Usar ContactRole (V2) en su lugar.
 */
export type ContactoRol =
  | "cliente_pagador"
  | "proveedor"
  | "medico"
  | "paciente"
  | "institucion"

/**
 * DC-CT-015: Roles generales del contacto (V2).
 * Los roles principales son pocos, amplios y estructurales:
 * - Cliente: agrupa médicos, pacientes, instituciones, OS, ART, prepagas, particulares
 * - Proveedor: agrupa instrumentadores, proveedores de implantes, insumos, descartables, servicios
 * - Interno: agrupa coordinadores, vendedores, depósito, administración, logística, dirección
 */
export type ContactRole = "cliente" | "proveedor" | "interno"

/**
 * DC-CT-016: Grupo de contacto — clasifica a un contacto dentro de un rol general.
 * Cada grupo pertenece a un rol general. Los grupos son configurables y extensibles.
 */
export interface ContactGroup {
  id: string
  nombre: string
  role: ContactRole
  activo: boolean
}

/** Tipo de persona jurídica/física */
export type TipoPersona = "fisica" | "juridica"

/** Datos específicos del rol Cliente/Pagador */
export interface DatosClientePagador {
  esPagador: boolean
  condicionIva: CondicionIvaCliente
  condicionPago?: string
  listaPreciosDefault?: string
  descuentoHabitual?: number
}

/** Datos específicos del rol Médico */
export interface DatosMedico {
  matricula?: string
  especialidad?: string
}

/** Datos específicos del rol Institución */
export interface DatosInstitucion {
  observacionEntrega?: string
}

export type ContactAddressGeo = {
  georefId?: string | null; entityType?: "ADDRESS" | "LOCALITY" | null; provinceGeorefId?: string | null; provinceName?: string | null
  latitude?: number | null; longitude?: number | null; coordinateType?: "ADDRESS" | "CENTROID" | "MANUAL" | null; crs?: "EPSG:4326" | null
  source?: "Georef Argentina" | "Manual" | null; sourceVersion?: string | null; sourceRetrievedAt?: string | null
  validationStatus?: "candidate" | "missing" | "conflict" | "verified" | "manual_verified" | "deprecated" | null; validationNotes?: string | null
}

/**
 * Contacto — entidad unificada del Maestro de Contactos.
 * DC-CT-018: Un contacto tiene código único, puede tener múltiples roles generales
 * y múltiples grupos. No se duplica para resolver usos distintos.
 *
 * Principio: un contacto = un código = múltiples roles + grupos simultáneos.
 */
export interface Contacto {
  id: string
  /** Código único visible (ej: C-0001, C-0042 — Phase 1 canonical form) */
  codigoContacto: string
  tipoPersona: TipoPersona
  /** Nombre para persona física o razón social para jurídica */
  nombre: string
  nombreFantasia?: string
  razonSocial?: string
  cuit?: string
  dni?: string
  estado: "activo" | "inactivo"
  observaciones?: string

  /** DC-CT-015: Roles generales del contacto (V2) */
  roles: ContactRole[]
  /** DC-CT-016: Grupos asignados al contacto (IDs de ContactGroup) */
  groups: string[]

  /** @deprecated V1 legacy roles — mantener para compatibilidad temporal */
  legacyRoles?: ContactoRol[]

  telefonos?: string[]
  email?: string
  domicilio?: string
  provincia?: string
  localidad?: string
  codigoPostal?: string
  mainAddressGeo?: ContactAddressGeo
  /** Datos específicos del rol cliente (solo si el rol está activo) */
  datosClientePagador?: DatosClientePagador
  /** Datos específicos del grupo médicos (solo si pertenece al grupo) */
  datosMedico?: DatosMedico
  /** Datos específicos del grupo instituciones (solo si pertenece al grupo) */
  datosInstitucion?: DatosInstitucion
  createdAt: string
  updatedAt: string
}

// ===== REMITO V2 TYPES (CHATZAI-022) =====
export type RemitoEstado = "borrador" | "emitido" | "enviado" | "entregado" | "cerrado" | "anulado"

export type DestinatarioTipo = "cliente_pagador" | "institucion" | "medico" | "paciente"

export interface DestinatarioSnapshot {
  codigoContacto?: string
  nombre: string
  cuitDni?: string
  domicilio?: string
  localidad?: string
  provincia?: string
}

export interface PreparacionPedidoItem {
  codigo: string
  descripcion: string
  cantidad?: number
}

// ===== VALIDATION TYPES =====
export interface ValidationIssue {
  itemId: string
  fieldName: string
  severity: "error" | "warning"
  message: string
}

// ===== COMPARATIVA TYPES (CHATZAI-024) =====
export type EstadoLineaComparativa =
  | "coincidente"
  | "pendiente_remitir"
  | "remitido_de_mas"
  | "consumido_de_mas"
  | "consumido_de_menos"
  | "devuelto"
  | "no_presupuestado"
  | "revision_manual"

export type MetodoMatchComparativa = "stockItemId" | "codigo" | "descripcion" | "sin_match"

export interface LineaComparativa {
  key: string
  catalogItemId?: string
  codigo: string
  descripcion: string
  stockItemId: string
  presupuestado: number
  remitido: number
  consumido: number
  devuelto: number
  difPrVsNr: number
  difNrVsConsumo: number
  difPrVsConsumo: number
  precioBase: number
  deltaEconomico: number
  estadoLinea: EstadoLineaComparativa
  metodoMatch: MetodoMatchComparativa
  necesitaRevision: boolean
  presupuestoItemId?: string
  remitoItemIds: string[]
  consumoItemId?: string
  observaciones?: string[]
  detalleRemitos?: { remitoId: string; cantidad: number; estado: string }[]
}

export interface DiferenciaComparativa {
  tipo: "cantidad" | "no_consumido" | "no_presupuestado" | "articulo_z" | "sin_match"
  stockItemId: string
  codigo: string
  descripcion: string
  cantPresupuestada: number
  cantConsumida: number
  precioUnitario: number
  diferencia: number
  impactoMonetario: number
}

export interface ResumenComparativaMateriales {
  surgeryId: string
  tienePresupuesto: boolean
  tieneRemitos: boolean
  tieneConsumo: boolean
  consumoEstado?: ConsumoState
  totalLineas: number
  lineasCoincidentes: number
  lineasConDiferencia: number
  lineasRevisionManual: number
  totalPresupuestado: number
  totalRemitido: number
  totalConsumidoValorizado: number
  deltaEconomico: number
  consumosAdicionales: number
  itemsNoConsumidos: number
  itemsDevueltos: number
  itemsNuncaRemitidos: number
  tieneItemsNoPresupuestados: boolean
  tieneItemsNoRemitidos: boolean
  tieneConsumosAdicionales: boolean
  tieneDevoluciones: boolean
  diferencias: DiferenciaComparativa[]
  lineas: LineaComparativa[]
}

// ===== LEGACY COBRO TYPE ALIAS =====
/** @deprecated Use CobroV2 instead */
export type Cobro = CobroV2
