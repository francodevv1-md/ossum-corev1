import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

export type InvoicePDFData = {
  documentKind: "operational_invoice"
  fiscalStatus: "non_fiscal"
  documentNumber: string
  invoiceId: string
  issuedAt: string
  state: "Emitida" | "Parcialmente_cobrada" | "Cobrada"
  type: string
  currency: string
  base: string
  surgeryId: string | null
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
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
  paidTotal: string
  balance: string
}

export function formatInvoiceMoney(value: string, currency: string) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(number)
    : `${currency} ${value}`
}

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", fontSize: 9, color: "#172033" },
  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, borderBottom: "2 solid #d9e0ea" },
  company: { fontSize: 16, fontWeight: 700 },
  product: { marginTop: 3, color: "#667085" },
  heading: { alignItems: "flex-end" },
  title: { fontSize: 14, fontWeight: 700 },
  number: { marginTop: 4, fontSize: 12 },
  warning: { marginVertical: 14, padding: 9, backgroundColor: "#fff4e5", color: "#8a4b08", fontWeight: 700, textAlign: "center" },
  metadata: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  muted: { color: "#667085" },
  tableHeader: { flexDirection: "row", paddingVertical: 6, borderBottom: "1 solid #98a2b3", fontWeight: 700 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottom: "1 solid #eaecf0" },
  description: { width: "40%" },
  quantity: { width: "12%", textAlign: "right" },
  amount: { width: "16%", textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "55%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { marginTop: 4, paddingTop: 6, borderTop: "1 solid #98a2b3", fontWeight: 700 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 36, borderTop: "1 solid #d9e0ea", paddingTop: 8, color: "#667085", fontSize: 7 },
})

export default function InvoicePDFDocument({ data }: { data: InvoicePDFData }) {
  const money = (value: string) => formatInvoiceMoney(value, data.currency)

  return (
    <Document title={data.documentNumber} subject="Factura operativa no fiscal">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>DISTRICORR</Text>
            <Text style={styles.product}>OSSUM COR</Text>
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>FACTURA OPERATIVA</Text>
            <Text style={styles.number}>{data.documentNumber}</Text>
          </View>
        </View>

        <Text style={styles.warning}>DOCUMENTO NO FISCAL · SIN CAE · NO VÁLIDO COMO COMPROBANTE FISCAL</Text>

        <View style={styles.metadata}>
          <View>
            <Text>Estado: {data.state}</Text>
            <Text>Fecha de emisión: {data.issuedAt}</Text>
          </View>
          <View>
            <Text>Tipo: {data.type}</Text>
            <Text>Base: {data.base}</Text>
            {data.surgeryId && <Text>CX: {data.surgeryId}</Text>}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.description}>Descripción</Text>
          <Text style={styles.quantity}>Cantidad</Text>
          <Text style={styles.amount}>Unitario</Text>
          <Text style={styles.amount}>Desc./Imp.</Text>
          <Text style={styles.amount}>Total</Text>
        </View>
        {data.items.map((item) => (
          <View key={item.description + item.sku} style={styles.row} wrap={false}>
            <Text style={styles.description}>{item.sku ? `${item.sku} · ` : ""}{item.description}</Text>
            <Text style={styles.quantity}>{item.quantity} {item.unit ?? ""}</Text>
            <Text style={styles.amount}>{money(item.unitPrice)}</Text>
            <Text style={styles.amount}>{money(item.discount)} / {money(item.tax)}</Text>
            <Text style={styles.amount}>{money(item.total)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text style={styles.muted}>Subtotal</Text><Text>{money(data.subtotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.muted}>Descuentos</Text><Text>{money(data.discountTotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.muted}>Impuestos</Text><Text>{money(data.taxTotal)}</Text></View>
          <View style={[styles.totalRow, styles.grandTotal]}><Text>Total</Text><Text>{money(data.total)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.muted}>Cobrado</Text><Text>{money(data.paidTotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.muted}>Saldo</Text><Text>{money(data.balance)}</Text></View>
        </View>

        <Text style={styles.footer}>Documento privado generado por OSSUM COR · ID: {data.invoiceId} · Clasificación: operativa / no fiscal</Text>
      </Page>
    </Document>
  )
}
