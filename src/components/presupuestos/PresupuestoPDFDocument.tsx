import React from "react"
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

export type PresupuestoPDFData = {
  documentNumber: string
  presupuestoId: string
  state: string
  versionNumber: number
  title: string | null
  currency: string
  surgeryLabel: string | null
  companyLabel: string
  branchLabel: string
  clientLabel: string
  payerLabel: string
  responsibleLabel: string
  documentDate: string
  issuedAt: string
  validUntil: string
  createdAt: string
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
  paymentTerms: string
  priceListCode: string
  legend: string
  notes: string | null
  items: Array<{
    sku: string | null
    description: string
    quantity: string
    unit: string | null
    unitPrice: string
    discount: string
    tax: string
    total: string
  }>
}

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Helvetica", fontSize: 9, color: "#172033" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "2 solid #d9e0ea", paddingBottom: 14, marginBottom: 16 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: "#64748b", marginTop: 3 },
  right: { alignItems: "flex-end" },
  tag: { color: "#2563eb", fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  number: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 4 },
  warning: { backgroundColor: "#fff7ed", color: "#9a3412", padding: 7, marginBottom: 14, textAlign: "center", fontFamily: "Helvetica-Bold" },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  chip: { backgroundColor: "#f1f5f9", padding: 5, marginRight: 5, marginBottom: 5 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", padding: 6, borderBottom: "1 solid #e2e8f0" },
  sku: { width: "12%" },
  description: { width: "34%" },
  quantity: { width: "10%", textAlign: "right" },
  amount: { width: "11%", textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "55%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { fontFamily: "Helvetica-Bold", fontSize: 12, borderTop: "1 solid #94a3b8", paddingTop: 6 },
  detail: { marginTop: 12, padding: 8, backgroundColor: "#f8fafc" },
  detailLine: { marginBottom: 3 },
  footer: { position: "absolute", left: 42, right: 42, bottom: 32, borderTop: "1 solid #d9e0ea", paddingTop: 7, color: "#64748b", fontSize: 7 },
})

function amount(value: string, currency: string) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(number)
    : `${currency} ${value}`
}

export default function PresupuestoPDFDocument({ data }: { data: PresupuestoPDFData }) {
  return (
    <Document title={`Presupuesto ${data.documentNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View><Text style={styles.brand}>OSSUM COR</Text><Text style={styles.muted}>Gestión operativa</Text></View>
          <View style={styles.right}><Text style={styles.tag}>Presupuesto</Text><Text style={styles.number}>{data.documentNumber}</Text></View>
        </View>
        <Text style={styles.warning}>DOCUMENTO COMERCIAL NO FISCAL</Text>
        <View style={styles.meta}>
          <Text style={styles.chip}>Estado: {data.state}</Text>
          <Text style={styles.chip}>Versión: {data.versionNumber}</Text>
          <Text style={styles.chip}>Fecha: {data.documentDate}</Text>
          <Text style={styles.chip}>Emisión: {data.issuedAt}</Text>
          <Text style={styles.chip}>Válido hasta: {data.validUntil}</Text>
          {data.surgeryLabel && <Text style={styles.chip}>Cirugía: {data.surgeryLabel}</Text>}
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLine}>Empresa / sucursal: {data.companyLabel} / {data.branchLabel}</Text>
          <Text style={styles.detailLine}>Cliente / pagador: {data.clientLabel} / {data.payerLabel}</Text>
          <Text style={styles.detailLine}>Responsable: {data.responsibleLabel}</Text>
          <Text style={styles.detailLine}>Condición de pago: {data.paymentTerms} · Lista: {data.priceListCode}</Text>
        </View>
        <Text style={styles.title}>{data.title || "Presupuesto de productos y servicios"}</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.sku}>SKU</Text><Text style={styles.description}>Descripción</Text><Text style={styles.quantity}>Cant.</Text>
          <Text style={styles.amount}>Unitario</Text><Text style={styles.amount}>Desc.</Text><Text style={styles.amount}>Imp.</Text><Text style={styles.amount}>Total</Text>
        </View>
        {data.items.map((item) => (
          <View key={`${item.sku ?? "item"}-${item.description}`} style={styles.row} wrap={false}>
            <Text style={styles.sku}>{item.sku || "—"}</Text><Text style={styles.description}>{item.description}</Text>
            <Text style={styles.quantity}>{item.quantity} {item.unit || ""}</Text><Text style={styles.amount}>{amount(item.unitPrice, data.currency)}</Text>
            <Text style={styles.amount}>{amount(item.discount, data.currency)}</Text><Text style={styles.amount}>{amount(item.tax, data.currency)}</Text>
            <Text style={styles.amount}>{amount(item.total, data.currency)}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{amount(data.subtotal, data.currency)}</Text></View>
          <View style={styles.totalRow}><Text>Descuentos</Text><Text>{amount(data.discountTotal, data.currency)}</Text></View>
          <View style={styles.totalRow}><Text>Impuestos</Text><Text>{amount(data.taxTotal, data.currency)}</Text></View>
          <View style={[styles.totalRow, styles.grandTotal]}><Text>Total</Text><Text>{amount(data.total, data.currency)}</Text></View>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLine}>{data.legend}</Text>
          {data.notes && <Text>Notas: {data.notes}</Text>}
        </View>
        <View style={styles.footer} fixed><Text>Generado por OSSUM COR · {data.createdAt} · ID {data.presupuestoId}</Text></View>
      </Page>
    </Document>
  )
}
