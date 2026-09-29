"use client"

import React, { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  ClipboardCheck,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"
import type { Surgery } from "@/types"
import { PresupuestoPDF } from "./documents/PresupuestoPDF"
import { RemitoPDF } from "./documents/RemitoPDF"
import { FacturaPDF } from "./documents/FacturaPDF"
import { OrdenCompraPDF } from "./documents/OrdenCompraPDF"
import { ConsumoQuirurgicoPDF } from "./documents/ConsumoQuirurgicoPDF"
import type {
  PresupuestoDocumentData,
  RemitoDocumentData,
  FacturaDocumentData,
  OrdenCompraDocumentData,
  ConsumoDocumentData,
} from "./documents/types"

export type DocumentType = "presupuesto" | "remito" | "factura" | "orden-compra" | "consumo"

interface DocumentViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery?: Surgery | null
  initialDocType?: DocumentType
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  surgery,
  initialDocType = "presupuesto",
}: DocumentViewerDialogProps) {
  const [activeType, setActiveType] = useState<DocumentType>(initialDocType)
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  // Generate dynamic sample / real data based on surgery
  const patientName = surgery?.patient || "JUAN PÉREZ"
  const surgeryId = surgery?.id || "CX-2026-089"
  const institutionName = surgery?.institution || "Hospital Alemán Asociación Civil"
  const surgeonName = surgery?.surgeon || "Dr. Britos Santiago"
  const classification = surgery?.classification || "Prótesis de Cadera"
  const surgeryDate = surgery?.date || "2026-09-28"

  const presupuestoData: PresupuestoDocumentData = useMemo(() => ({
    number: `PRE-2026-${surgeryId.replace(/[^0-9]/g, "").padStart(4, "0") || "0142"}`,
    version: "v1.0 (Oficial)",
    date: "25/09/2026",
    validUntil: "15/10/2026",
    company: {
      name: "OSSUM DISTRIBUIDORA QUIRÚRGICA S.A.",
      cuit: "30-71649281-9",
      address: "Av. Corrientes 2450, Piso 6, CABA",
      phone: "+54 11 5238-9000",
      email: "cotizaciones@ossumcor.com",
    },
    patient: {
      name: patientName,
      dni: "28.451.920",
      obraSocial: surgery?.client || "OSDE 310",
      affiliateNumber: "1-28451920-01",
    },
    surgery: {
      id: surgeryId,
      visibleNumber: surgery?.visibleNumber || surgeryId,
      classification,
      date: surgeryDate,
      institution: institutionName,
      surgeon: surgeonName,
    },
    paymentTerms: "30 días fecha de factura contra entrega de documentación completa.",
    items: [
      {
        code: "IMP-CAD-01",
        description: "Tallo Femoral Modular No Cementado recubierto en Hidroxiapatita",
        quantity: 1,
        unitPrice: 1_850_000,
        subtotal: 1_850_000,
      },
      {
        code: "IMP-CAD-02",
        description: "Copa Acetabular de Titanio Poroso con fijación biológica",
        quantity: 1,
        unitPrice: 1_420_000,
        subtotal: 1_420_000,
      },
      {
        code: "IMP-CAD-03",
        description: "Inserto de Polietileno de Ultra Alto Peso Molecular (UHMWPE) Reticulado",
        quantity: 1,
        unitPrice: 780_000,
        subtotal: 780_000,
      },
      {
        code: "INS-CER-28",
        description: "Cabeza Femoral Cerámica Biolox Delta 28mm / Cuello Mediano",
        quantity: 1,
        unitPrice: 990_000,
        subtotal: 990_000,
      },
    ],
    subtotal: 5_040_000,
    ivaAmount: 1_058_400,
    total: 6_098_400,
    notes: "Incluye asistencia técnica en quirófano de instrumentador/a especializado y caja de instrumental en préstamo sin cargo.",
    canonicalDisclaimer:
      "El presente presupuesto es estimativo y se emite para orientación inicial del paciente y financiador. Queda sujeto a confirmación de disponibilidad de implantes, definición final del acto quirúrgico, institución, fecha de cirugía, logística y validación operativa correspondiente.",
  }), [patientName, surgeryId, institutionName, surgeonName, classification, surgeryDate, surgery?.client, surgery?.visibleNumber])

  const remitoData: RemitoDocumentData = useMemo(() => ({
    number: `R-0004-${surgeryId.replace(/[^0-9]/g, "").padStart(8, "0") || "00001842"}`,
    date: "25/09/2026",
    surgeryDate,
    company: {
      name: "OSSUM DISTRIBUIDORA QUIRÚRGICA S.A.",
      cuit: "30-71649281-9",
      address: "Av. Corrientes 2450, CABA",
      phone: "+54 11 5238-9000",
      email: "logistica@ossumcor.com",
    },
    destination: {
      institution: institutionName,
      address: "Av. Pueyrredón 1640, CABA — Sector Quirófanos Centrales 3° Piso",
      receiverName: "Lic. Andrea Gómez (Jefa Quirófano)",
      receiverRole: "Quirófano",
    },
    patient: {
      name: patientName,
      obraSocial: surgery?.client || "OSDE",
    },
    surgery: {
      id: surgeryId,
      visibleNumber: surgery?.visibleNumber || surgeryId,
      surgeon: surgeonName,
      classification,
    },
    logistics: {
      driverName: "Nelson González (Móvil 04)",
      vehicle: "Renault Kangoo FUR-892",
      dispatchTime: "07:30",
    },
    boxes: [
      {
        id: "BX-CAD-01",
        code: "CJ-ORT-104",
        name: "Caja de Instrumental Prótesis Cadera Primaria",
        sealNumber: "PRC-99214-A",
        type: "Instrumental",
        itemsCount: 32,
      },
      {
        id: "BX-CAD-02",
        code: "CJ-ORT-105",
        name: "Caja de Fresas Acetabulares y Raspas Femorales",
        sealNumber: "PRC-99215-A",
        type: "Instrumental",
        itemsCount: 18,
      },
    ],
    items: [
      {
        code: "IMP-CAD-01",
        description: "Tallo Femoral Modular Talle 4",
        lotNumber: "LOT-2026-F491",
        expiryDate: "2029-08-15",
        quantity: 1,
      },
      {
        code: "IMP-CAD-02",
        description: "Copa Acetabular Porosa 52mm",
        lotNumber: "LOT-2026-CP102",
        expiryDate: "2029-07-20",
        quantity: 1,
      },
      {
        code: "INS-CER-28",
        description: "Cabeza Cerámica Biolox Delta 28mm",
        lotNumber: "LOT-2026-HD881",
        expiryDate: "2030-01-10",
        quantity: 1,
      },
    ],
    observations: "Entregar en quirófano antes de las 18:00 hs para proceso de esterilización.",
  }), [patientName, surgeryId, institutionName, surgeonName, classification, surgeryDate, surgery?.client, surgery?.visibleNumber])

  const facturaData: FacturaDocumentData = useMemo(() => ({
    invoiceType: "A",
    pointOfSale: "0004",
    number: `0000${surgeryId.replace(/[^0-9]/g, "").padStart(4, "0") || "1290"}`,
    issueDate: "25/09/2026",
    dueDate: "25/10/2026",
    company: {
      name: "OSSUM DISTRIBUIDORA QUIRÚRGICA S.A.",
      cuit: "30-71649281-9",
      grossIncome: "901-2849102-1",
      startOfActivities: "01/03/2018",
      ivaCondition: "IVA Responsable Inscripto",
      address: "Av. Corrientes 2450, Piso 6, CABA",
    },
    client: {
      name: surgery?.client ? `${surgery.client} S.A.` : "ORGANIZACIÓN DE SERVICIOS DIRECTOS EMPRESARIOS (OSDE)",
      cuit: "30-54674125-3",
      ivaCondition: "IVA Responsable Inscripto",
      address: "Av. Leandro N. Alem 1067, CABA",
    },
    surgeryRef: {
      id: surgeryId,
      visibleNumber: surgery?.visibleNumber || surgeryId,
      patientName,
      surgeon: surgeonName,
      institution: institutionName,
    },
    items: [
      {
        code: "PROT-CAD-01",
        description: `Provisión de Prótesis de Cadera Biolox Delta para paciente ${patientName}`,
        quantity: 1,
        unitPrice: 5_040_000,
        ivaPercent: 21,
        subtotal: 5_040_000,
      },
    ],
    netSubtotal: 5_040_000,
    iva21: 1_058_400,
    total: 6_098_400,
    paymentCondition: "Cuenta Corriente 30 Días",
    cae: "74391820491029",
    caeDueDate: "05/10/2026",
  }), [patientName, surgeryId, institutionName, surgeonName, surgery?.client, surgery?.visibleNumber])

  const ordenCompraData: OrdenCompraDocumentData = useMemo(() => ({
    orderNumber: `OC-2026-${surgeryId.replace(/[^0-9]/g, "").padStart(4, "0") || "0891"}`,
    date: "25/09/2026",
    requiredDeliveryDate: "27/09/2026",
    company: {
      name: "OSSUM DISTRIBUIDORA QUIRÚRGICA S.A.",
      cuit: "30-71649281-9",
      address: "Av. Corrientes 2450, CABA",
      phone: "+54 11 5238-9000",
      email: "compras@ossumcor.com",
    },
    supplier: {
      name: "BIOMÉDICA ARGENTINA PROVEEDORA S.A.",
      cuit: "30-68921475-2",
      contactPerson: "Ing. Martín Peralta",
      phone: "+54 11 4782-9900",
      email: "ventas@biomedica-arg.com.ar",
    },
    targetDestination: {
      depositName: "Depósito Quirúrgico Central OSSUM",
      address: "Av. Warnes 1420, Depósito 2, CABA",
      surgeryRef: surgeryId,
      patientName,
    },
    items: [
      {
        code: "BIO-CAD-99",
        description: "Tallo Femoral Titanio Recubierto Biolox Delta Talle 4",
        quantity: 1,
        unitPrice: 1_250_000,
        subtotal: 1_250_000,
      },
      {
        code: "BIO-COP-52",
        description: "Copa Porosa Titanio 52mm con fijación roscada",
        quantity: 1,
        unitPrice: 980_000,
        subtotal: 980_000,
      },
    ],
    subtotal: 2_230_000,
    ivaAmount: 468_300,
    total: 2_698_300,
    paymentTerms: "Transferencia Bancaria 60 días",
    authorizedBy: "Lic. Franco Dev (Gerencia Operativa)",
    notes: "Entrega urgente requerida para armado de caja con antelación quirúrgica.",
  }), [patientName, surgeryId])

  const consumoData: ConsumoDocumentData = useMemo(() => ({
    consumoNumber: `CNS-2026-${surgeryId.replace(/[^0-9]/g, "").padStart(4, "0") || "0412"}`,
    remitoReference: `R-0004-${surgeryId.replace(/[^0-9]/g, "").padStart(8, "0") || "00001842"}`,
    date: surgeryDate,
    surgery: {
      id: surgeryId,
      visibleNumber: surgery?.visibleNumber || surgeryId,
      date: surgeryDate,
      institution: institutionName,
      surgeon: surgeonName,
      instrumentador: "Lic. Estefanía Roldán",
      classification,
    },
    patient: {
      name: patientName,
      dni: "28.451.920",
      obraSocial: surgery?.client || "OSDE",
      affiliateNumber: "1-28451920-01",
    },
    consumedItems: [
      {
        code: "IMP-CAD-01",
        description: "Tallo Femoral Titanio Talle 4",
        lotNumber: "LOT-2026-F491",
        remittedQuantity: 1,
        consumedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        code: "IMP-CAD-02",
        description: "Copa Acetabular Porosa 52mm",
        lotNumber: "LOT-2026-CP102",
        remittedQuantity: 1,
        consumedQuantity: 1,
        returnedQuantity: 0,
      },
      {
        code: "INS-CER-28",
        description: "Cabeza Cerámica Biolox Delta 28mm",
        lotNumber: "LOT-2026-HD881",
        remittedQuantity: 1,
        consumedQuantity: 1,
        returnedQuantity: 0,
      },
    ],
    boxesUsed: [
      {
        code: "CJ-ORT-104",
        name: "Caja de Instrumental Prótesis Cadera Primaria",
        status: "Completa",
      },
      {
        code: "CJ-ORT-105",
        name: "Caja de Fresas Acetabulares",
        status: "Completa",
      },
    ],
    surgeonSignatureName: surgeonName,
    instrumentadorSignatureName: "Lic. Estefanía Roldán (Mat. 9412)",
    observations: "Cirugía efectuada sin complicaciones. Se utilizó la totalidad del set cotizado.",
  }), [patientName, surgeryId, institutionName, surgeonName, classification, surgeryDate, surgery?.client, surgery?.visibleNumber])

  const handlePrint = () => {
    window.print()
    toast.success("Enviando comprobante a impresión")
  }

  const handleDownloadPDF = () => {
    toast.success(`Descargando ${activeType.toUpperCase()} en formato PDF`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Header con Controles y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Emisión & Previsualización de Comprobantes PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Expediente: <strong className="text-foreground">{surgeryId}</strong> • Paciente: <strong className="text-foreground">{patientName}</strong>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 dark:border-slate-800 dark:bg-slate-950">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                title="Reducir zoom"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 140))}
                title="Aumentar zoom"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              Imprimir
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs dark:bg-blue-600"
            >
              <Download className="size-3.5" />
              Descargar PDF
            </Button>
          </div>
        </div>

        {/* Selector de Documentos */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <Tabs value={activeType} onValueChange={(v) => setActiveType(v as DocumentType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-9 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5">
              <TabsTrigger value="presupuesto" className="gap-1 text-xs">
                <FileText className="size-3.5 text-blue-600" />
                Presupuesto
              </TabsTrigger>
              <TabsTrigger value="remito" className="gap-1 text-xs">
                <Package className="size-3.5 text-sky-600" />
                Remito Entrega
              </TabsTrigger>
              <TabsTrigger value="factura" className="gap-1 text-xs">
                <Receipt className="size-3.5 text-slate-700 dark:text-slate-300" />
                Factura
              </TabsTrigger>
              <TabsTrigger value="orden-compra" className="gap-1 text-xs">
                <ShoppingCart className="size-3.5 text-indigo-600" />
                Orden Compra
              </TabsTrigger>
              <TabsTrigger value="consumo" className="gap-1 text-xs">
                <ClipboardCheck className="size-3.5 text-emerald-600" />
                Planilla Consumo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contenedor Visual de la Hoja A4 con Sombra y Zoom */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-200/80 dark:bg-slate-950/80">
          <div
            className="w-full max-w-[820px] bg-white shadow-2xl rounded-sm border border-slate-300 transition-transform origin-top text-slate-900"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          >
            {activeType === "presupuesto" && <PresupuestoPDF data={presupuestoData} />}
            {activeType === "remito" && <RemitoPDF data={remitoData} />}
            {activeType === "factura" && <FacturaPDF data={facturaData} />}
            {activeType === "orden-compra" && <OrdenCompraPDF data={ordenCompraData} />}
            {activeType === "consumo" && <ConsumoQuirurgicoPDF data={consumoData} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
