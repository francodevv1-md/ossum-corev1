export interface DocumentItem {
  id?: string
  code?: string
  description: string
  lotNumber?: string
  serialNumber?: string
  expiryDate?: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  ivaPercent?: number
  subtotal?: number
}

export interface BoxItem {
  id: string
  code: string
  name: string
  sealNumber?: string
  type: string
  itemsCount: number
}

export interface PresupuestoDocumentData {
  number: string
  version: string
  date: string
  validUntil: string
  company: {
    name: string
    cuit: string
    address: string
    phone: string
    email: string
  }
  patient: {
    name: string
    dni?: string
    obraSocial?: string
    affiliateNumber?: string
  }
  surgery: {
    id: string
    visibleNumber?: string
    classification?: string
    date?: string
    institution?: string
    surgeon?: string
  }
  paymentTerms: string
  items: DocumentItem[]
  subtotal: number
  discountAmount?: number
  ivaAmount?: number
  total: number
  notes?: string
  canonicalDisclaimer: string
}

export interface RemitoDocumentData {
  number: string
  date: string
  surgeryDate?: string
  company: {
    name: string
    cuit: string
    address: string
    phone: string
    email: string
    cai?: string
  }
  destination: {
    institution: string
    address: string
    receiverName?: string
    receiverRole?: string
  }
  patient: {
    name: string
    dni?: string
    obraSocial?: string
  }
  surgery: {
    id: string
    visibleNumber?: string
    surgeon?: string
    classification?: string
  }
  logistics: {
    driverName?: string
    vehicle?: string
    dispatchTime?: string
    notes?: string
  }
  boxes: BoxItem[]
  items: DocumentItem[]
  observations?: string
}

export interface FacturaDocumentData {
  invoiceType: "A" | "B" | "C" | "R" | "X"
  pointOfSale: string
  number: string
  issueDate: string
  dueDate: string
  company: {
    name: string
    cuit: string
    grossIncome: string
    startOfActivities: string
    ivaCondition: string
    address: string
  }
  client: {
    name: string
    cuit: string
    ivaCondition: string
    address: string
  }
  surgeryRef?: {
    id: string
    visibleNumber?: string
    patientName: string
    surgeon?: string
    institution?: string
  }
  items: DocumentItem[]
  netSubtotal: number
  iva21: number
  iva105?: number
  otherTaxes?: number
  total: number
  paymentCondition: string
  cae?: string
  caeDueDate?: string
  barcode?: string
}

export interface OrdenCompraDocumentData {
  orderNumber: string
  date: string
  requiredDeliveryDate: string
  company: {
    name: string
    cuit: string
    address: string
    phone: string
    email: string
  }
  supplier: {
    name: string
    cuit: string
    contactPerson?: string
    phone?: string
    email?: string
    address?: string
  }
  targetDestination: {
    depositName: string
    address: string
    surgeryRef?: string
    patientName?: string
  }
  items: DocumentItem[]
  subtotal: number
  ivaAmount: number
  total: number
  paymentTerms: string
  authorizedBy: string
  notes?: string
}

export interface ConsumoDocumentData {
  consumoNumber: string
  remitoReference: string
  date: string
  surgery: {
    id: string
    visibleNumber?: string
    date?: string
    institution?: string
    surgeon?: string
    instrumentador?: string
    classification?: string
  }
  patient: {
    name: string
    dni?: string
    obraSocial?: string
    affiliateNumber?: string
  }
  consumedItems: {
    code: string
    description: string
    lotNumber: string
    remittedQuantity: number
    consumedQuantity: number
    returnedQuantity: number
  }[]
  boxesUsed: {
    code: string
    name: string
    sealReturned?: string
    status: "Completa" | "Con Faltantes" | "Solo Abierta"
  }[]
  surgeonSignatureName: string
  instrumentadorSignatureName: string
  observations?: string
}
