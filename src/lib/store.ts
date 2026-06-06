import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  Surgery, StockItem, StockMovement, Box, Remito, Presupuesto, Consumo, ConsumoItem,
  User, Comprobante, LogisticsDetail, HistoryEntry, SurgeryNote,
  SurgeryDocumentChecklist, Instrumentador, InstrumentadorSurgery,
  MaterialTransito, ExpiryItem, ClassificationConfig, TraceEntry,
  NotaCredito, NotaDebito, Proveedor, NecesidadCompra,
  OrdenCompra, MovimientoCompra, OrdenPago, FacturaCompra,
  ForecastItem, EvaluacionProveedor,
  SurgeryState, PreparationState, LogisticsState, DocumentStatus,
  FacturaVentaData, DiferenciaFactura, BaseFacturacion, PresupuestoItem,
  CobroV2, ImputacionCobro,
  Contacto, ContactRole, ContactGroup, ContactoRol,
  RemitoEstado, DestinatarioTipo, DestinatarioSnapshot, PreparacionPedidoItem,
} from "@/types"

import { mockSurgeries } from "@/data/mock-surgeries"
import { mockStock } from "@/data/mock-stock"
import { mockPresupuestos } from "@/data/mock-presupuestos"
import { mockComprobantes } from "@/data/mock-comprobantes"
import { mockRemitos } from "@/data/mock-remitos"
import { mockConsumos } from "@/data/mock-consumo"
import { mockNotes } from "@/data/mock-notes"
import { mockDocumentChecklists, mockLogisticsDetails, mockHistoryEntries } from "@/data/mock-surgery-details"
import { mockBoxes } from "@/data/mock-boxes"
import { mockStockMovements } from "@/data/mock-stock-movements"
import { mockInstrumentadores, mockInstrumentadorSurgeries } from "@/data/mock-instrumentadores"
import { mockMaterialTransito } from "@/data/mock-material-transito"
import { mockExpirations } from "@/data/mock-expirations"
import { mockClassifications } from "@/data/mock-classifications"
import { mockUsers } from "@/data/mock-users"
import { mockNotasCredito } from "@/data/mock-notas-credito"
import { mockNotasDebito } from "@/data/mock-notas-debito"
import { mockCobrosV2 } from "@/data/mock-cobros-v2"
import { mockImputaciones } from "@/data/mock-imputaciones"
import { mockProveedores } from "@/data/mock-proveedores"
import { mockNecesidadesCompra } from "@/data/mock-necesidades-compra"
import { mockOrdenesCompra } from "@/data/mock-ordenes-compra"
import { mockMovimientosCompra } from "@/data/mock-movimientos-compra"
import { mockOrdenesPago } from "@/data/mock-ordenes-pago"
import { mockFacturasCompra } from "@/data/mock-facturas-compra"
import { mockForecast } from "@/data/mock-forecast"
import { mockEvaluacionesProveedor } from "@/data/mock-evaluaciones-proveedor"
import { mockContactos } from "@/data/mock-contactos"
import { CONTACT_GROUPS } from "@/lib/contacts.constants"
import { generateId, nowDate, nowTime } from "@/lib/idGenerators"
import { normalizeAccents } from "@/lib/utils"
import { formatCurrency } from "@/lib/formatters"
import { getResumenCobranzaBySurgeryId } from "@/lib/cobros.utils"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

// ===== State Interface =====
interface OrtoTrackState {
  // Entities
  surgeries: Surgery[]
  stock: StockItem[]
  stockMovements: StockMovement[]
  boxes: Box[]
  remitos: Remito[]
  presupuestos: Presupuesto[]
  consumos: Consumo[]
  users: User[]
  comprobantes: Comprobante[]
  logisticsDetails: LogisticsDetail[]
  historyEntries: HistoryEntry[]
  notes: SurgeryNote[]
  documentChecklists: SurgeryDocumentChecklist[]
  instrumentadores: Instrumentador[]
  instrumentadorSurgeries: InstrumentadorSurgery[]
  materialTransito: MaterialTransito[]
  expirations: ExpiryItem[]
  classifications: ClassificationConfig[]
  traceEntries: TraceEntry[]
  notasCredito: NotaCredito[]
  notasDebito: NotaDebito[]
  cobrosV2: CobroV2[]
  imputaciones: ImputacionCobro[]
  proveedores: Proveedor[]
  necesidadesCompra: NecesidadCompra[]
  ordenesCompra: OrdenCompra[]
  movimientosCompra: MovimientoCompra[]
  ordenesPago: OrdenPago[]
  facturasCompra: FacturaCompra[]
  forecast: ForecastItem[]
  evaluacionesProveedor: EvaluacionProveedor[]
  contactos: Contacto[]
  contactGroups: ContactGroup[]
  currentUserId: string

  // Surgery Actions
  createSurgery: (data: Omit<Surgery, "id">) => Surgery
  updateSurgery: (id: string, data: Partial<Surgery>) => void
  authorizeSurgery: (id: string) => void
  changeSurgeryStatus: (id: string, newState: SurgeryState) => void
  changeSurgeryDate: (id: string, newDate: string, newTime?: string) => void
  suspendSurgery: (id: string, reason?: string) => void
  cancelSurgery: (id: string, reason?: string) => void
  recoverSurgery: (id: string) => void

  // Presupuesto Actions
  createBudgetForSurgery: (surgeryId: string, data: Omit<Presupuesto, "id" | "surgeryId" | "createdAt">) => Presupuesto
  createBudgetIndependent: (data: Omit<Presupuesto, "id" | "createdAt">) => Presupuesto
  linkBudgetToSurgery: (presupuestoId: string, surgeryId: string) => void
  createBudgetVersion: (parentPresupuestoId: string, data: { items: PresupuestoItem[]; vigencia: string; listaPrecios: string; observaciones?: string }) => Presupuesto
  authorizeBudget: (presupuestoId: string) => void
  enviarPresupuesto: (presupuestoId: string) => void
  rechazarPresupuesto: (presupuestoId: string) => void
  bloquearPresupuesto: (presupuestoId: string) => void

  // Order & Logistics Actions
  generateOrderFromBudget: (presupuestoId: string) => Comprobante
  generateDeliveryNoteFromOrder: (pedidoId: string, boxId: string) => Remito
  devolverRemito: (remitoId: string, items: { stockItemId: string; returnedQuantity: number }[]) => void

  // Consumption Actions
  createConsumptionFromDeliveryNote: (remitoId: string) => Consumo
  validateConsumption: (consumoId: string) => void
  updateConsumoItem: (consumoId: string, stockItemId: string, updates: Partial<Consumo["items"][0]>) => void

  // Invoice Actions
  authorizeInvoice: (surgeryId: string, facturaNumber: string, options?: {
    baseFacturacion?: BaseFacturacion
    totalPresupuestado?: number
    totalConsumidoValorizado?: number
    deltaDetectado?: number
    diferenciasAceptadas?: number
    totalAFacturar?: number
    presupuestoBaseId?: string
    presupuestoVersion?: string
    diferencias?: DiferenciaFactura[]
  }) => void
  markConsumoAsFacturado: (surgeryId: string) => void
  getSaldoPendiente: (surgeryId: string) => number

  // Documentation Actions
  updateDocumentationChecklist: (surgeryId: string, itemType: string, completed: boolean) => void

  // Notes Actions
  addSurgeryNote: (surgeryId: string, text: string, type: SurgeryNote["type"], priority: SurgeryNote["priority"], isInternal: boolean) => void

  // Logistics Actions
  changeLogisticsStatus: (surgeryId: string, field: "ida" | "vuelta", newState: LogisticsState) => void
  changePreparationState: (surgeryId: string, newState: PreparationState) => void

  // Instrumentador Actions
  createInstrumentador: (data: Omit<Instrumentador, "id">) => Instrumentador
  assignInstrumenter: (surgeryId: string, instrumentadorId: string) => void
  markInstrumenterPaid: (instrumentadorSurgeryId: string) => void
  createInstrumenterSettlement: (instrumentadorSurgeryId: string) => void

  // Classification Actions
  toggleClassificationActive: (id: string) => void

  // Comprobante Actions
  addComprobante: (data: Omit<Comprobante, "id">) => Comprobante

  // History/Audit Actions
  addAuditEvent: (surgeryId: string, action: string, details: string, previousValue?: string, newValue?: string) => void

  // ===== VENTAS ACTIONS =====
  createNotaCredito: (data: Omit<NotaCredito, "id" | "createdAt">) => NotaCredito
  createNotaDebito: (data: Omit<NotaDebito, "id" | "createdAt">) => NotaDebito
  createCobroConImputaciones: (cobroData: Omit<CobroV2, "id" | "fechaRegistro">, imputacionesData: { facturaId: string; importeImputado: number }[]) => { cobro: CobroV2; imputaciones: ImputacionCobro[] }
  addImputacionCobro: (cobroId: string, facturaId: string, importeImputado: number) => ImputacionCobro | null

  // ===== COMPRAS ACTIONS =====
  createNecesidadCompra: (data: Omit<NecesidadCompra, "id" | "createdAt">) => NecesidadCompra
  updateNecesidadCompra: (id: string, data: Partial<NecesidadCompra>) => void
  convertNecesidadToOC: (necesidadIds: string[], proveedorId: string) => OrdenCompra
  createOrdenCompra: (data: Omit<OrdenCompra, "id" | "createdAt">) => OrdenCompra
  updateOrdenCompra: (id: string, data: Partial<OrdenCompra>) => void
  createProveedor: (data: Omit<Proveedor, "id">) => Proveedor
  createOrdenPago: (data: Omit<OrdenPago, "id">) => OrdenPago
  createFacturaCompra: (data: Omit<FacturaCompra, "id">) => FacturaCompra
  createEvaluacionProveedor: (data: Omit<EvaluacionProveedor, "id">) => EvaluacionProveedor

  // ===== GETTERS =====
  getSurgeryById: (id: string) => Surgery | undefined
  getPresupuestosBySurgeryId: (surgeryId: string) => Presupuesto[]
  getComprobantesBySurgeryId: (surgeryId: string) => Comprobante[]
  getRemitosBySurgeryId: (surgeryId: string) => Remito[]
  getConsumoBySurgeryId: (surgeryId: string) => Consumo | undefined
  getNotesBySurgeryId: (surgeryId: string) => SurgeryNote[]
  getHistoryBySurgeryId: (surgeryId: string) => HistoryEntry[]
  getDocumentChecklistBySurgeryId: (surgeryId: string) => SurgeryDocumentChecklist | undefined
  getLogisticsBySurgeryId: (surgeryId: string) => LogisticsDetail | undefined
  getMaterialTransitoBySurgeryId: (surgeryId: string) => MaterialTransito[]
  getInstrumentadorSurgeryBySurgeryId: (surgeryId: string) => InstrumentadorSurgery | undefined
  getBoxBySurgeryId: (surgeryId: string) => Box | undefined
  getFacturasBySurgeryId: (surgeryId: string) => Comprobante[]
  getDocStatus: (surgeryId: string) => DocumentStatus
  getNotasCreditoBySurgeryId: (surgeryId: string) => NotaCredito[]
  getNotasDebitoBySurgeryId: (surgeryId: string) => NotaDebito[]
  getCobrosByFacturaId: (facturaId: string) => CobroV2[]
  getImputacionesByFacturaId: (facturaId: string) => ImputacionCobro[]
  getCobrosByCliente: (clienteId: string) => CobroV2[]
  getResumenCobranzaBySurgeryId: (surgeryId: string) => ResumenCobranzaSurgery
  getNecesidadesCompraBySurgeryId: (surgeryId: string) => NecesidadCompra[]
  getOrdenesCompraByProveedorId: (proveedorId: string) => OrdenCompra[]

  // ===== CONTACTOS ACTIONS (CHATZAI-020) =====
  createContacto: (data: Omit<Contacto, "id" | "createdAt" | "updatedAt">) => Contacto
  updateContacto: (id: string, data: Partial<Contacto>) => void
  inactivateContacto: (id: string) => void
  reactivateContacto: (id: string) => void
  addRoleToContacto: (id: string, role: ContactRole) => void
  addGroupToContacto: (id: string, groupId: string) => void
  removeGroupFromContacto: (id: string, groupId: string) => void
  getContactosByGroup: (groupId: string) => Contacto[]

  // ===== CONTACTOS GETTERS =====
  getContactoById: (id: string) => Contacto | undefined
  getContactoByCodigo: (codigoContacto: string) => Contacto | undefined
  getContactosByRole: (role: ContactRole) => Contacto[]
  searchContactos: (query: string, role?: ContactRole, groupIds?: string[]) => Contacto[]
  isCodigoContactoDisponible: (codigo: string) => boolean

  // ===== REMITO V2 ACTIONS (CHATZAI-022) =====
  createRemito: (data: {
    surgeryId: string
    presupuestoId?: string
    fechaEmision: string
    usuarioEmisor: string
    destinatarioTipo: DestinatarioTipo
    destinatarioContactId: string
    destinatarioSnapshot: DestinatarioSnapshot
    estado: RemitoEstado
    observaciones?: string
    items: { id: string; codigo: string; descripcion: string; cantidad: number; presupuestoItemId?: string; catalogItemId?: string; loteSerie?: string }[]
  }) => Remito
  updateRemitoItem: (remitoId: string, itemId: string, updates: Record<string, unknown>) => void
  getRemitoById: (id: string) => Remito | undefined
  emitirRemito: (remitoId: string) => void

  // ===== PREPARACION PEDIDO ACTIONS =====
  addPreparacionPedido: (surgeryId: string, text: string, items: PreparacionPedidoItem[]) => void
  confirmPreparacionPedido: (noteId: string) => void

  // ===== CONSUMO MANUAL ACTIONS =====
  createConsumoManual: (surgeryId: string, items: ConsumoItem[], justificacion: string) => Consumo
  getPresupuestoVigenteBySurgeryId: (surgeryId: string) => Presupuesto | undefined
}

// ===== Helper: Get current user =====
function getCurrentUser(state: OrtoTrackState) {
  return state.users.find((u) => u.id === state.currentUserId) || state.users[0]
}

export const useOrtoTrackStore = create<OrtoTrackState>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====
      surgeries: mockSurgeries,
      stock: mockStock,
      stockMovements: mockStockMovements,
      boxes: mockBoxes,
      remitos: mockRemitos,
      presupuestos: mockPresupuestos,
      consumos: mockConsumos,
      users: mockUsers,
      comprobantes: mockComprobantes,
      logisticsDetails: mockLogisticsDetails,
      historyEntries: mockHistoryEntries,
      notes: mockNotes,
      documentChecklists: mockDocumentChecklists,
      instrumentadores: mockInstrumentadores,
      instrumentadorSurgeries: mockInstrumentadorSurgeries,
      materialTransito: mockMaterialTransito,
      expirations: mockExpirations,
      classifications: mockClassifications,
      traceEntries: [],
      notasCredito: mockNotasCredito,
      notasDebito: mockNotasDebito,
      cobrosV2: mockCobrosV2,
      imputaciones: mockImputaciones,
      proveedores: mockProveedores,
      necesidadesCompra: mockNecesidadesCompra,
      ordenesCompra: mockOrdenesCompra,
      movimientosCompra: mockMovimientosCompra,
      ordenesPago: mockOrdenesPago,
      facturasCompra: mockFacturasCompra,
      forecast: mockForecast,
      evaluacionesProveedor: mockEvaluacionesProveedor,
      contactos: mockContactos,
      contactGroups: [], // populated from CONTACT_GROUPS constant at runtime
      currentUserId: "USR-0001",

      // ===== SURGERY ACTIONS =====
      createSurgery: (data) => {
        const surgery: Surgery = {
          ...data,
          id: generateId("CX"),
          urgente: data.urgente ?? false,
          leyendaDestacada: data.leyendaDestacada ?? false,
          referenciasAdministrativas: data.referenciasAdministrativas ?? [],
        }
        set((s) => ({ surgeries: [...s.surgeries, surgery] }))
        get().addAuditEvent(surgery.id, "Creación", "Cirugía creada")
        return surgery
      },

      updateSurgery: (id, data) => {
        const prev = get().getSurgeryById(id)
        set((s) => ({
          surgeries: s.surgeries.map((sx) => (sx.id === id ? { ...sx, ...data } : sx)),
        }))
        // Track coordinator changes in history
        if (prev && data.coordinadorCx !== undefined && data.coordinadorCx !== prev.coordinadorCx) {
          get().addAuditEvent(
            id,
            "Cambio de coordinador",
            `Coordinador de CX cambiado`,
            prev.coordinadorCx || "Sin asignar",
            data.coordinadorCx || "Sin asignar"
          )
        }
      },

      authorizeSurgery: (id) => {
        const user = getCurrentUser(get())
        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === id
              ? { ...sx, autorizado: true, fechaAutorizacion: nowDate(), usuarioAutorizacion: user.name, state: "Autorizada" as SurgeryState }
              : sx
          ),
        }))
        get().addAuditEvent(id, "Autorización", "Cirugía autorizada", "Pendiente", "Autorizada")
      },

      changeSurgeryStatus: (id, newState) => {
        const prev = get().getSurgeryById(id)
        set((s) => ({
          surgeries: s.surgeries.map((sx) => (sx.id === id ? { ...sx, state: newState } : sx)),
        }))
        get().addAuditEvent(id, "Cambio de estado", `Estado cambiado a ${newState}`, prev?.state, newState)
      },

      changeSurgeryDate: (id, newDate, newTime) => {
        const prev = get().getSurgeryById(id)
        const updates: Partial<Surgery> = { date: newDate }
        if (newTime) updates.time = newTime
        set((s) => ({
          surgeries: s.surgeries.map((sx) => (sx.id === id ? { ...sx, ...updates } : sx)),
        }))
        get().addAuditEvent(id, "Cambio de fecha", `Fecha cambiada a ${newDate}`, prev?.date, newDate)
      },

      suspendSurgery: (id, reason) => {
        const prev = get().getSurgeryById(id)
        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === id ? { ...sx, state: "Suspendida" as SurgeryState, notes: reason ? `${sx.notes ? sx.notes + "\n" : ""}SUSPENDIDA: ${reason}` : sx.notes } : sx
          ),
        }))
        get().addAuditEvent(id, "Suspensión", reason || "Cirugía suspendida", prev?.state, "Suspendida")
      },

      cancelSurgery: (id, reason) => {
        const prev = get().getSurgeryById(id)
        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === id ? { ...sx, state: "Cancelada" as SurgeryState, notes: reason ? `${sx.notes ? sx.notes + "\n" : ""}CANCELADA: ${reason}` : sx.notes } : sx
          ),
        }))
        get().addAuditEvent(id, "Cancelación", reason || "Cirugía cancelada", prev?.state, "Cancelada")
      },

      recoverSurgery: (id) => {
        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === id ? { ...sx, state: "Pendiente" as SurgeryState } : sx
          ),
        }))
        get().addAuditEvent(id, "Recuperación", "Cirugía recuperada", "Suspendida/Cancelada", "Pendiente")
      },

      // ===== PRESUPUESTO ACTIONS =====
      createBudgetForSurgery: (surgeryId, data) => {
        const presupuesto: Presupuesto = { ...data, id: generateId("PR"), surgeryId, createdAt: nowDate() }
        set((s) => ({
          presupuestos: [...s.presupuestos, presupuesto],
          surgeries: s.surgeries.map((sx) => (sx.id === surgeryId ? { ...sx, presupuestoId: presupuesto.id } : sx)),
        }))
        get().addAuditEvent(surgeryId, "Presupuesto creado", `Presupuesto ${presupuesto.id} creado`)
        return presupuesto
      },

      createBudgetIndependent: (data) => {
        const presupuesto: Presupuesto = { ...data, id: generateId("PR"), createdAt: nowDate() }
        set((s) => ({ presupuestos: [...s.presupuestos, presupuesto] }))
        return presupuesto
      },

      linkBudgetToSurgery: (presupuestoId, surgeryId) => {
        set((s) => ({
          presupuestos: s.presupuestos.map((p) =>
            p.id === presupuestoId ? { ...p, surgeryId } : p
          ),
          surgeries: s.surgeries.map((sx) =>
            sx.id === surgeryId && !sx.presupuestoId ? { ...sx, presupuestoId } : sx
          ),
        }))
        get().addAuditEvent(surgeryId, "Presupuesto vinculado", `Presupuesto ${presupuestoId} vinculado a cirugía`)
      },

      createBudgetVersion: (parentPresupuestoId, data) => {
        const parent = get().presupuestos.find((p) => p.id === parentPresupuestoId)
        if (!parent) throw new Error("Presupuesto padre no encontrado")
        const newSubtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0)
        const discountAmount = parent.descuento ? newSubtotal * (parent.descuento / 100) : 0
        const newVersion: Presupuesto = {
          ...parent,
          id: generateId("PR"),
          createdAt: nowDate(),
          version: parent.version + 1,
          versionStatus: "vigente",
          parentPresupuestoId,
          state: "Borrador",
          approvedAt: undefined,
          ...data,
          subtotal: newSubtotal,
          total: newSubtotal - discountAmount,
        }
        // Mark parent as reemplazada
        set((s) => ({
          presupuestos: [
            ...s.presupuestos.map((p) => p.id === parentPresupuestoId ? { ...p, versionStatus: "reemplazada" as const } : p),
            newVersion,
          ],
          surgeries: parent.surgeryId ? s.surgeries.map((sx) => sx.id === parent.surgeryId ? { ...sx, presupuestoId: newVersion.id } : sx) : s.surgeries,
        }))
        if (parent.surgeryId) {
          get().addAuditEvent(parent.surgeryId, "Nueva versión PR", `Versión ${newVersion.version} del presupuesto creada`)
        }
        return newVersion
      },

      authorizeBudget: (presupuestoId) => {
        set((s) => ({
          presupuestos: s.presupuestos.map((p) =>
            p.id === presupuestoId ? { ...p, state: "Aprobado" as const, approvedAt: nowDate() } : p
          ),
        }))
        const presupuesto = get().presupuestos.find((p) => p.id === presupuestoId)
        if (presupuesto?.surgeryId) {
          get().addAuditEvent(presupuesto.surgeryId, "Presupuesto aprobado", `Presupuesto ${presupuestoId} aprobado`, "Enviado", "Aprobado")
        }
      },

      enviarPresupuesto: (presupuestoId) => {
        set((s) => ({
          presupuestos: s.presupuestos.map((p) =>
            p.id === presupuestoId ? { ...p, state: "Enviado" as const } : p
          ),
        }))
        const presupuesto = get().presupuestos.find((p) => p.id === presupuestoId)
        if (presupuesto?.surgeryId) {
          get().addAuditEvent(presupuesto.surgeryId, "Presupuesto enviado", `Presupuesto ${presupuestoId} enviado`, "Borrador", "Enviado")
        }
      },

      rechazarPresupuesto: (presupuestoId) => {
        set((s) => ({
          presupuestos: s.presupuestos.map((p) =>
            p.id === presupuestoId ? { ...p, state: "Rechazado" as const } : p
          ),
        }))
        const presupuesto = get().presupuestos.find((p) => p.id === presupuestoId)
        if (presupuesto?.surgeryId) {
          get().addAuditEvent(presupuesto.surgeryId, "Presupuesto rechazado", `Presupuesto ${presupuestoId} rechazado`, "Enviado", "Rechazado")
        }
      },

      bloquearPresupuesto: (presupuestoId) => {
        set((s) => ({
          presupuestos: s.presupuestos.map((p) =>
            p.id === presupuestoId ? { ...p, bloqueado: !p.bloqueado } : p
          ),
        }))
      },

      // ===== ORDER & LOGISTICS ACTIONS =====
      generateOrderFromBudget: (presupuestoId) => {
        const presupuesto = get().presupuestos.find((p) => p.id === presupuestoId)
        if (!presupuesto) throw new Error("Presupuesto no encontrado")
        const comprobante: Comprobante = {
          id: generateId("COMP"),
          surgeryId: presupuesto.surgeryId || "",
          type: "PE",
          number: `PE-${generateId("2026")}`,
          date: nowDate(),
          client: presupuesto.client,
          amount: presupuesto.total,
          toCollect: presupuesto.total,
          concept: `Pedido materiales - ${presupuesto.patient || presupuesto.concepto || presupuesto.client}`,
          state: "Emitida",
        }
        set((s) => ({ comprobantes: [...s.comprobantes, comprobante] }))
        if (presupuesto.surgeryId) {
          get().addAuditEvent(presupuesto.surgeryId, "Pedido generado", `Pedido ${comprobante.number} generado desde presupuesto ${presupuestoId}`)
        }
        return comprobante
      },

      generateDeliveryNoteFromOrder: (pedidoId, boxId) => {
        const pedido = get().comprobantes.find((c) => c.id === pedidoId)
        const box = get().boxes.find((b) => b.id === boxId)
        if (!pedido) throw new Error("Pedido no encontrado")
        const remito: Remito = {
          id: generateId("NR"),
          surgeryId: pedido.surgeryId,
          boxId,
          destination: "",
          date: nowDate(),
          state: "Enviado",
          items: box
            ? box.contents.map((c) => ({
                stockItemId: c.stockItemId,
                name: c.name,
                code: c.code,
                sentQuantity: c.quantity,
                returnedQuantity: 0,
                consumedQuantity: 0,
              }))
            : [],
        }
        set((s) => ({
          remitos: [...s.remitos, remito],
          surgeries: s.surgeries.map((sx) =>
            sx.id === pedido.surgeryId ? { ...sx, remitoId: remito.id, state: "En tránsito" as SurgeryState } : sx
          ),
        }))
        get().addAuditEvent(pedido.surgeryId, "Remito generado", `Remito ${remito.id} generado`)
        return remito
      },

      devolverRemito: (remitoId, items) => {
        set((s) => ({
          remitos: s.remitos.map((r) =>
            r.id === remitoId
              ? {
                  ...r,
                  state: "Devuelto" as LogisticsState,
                  items: r.items.map((ri) => {
                    const ret = items.find((i) => i.stockItemId === ri.stockItemId)
                    return ret ? { ...ri, returnedQuantity: ret.returnedQuantity } : ri
                  }),
                }
              : r
          ),
        }))
      },

      // ===== CONSUMPTION ACTIONS =====
      createConsumptionFromDeliveryNote: (remitoId) => {
        const remito = get().remitos.find((r) => r.id === remitoId)
        if (!remito) throw new Error("Remito no encontrado")
        const user = getCurrentUser(get())
        const consumo: Consumo = {
          id: generateId("CON"),
          surgeryId: remito.surgeryId,
          boxId: remito.boxId,
          items: remito.items.map((ri) => ({
            stockItemId: ri.stockItemId,
            name: ri.name,
            code: ri.code,
            lot: "",
            department: "",
            rubro: "",
            brand: "",
            consumed: ri.consumedQuantity,
            returned: ri.returnedQuantity,
          })),
          validatedBy: user.name,
          state: "Pendiente",
        }
        set((s) => ({ consumos: [...s.consumos, consumo] }))
        get().addAuditEvent(remito.surgeryId, "Consumo cargado", `Consumo ${consumo.id} cargado desde remito ${remitoId}`)
        return consumo
      },

      validateConsumption: (consumoId) => {
        const user = getCurrentUser(get())
        set((s) => ({
          consumos: s.consumos.map((c) =>
            c.id === consumoId ? { ...c, state: "Validado" as const, validatedBy: user.name, validatedAt: nowDate() } : c
          ),
        }))
        const consumo = get().consumos.find((c) => c.id === consumoId)
        if (consumo) {
          get().addAuditEvent(consumo.surgeryId, "Consumo validado", `Consumo ${consumoId} validado por ${user.name}`)
        }
      },

      updateConsumoItem: (consumoId, stockItemId, updates) => {
        set((s) => ({
          consumos: s.consumos.map((c) =>
            c.id === consumoId
              ? { ...c, items: c.items.map((ci) => (ci.stockItemId === stockItemId ? { ...ci, ...updates } : ci)) }
              : c
          ),
        }))
      },

      // ===== INVOICE ACTIONS (CHATZAI-010: DF-Fact-10) =====
      authorizeInvoice: (surgeryId, facturaNumber, options) => {
        const user = getCurrentUser(get())

        // DF-Fact-10: Calcular monto real si hay options
        const hasOptions = options && options.totalAFacturar !== undefined && options.totalAFacturar > 0
        const amount = hasOptions ? options.totalAFacturar! : 0
        const toCollect = amount // Al emitir, toCollect = amount (sin cobros aún)

        if (!hasOptions) {
          console.warn(
            `[CHATZAI-010] authorizeInvoice llamado sin options para ${surgeryId}. ` +
            `Monto será 0. Use el diálogo de facturación con selector de base.`
          )
        }

        // DF-Fact-08: Snapshot del presupuesto
        const facturaData: FacturaVentaData | undefined = hasOptions ? {
          baseFacturacion: options!.baseFacturacion || "presupuesto",
          presupuestoBaseId: options!.presupuestoBaseId || "",
          totalPresupuestado: options!.totalPresupuestado || 0,
          totalConsumidoValorizado: options!.totalConsumidoValorizado || 0,
          deltaDetectado: options!.deltaDetectado || 0,
          diferenciasAceptadas: options!.diferenciasAceptadas || 0,
          totalAFacturar: options!.totalAFacturar!,
          presupuestoVersion: options!.presupuestoVersion,
          presupuestoFechaSnapshot: nowDate(),
          diferencias: options!.diferencias,
        } : undefined

        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === surgeryId
              ? { ...sx, facturado: true, fechaFactura: nowDate(), facturaNumber, state: "Finalizada" as SurgeryState }
              : sx
          ),
        }))

        const surgery = get().getSurgeryById(surgeryId)
        const comprobante: Comprobante = {
          id: generateId("COMP"),
          surgeryId,
          type: "FV",
          number: facturaNumber,
          date: nowDate(),
          client: surgery?.client || "",
          amount,
          toCollect,
          concept: `Factura ${facturaNumber}`,
          state: "Emitida",
          facturaData,
        }
        set((s) => ({ comprobantes: [...s.comprobantes, comprobante] }))

        // DF-Fact-07: Marcar consumo como Facturado si está Validado
        get().markConsumoAsFacturado(surgeryId)

        get().addAuditEvent(surgeryId, "Facturación", `Factura ${facturaNumber} emitida por ${user.name} — ${formatCurrency(amount)}`, "Realizada", "Finalizada")
      },

      // CHATZAI-010: Marcar consumo como Facturado (DF-Fact-07)
      markConsumoAsFacturado: (surgeryId) => {
        set((s) => ({
          consumos: s.consumos.map((c) =>
            c.surgeryId === surgeryId && c.state === "Validado"
              ? { ...c, state: "Facturado" as const }
              : c
          ),
        }))
      },

      // CHATZAI-010: Saldo pendiente dinámico (DF-Fact-09) — now uses imputaciones-based V2
      getSaldoPendiente: (surgeryId) => {
        const fv = get().comprobantes.find((c) => c.surgeryId === surgeryId && c.type === "FV")
        if (!fv) return 0
        // Use imputaciones-based calculation (V2)
        const cobrado = get().imputaciones
          .filter((imp) => imp.facturaId === fv.number)
          .reduce((sum, imp) => sum + imp.importeImputado, 0)
        return Math.max(0, fv.amount - cobrado)
      },

      // ===== DOCUMENTATION ACTIONS =====
      updateDocumentationChecklist: (surgeryId, itemType, completed) => {
        const user = getCurrentUser(get())
        set((s) => ({
          documentChecklists: s.documentChecklists.map((dc) =>
            dc.surgeryId === surgeryId
              ? {
                  ...dc,
                  items: dc.items.map((item) =>
                    item.type === itemType ? { ...item, completed, uploadedAt: completed ? nowDate() : undefined, uploadedBy: completed ? user.name : undefined } : item
                  ),
                }
              : dc
          ),
        }))
        // Update overall doc status
        const checklist = get().documentChecklists.find((dc) => dc.surgeryId === surgeryId)
        if (checklist) {
          const completedCount = checklist.items.filter((i) => i.completed).length
          const totalCount = checklist.items.length
          let newStatus: DocumentStatus = "Incompleta"
          if (completedCount === totalCount) newStatus = "Apta para facturar"
          else if (completedCount > 0) newStatus = "Completa"

          set((s) => ({
            documentChecklists: s.documentChecklists.map((dc) =>
              dc.surgeryId === surgeryId ? { ...dc, status: newStatus } : dc
            ),
          }))
        }
      },

      // ===== NOTES ACTIONS =====
      addSurgeryNote: (surgeryId, text, type, priority, isInternal) => {
        const user = getCurrentUser(get())
        const note: SurgeryNote = {
          id: generateId("NOT"),
          surgeryId,
          date: nowDate(),
          time: nowTime(),
          userId: user.id,
          userName: user.name,
          text,
          type,
          priority,
          isInternal,
        }
        set((s) => ({ notes: [...s.notes, note] }))
      },

      // ===== LOGISTICS ACTIONS =====
      changeLogisticsStatus: (surgeryId, field, newState) => {
        set((s) => ({
          logisticsDetails: s.logisticsDetails.map((ld) =>
            ld.surgeryId === surgeryId ? { ...ld, [field]: newState } : ld
          ),
        }))
        get().addAuditEvent(surgeryId, "Cambio logística", `${field} cambiado a ${newState}`)
      },

      changePreparationState: (surgeryId, newState) => {
        const prev = get().getSurgeryById(surgeryId)
        set((s) => ({
          surgeries: s.surgeries.map((sx) => (sx.id === surgeryId ? { ...sx, preparationState: newState } : sx)),
          logisticsDetails: s.logisticsDetails.map((ld) =>
            ld.surgeryId === surgeryId ? { ...ld, preparation: newState } : ld
          ),
        }))
        get().addAuditEvent(surgeryId, "Cambio de preparación", `Preparación cambiada a ${newState}`, prev?.preparationState, newState)
      },

      // ===== INSTRUMENTADOR ACTIONS =====
      createInstrumentador: (data) => {
        const instrumentador: Instrumentador = { ...data, id: generateId("INST") }
        set((s) => ({ instrumentadores: [...s.instrumentadores, instrumentador] }))
        return instrumentador
      },

      assignInstrumenter: (surgeryId, instrumentadorId) => {
        const instrumentador = get().instrumentadores.find((i) => i.id === instrumentadorId)
        if (!instrumentador) return
        const surgery = get().getSurgeryById(surgeryId)
        if (!surgery) return

        set((s) => ({
          surgeries: s.surgeries.map((sx) =>
            sx.id === surgeryId ? { ...sx, instrumentador: instrumentador.name } : sx
          ),
        }))

        const instSurgery: InstrumentadorSurgery = {
          id: generateId("INS-CX"),
          instrumentadorId,
          instrumentadorName: instrumentador.name,
          surgeryId,
          patient: surgery.patient,
          surgeon: surgery.surgeon,
          institution: surgery.institution,
          date: surgery.date,
          classification: surgery.classification,
          state: "Pendiente",
          price: 0,
          pagada: false,
          documentacionCompleta: false,
          autorizacionOK: false,
        }
        set((s) => ({ instrumentadorSurgeries: [...s.instrumentadorSurgeries, instSurgery] }))
        get().addAuditEvent(surgeryId, "Instrumentador asignado", `${instrumentador.name} asignado a cirugía`)
      },

      markInstrumenterPaid: (instrumentadorSurgeryId) => {
        set((s) => ({
          instrumentadorSurgeries: s.instrumentadorSurgeries.map((is) =>
            is.id === instrumentadorSurgeryId ? { ...is, pagada: true, state: "Pagada" as const } : is
          ),
        }))
      },

      createInstrumenterSettlement: (instrumentadorSurgeryId) => {
        set((s) => ({
          instrumentadorSurgeries: s.instrumentadorSurgeries.map((is) =>
            is.id === instrumentadorSurgeryId ? { ...is, state: "Facturada" as const } : is
          ),
        }))
      },

      // ===== CLASSIFICATION ACTIONS =====
      toggleClassificationActive: (id) => {
        set((s) => ({
          classifications: s.classifications.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
        }))
      },

      // ===== COMPROBANTE ACTIONS =====
      addComprobante: (data) => {
        const comprobante: Comprobante = { ...data, id: generateId("COMP") }
        set((s) => ({ comprobantes: [...s.comprobantes, comprobante] }))
        return comprobante
      },

      // ===== HISTORY/AUDIT ACTIONS =====
      addAuditEvent: (surgeryId, action, details, previousValue?, newValue?) => {
        const user = getCurrentUser(get())
        const entry: HistoryEntry = {
          id: generateId("HIS"),
          surgeryId,
          date: nowDate(),
          time: nowTime(),
          userId: user.id,
          userName: user.name,
          action,
          details,
          previousValue,
          newValue,
        }
        set((s) => ({ historyEntries: [...s.historyEntries, entry] }))
      },

      // ===== VENTAS ACTIONS =====
      createNotaCredito: (data) => {
        const nc: NotaCredito = { ...data, id: generateId("NC"), createdAt: nowDate() }
        set((s) => ({ notasCredito: [...s.notasCredito, nc] }))
        if (data.surgeryId) {
          get().addAuditEvent(data.surgeryId, "Nota de crédito creada", `NC ${nc.id} creada por ${data.motivo}`)
        }
        return nc
      },

      createNotaDebito: (data) => {
        const nd: NotaDebito = { ...data, id: generateId("ND"), createdAt: nowDate() }
        set((s) => ({ notasDebito: [...s.notasDebito, nd] }))
        if (data.surgeryId) {
          get().addAuditEvent(data.surgeryId, "Nota de débito creada", `ND ${nd.id} creada por ${data.motivo}`)
        }
        return nd
      },

      createCobroConImputaciones: (cobroData, imputacionesData) => {
        const cobro: CobroV2 = {
          ...cobroData,
          id: generateId("COB"),
          fechaRegistro: new Date().toISOString(),
        }
        const newImputaciones: ImputacionCobro[] = imputacionesData.map((imp) => ({
          id: generateId("IMP"),
          cobroId: cobro.id,
          facturaId: imp.facturaId,
          importeImputado: imp.importeImputado,
          fechaImputacion: new Date().toISOString(),
        }))
        set((s) => ({
          cobrosV2: [...s.cobrosV2, cobro],
          imputaciones: [...s.imputaciones, ...newImputaciones],
        }))
        return { cobro, imputaciones: newImputaciones }
      },

      addImputacionCobro: (cobroId, facturaId, importeImputado) => {
        const cobro = get().cobrosV2.find((c) => c.id === cobroId)
        if (!cobro) return null
        const imputado = get().imputaciones
          .filter((imp) => imp.cobroId === cobroId)
          .reduce((sum, imp) => sum + imp.importeImputado, 0)
        if (importeImputado > cobro.importe - imputado) return null

        const imputacion: ImputacionCobro = {
          id: generateId("IMP"),
          cobroId,
          facturaId,
          importeImputado,
          fechaImputacion: new Date().toISOString(),
        }
        set((s) => ({
          imputaciones: [...s.imputaciones, imputacion],
        }))
        return imputacion
      },

      // ===== COMPRAS ACTIONS =====
      createNecesidadCompra: (data) => {
        const necesidad: NecesidadCompra = { ...data, id: generateId("NEC"), createdAt: nowDate() }
        set((s) => ({ necesidadesCompra: [...s.necesidadesCompra, necesidad] }))
        return necesidad
      },

      updateNecesidadCompra: (id, data) => {
        set((s) => ({
          necesidadesCompra: s.necesidadesCompra.map((n) => (n.id === id ? { ...n, ...data } : n)),
        }))
      },

      convertNecesidadToOC: (necesidadIds, proveedorId) => {
        const necesidades = get().necesidadesCompra.filter((n) => necesidadIds.includes(n.id))
        const proveedor = get().proveedores.find((p) => p.id === proveedorId)
        if (!proveedor) throw new Error("Proveedor no encontrado")

        const items = necesidades.map((n) => ({
          stockItemId: n.stockItemId || generateId("STK-Z"),
          name: n.articleName,
          code: n.articleCode,
          quantity: n.cantidad,
          unitPrice: 0,
          subtotal: 0,
          received: 0,
          isArticuloZ: n.isArticuloZ,
          descripcionLibre: n.descripcionLibre,
        }))

        const oc: OrdenCompra = {
          id: generateId("OC"),
          proveedorId,
          proveedorName: proveedor.name,
          items,
          total: 0,
          state: "Borrador",
          createdAt: nowDate(),
          necesidadCompraIds: necesidadIds,
        }

        set((s) => ({
          ordenesCompra: [...s.ordenesCompra, oc],
          necesidadesCompra: s.necesidadesCompra.map((n) =>
            necesidadIds.includes(n.id) ? { ...n, state: "En OC" as const, ordenCompraId: oc.id } : n
          ),
        }))
        return oc
      },

      createOrdenCompra: (data) => {
        const oc: OrdenCompra = { ...data, id: generateId("OC"), createdAt: nowDate() }
        set((s) => ({ ordenesCompra: [...s.ordenesCompra, oc] }))
        return oc
      },

      updateOrdenCompra: (id, data) => {
        set((s) => ({
          ordenesCompra: s.ordenesCompra.map((oc) => (oc.id === id ? { ...oc, ...data } : oc)),
        }))
      },

      createProveedor: (data) => {
        const proveedor: Proveedor = { ...data, id: generateId("PROV") }
        set((s) => ({ proveedores: [...s.proveedores, proveedor] }))
        return proveedor
      },

      createOrdenPago: (data) => {
        const op: OrdenPago = { ...data, id: generateId("OP") }
        set((s) => ({ ordenesPago: [...s.ordenesPago, op] }))
        return op
      },

      createFacturaCompra: (data) => {
        const fc: FacturaCompra = { ...data, id: generateId("FC") }
        set((s) => ({ facturasCompra: [...s.facturasCompra, fc] }))
        return fc
      },

      createEvaluacionProveedor: (data) => {
        const ev: EvaluacionProveedor = { ...data, id: generateId("EVA") }
        set((s) => ({ evaluacionesProveedor: [...s.evaluacionesProveedor, ev] }))
        return ev
      },

      // ===== GETTERS =====
      getSurgeryById: (id) => get().surgeries.find((s) => s.id === id),

      getPresupuestosBySurgeryId: (surgeryId) => get().presupuestos.filter((p) => p.surgeryId === surgeryId),

      getComprobantesBySurgeryId: (surgeryId) => get().comprobantes.filter((c) => c.surgeryId === surgeryId),

      getRemitosBySurgeryId: (surgeryId) => get().remitos.filter((r) => r.surgeryId === surgeryId),

      getConsumoBySurgeryId: (surgeryId) => get().consumos.find((c) => c.surgeryId === surgeryId),

      getNotesBySurgeryId: (surgeryId) => get().notes.filter((n) => n.surgeryId === surgeryId),

      getHistoryBySurgeryId: (surgeryId) => get().historyEntries.filter((h) => h.surgeryId === surgeryId),

      getDocumentChecklistBySurgeryId: (surgeryId) => get().documentChecklists.find((dc) => dc.surgeryId === surgeryId),

      getLogisticsBySurgeryId: (surgeryId) => get().logisticsDetails.find((ld) => ld.surgeryId === surgeryId),

      getMaterialTransitoBySurgeryId: (surgeryId) => get().materialTransito.filter((m) => m.surgeryId === surgeryId),

      getInstrumentadorSurgeryBySurgeryId: (surgeryId) => get().instrumentadorSurgeries.find((is) => is.surgeryId === surgeryId),

      getBoxBySurgeryId: (surgeryId) => get().boxes.find((b) => b.surgeryId === surgeryId),

      getFacturasBySurgeryId: (surgeryId) => get().comprobantes.filter((c) => c.surgeryId === surgeryId && c.type === "FV"),

      getDocStatus: (surgeryId) => {
        const checklist = get().documentChecklists.find((dc) => dc.surgeryId === surgeryId)
        return checklist?.status || "Incompleta"
      },

      getNotasCreditoBySurgeryId: (surgeryId) => get().notasCredito.filter((nc) => nc.surgeryId === surgeryId),

      getNotasDebitoBySurgeryId: (surgeryId) => get().notasDebito.filter((nd) => nd.surgeryId === surgeryId),

      getCobrosByFacturaId: (facturaId) => {
        const cobroIds = get().imputaciones
          .filter((imp) => imp.facturaId === facturaId)
          .map((imp) => imp.cobroId)
        const uniqueCobroIds = [...new Set(cobroIds)]
        return get().cobrosV2.filter((c) => uniqueCobroIds.includes(c.id))
      },

      getImputacionesByFacturaId: (facturaId) => {
        return get().imputaciones.filter((imp) => imp.facturaId === facturaId)
      },

      getCobrosByCliente: (clienteId) => {
        return get().cobrosV2.filter((c) => c.clienteId === clienteId)
      },

      getResumenCobranzaBySurgeryId: (surgeryId) => {
        return getResumenCobranzaBySurgeryId(
          surgeryId,
          get().comprobantes,
          get().cobrosV2,
          get().imputaciones,
        )
      },

      getNecesidadesCompraBySurgeryId: (surgeryId) => get().necesidadesCompra.filter((n) => n.surgeryId === surgeryId),

      getOrdenesCompraByProveedorId: (proveedorId) => get().ordenesCompra.filter((oc) => oc.proveedorId === proveedorId),

      // ===== CONTACTOS ACTIONS (CHATZAI-020) =====
      createContacto: (data) => {
        const now = nowDate()
        const contacto: Contacto = {
          ...data,
          id: generateId("CONT"),
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ contactos: [...s.contactos, contacto] }))
        return contacto
      },

      updateContacto: (id, data) => {
        set((s) => ({
          contactos: s.contactos.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: nowDate() } : c
          ),
        }))
      },

      inactivateContacto: (id) => {
        set((s) => ({
          contactos: s.contactos.map((c) =>
            c.id === id ? { ...c, estado: "inactivo" as const, updatedAt: nowDate() } : c
          ),
        }))
      },

      reactivateContacto: (id) => {
        set((s) => ({
          contactos: s.contactos.map((c) =>
            c.id === id ? { ...c, estado: "activo" as const, updatedAt: nowDate() } : c
          ),
        }))
      },

      addRoleToContacto: (id, role) => {
        set((s) => ({
          contactos: s.contactos.map((c) => {
            if (c.id !== id) return c
            if (c.roles.includes(role)) return c
            // CHATZAI-025A.1: Initialize role-specific defaults when adding a V2 role
            const updated: Contacto = { ...c, roles: [...c.roles, role], updatedAt: nowDate() }
            if (role === "cliente" && !updated.datosClientePagador) {
              updated.datosClientePagador = {
                esPagador: true,
                condicionIva: "Consumidor Final",
              }
            }
            return updated
          }),
        }))
      },

      addGroupToContacto: (id, groupId) => {
        set((s) => ({
          contactos: s.contactos.map((c) => {
            if (c.id !== id) return c
            if (c.groups.includes(groupId)) return c
            // Ensure the contact has the role required by this group
            const group = CONTACT_GROUPS.find((g) => g.id === groupId)
            const updated: Contacto = { ...c, groups: [...c.groups, groupId], updatedAt: nowDate() }
            if (group && !updated.roles.includes(group.role)) {
              updated.roles = [...updated.roles, group.role]
              // Initialize role-specific defaults
              if (group.role === "cliente" && !updated.datosClientePagador) {
                updated.datosClientePagador = { esPagador: true, condicionIva: "Consumidor Final" }
              }
            }
            // Initialize group-specific defaults
            if (groupId === "medicos" && !updated.datosMedico) {
              updated.datosMedico = {}
            }
            if (groupId === "instituciones" && !updated.datosInstitucion) {
              updated.datosInstitucion = {}
            }
            return updated
          }),
        }))
      },

      removeGroupFromContacto: (id, groupId) => {
        set((s) => ({
          contactos: s.contactos.map((c) => {
            if (c.id !== id) return c
            return { ...c, groups: c.groups.filter((g) => g !== groupId), updatedAt: nowDate() }
          }),
        }))
      },

      getContactosByGroup: (groupId) => {
        return get().contactos.filter((c) => c.groups.includes(groupId) && c.estado === "activo")
      },

      // ===== CONTACTOS GETTERS =====
      getContactoById: (id) => get().contactos.find((c) => c.id === id),

      getContactoByCodigo: (codigoContacto) => get().contactos.find((c) => c.codigoContacto === codigoContacto && c.estado === "activo"),

      getContactosByRole: (role) => get().contactos.filter((c) => c.roles.includes(role) && c.estado === "activo"),

      searchContactos: (query, role, groupIds) => {
        const q = normalizeAccents(query.trim())
        if (!q) {
          let result = get().contactos.filter((c) => c.estado === "activo")
          if (role) result = result.filter((c) => c.roles.includes(role))
          if (groupIds && groupIds.length > 0) result = result.filter((c) => c.groups.some((g) => groupIds.includes(g)))
          return result
        }
        return get().contactos.filter((c) => {
          if (role && !c.roles.includes(role)) return false
          if (groupIds && groupIds.length > 0 && !c.groups.some((g) => groupIds.includes(g))) return false
          if (c.estado !== "activo") return false
          return (
            normalizeAccents(c.codigoContacto).includes(q) ||
            normalizeAccents(c.nombre).includes(q) ||
            (c.cuit && normalizeAccents(c.cuit).includes(q)) ||
            (c.dni && normalizeAccents(c.dni).includes(q)) ||
            (c.nombreFantasia && normalizeAccents(c.nombreFantasia).includes(q)) ||
            (c.razonSocial && normalizeAccents(c.razonSocial).includes(q))
          )
        })
      },

      isCodigoContactoDisponible: (codigo) => {
        return !get().contactos.some((c) => c.codigoContacto === codigo)
      },

      // ===== REMITO V2 ACTIONS (CHATZAI-022) =====
      createRemito: (data) => {
        const remito: Remito = {
          id: generateId("NR"),
          surgeryId: data.surgeryId,
          boxId: "",
          destination: data.destinatarioSnapshot.nombre,
          date: data.fechaEmision || nowDate(),
          state: data.estado === "emitido" ? "Enviado" : (data.estado as LogisticsState),
          items: data.items.map((item) => ({
            stockItemId: item.presupuestoItemId || item.catalogItemId || item.id,
            name: item.descripcion,
            code: item.codigo,
            sentQuantity: item.cantidad,
            returnedQuantity: 0,
            consumedQuantity: 0,
          })),
        }
        set((s) => ({ remitos: [...s.remitos, remito] }))
        get().addAuditEvent(data.surgeryId, "Remito creado", `Remito ${remito.id} creado`)
        return remito
      },

      updateRemitoItem: (remitoId, itemId, updates) => {
        set((s) => ({
          remitos: s.remitos.map((r) =>
            r.id === remitoId
              ? { ...r, items: r.items.map((ri) => ri.stockItemId === itemId ? { ...ri, ...updates } : ri) }
              : r
          ),
        }))
      },

      getRemitoById: (id) => get().remitos.find((r) => r.id === id),

      emitirRemito: (remitoId) => {
        const user = getCurrentUser(get())
        set((s) => ({
          remitos: s.remitos.map((r) =>
            r.id === remitoId ? { ...r, state: "Enviado" as LogisticsState, date: r.date || nowDate() } : r
          ),
        }))
        const remito = get().remitos.find((r) => r.id === remitoId)
        if (remito) {
          get().addAuditEvent(remito.surgeryId, "Remito emitido", `Remito ${remitoId} emitido por ${user.name}`)
        }
      },

      // ===== PREPARACION PEDIDO ACTIONS =====
      addPreparacionPedido: (surgeryId, text, items) => {
        const user = getCurrentUser(get())
        const note: SurgeryNote = {
          id: generateId("NOT"),
          surgeryId,
          date: nowDate(),
          time: nowTime(),
          userId: user.id,
          userName: user.name,
          text,
          type: "preparacion_pedido",
          priority: "Media",
          isInternal: false,
          preparacionItems: items,
          preparacionEstado: "pendiente",
        }
        set((s) => ({ notes: [...s.notes, note] }))
      },

      confirmPreparacionPedido: (noteId) => {
        const user = getCurrentUser(get())
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, preparacionEstado: "confirmado_por_deposito" as const, confirmadoPor: user.name, fechaConfirmacion: nowDate() }
              : n
          ),
        }))
      },

      // ===== CONSUMO MANUAL ACTIONS =====
      createConsumoManual: (surgeryId, items, justificacion) => {
        const user = getCurrentUser(get())
        const consumo: Consumo = {
          id: generateId("CON"),
          surgeryId,
          boxId: "",
          items,
          validatedBy: user.name,
          state: "Pendiente",
          origen: "manual",
          justificacion,
        }
        set((s) => ({ consumos: [...s.consumos, consumo] }))
        get().addAuditEvent(surgeryId, "Consumo manual", `Consumo manual ${consumo.id} creado`)
        return consumo
      },

      getPresupuestoVigenteBySurgeryId: (surgeryId) => {
        const ppts = get().presupuestos.filter((p) => p.surgeryId === surgeryId)
        // Return the vigente one, or the latest one
        const vigente = ppts.find((p) => p.versionStatus === "vigente" && p.state !== "Rechazado")
        if (vigente) return vigente
        // Fallback: return the most recent non-rechazado presupuesto
        const nonRechazado = ppts.filter((p) => p.state !== "Rechazado")
        return nonRechazado.length > 0 ? nonRechazado[nonRechazado.length - 1] : undefined
      },
    }),
    {
      name: "ortotrack-v2-storage",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR-safe: return no-op storage on the server
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      skipHydration: true, // Hydrate manually on client to avoid SSR mismatch
    }
  )
)
