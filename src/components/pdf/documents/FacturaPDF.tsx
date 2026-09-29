import React from "react"
import { Document, Page, View, StyleSheet } from "@/lib/pdf-primitives"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { Text } from "@/components/pdf/text/text"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/pdf/table/table"
import { Section } from "@/components/pdf/section/section"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PageFooter } from "@/components/pdf/page-footer/page-footer"
import { PdfQRCode } from "@/components/pdf/qrcode/qrcode"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { FacturaDocumentData } from "./types"

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: "Inter, sans-serif",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  headerBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#334155",
  },
  companyCol: {
    maxWidth: "45%",
  },
  invoiceTypeBox: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#334155",
    backgroundColor: "#f8fafc",
  },
  metaCol: {
    textAlign: "right",
    alignItems: "flex-end",
    maxWidth: "45%",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  clientBox: {
    padding: 8,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
  },
  totalsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 10,
  },
  caeBox: {
    width: "50%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },
  totalsBox: {
    width: "45%",
    padding: 8,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 6,
  },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  grandTotalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
  },
})

export function FacturaPDF({ data }: { data: FacturaDocumentData }) {
  const qrFiscalData = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(JSON.stringify({
    ver: 1,
    fecha: data.issueDate,
    cuit: data.company.cuit.replace(/[^0-9]/g, ""),
    ptoVta: Number(data.pointOfSale) || 1,
    tipoCmp: data.invoiceType === "A" ? 1 : data.invoiceType === "B" ? 6 : 11,
    nroCmp: Number(data.number.replace(/[^0-9]/g, "")) || 1,
    importe: data.total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: 80,
    nroDocRec: Number(data.client.cuit.replace(/[^0-9]/g, "")) || 0,
    tipoCodAut: "E",
    codAut: Number(data.cae) || 74218932104523,
  }))}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Header Factura Oficial */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>{data.company.name}</Text>
              <Text weight="semibold" variant="xs">{data.company.ivaCondition}</Text>
              <Text variant="xs" color="#64748b">CUIT: {data.company.cuit}</Text>
              <Text variant="xs" color="#64748b">IIBB: {data.company.grossIncome}</Text>
              <Text variant="xs" color="#64748b">{data.company.address}</Text>
            </View>

            <View style={styles.invoiceTypeBox}>
              <Text weight="bold" style={{ fontSize: 22, color: "#0f172a" }}>{data.invoiceType}</Text>
              <Text style={{ fontSize: 6.5, color: "#475569", fontWeight: "bold" }}>COD. {data.invoiceType === "A" ? "01" : data.invoiceType === "B" ? "06" : "11"}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="md" color="#0f172a">FACTURA</Text>
              <Text weight="bold" variant="sm" color="#2563eb">N° {data.pointOfSale}-{data.number}</Text>
              <Text variant="xs" color="#64748b">Fecha de Emisión: {data.issueDate}</Text>
              <Text variant="xs" color="#64748b">Fecha de Vencimiento: {data.dueDate}</Text>
              <Text variant="xs" color="#64748b">Condición Venta: <Text weight="semibold">{data.paymentCondition}</Text></Text>
            </View>
          </View>

          {/* Datos del Cliente y Referencia Quirúrgica */}
          <View style={styles.clientBox}>
            <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ width: "50%" }}>
                <Text weight="bold" color="#0f172a" style={{ fontSize: 9, marginBottom: 2 }}>Receptor / Obra Social / Prepaga</Text>
                <KeyValue label="Razón Social" value={data.client.name} />
                <KeyValue label="CUIT" value={data.client.cuit} />
                <KeyValue label="Condición IVA" value={data.client.ivaCondition} />
                <KeyValue label="Domicilio" value={data.client.address} />
              </View>

              {data.surgeryRef && (
                <View style={{ width: "45%" }}>
                  <Text weight="bold" color="#0f172a" style={{ fontSize: 9, marginBottom: 2 }}>Vínculo Quirúrgico / Expediente</Text>
                  <KeyValue label="Expediente CX" value={data.surgeryRef.visibleNumber || data.surgeryRef.id} />
                  <KeyValue label="Paciente" value={data.surgeryRef.patientName} />
                  {data.surgeryRef.surgeon && <KeyValue label="Médico" value={data.surgeryRef.surgeon} />}
                  {data.surgeryRef.institution && <KeyValue label="Institución" value={data.surgeryRef.institution} />}
                </View>
              )}
            </View>
          </View>

          {/* Tabla de Conceptos e Implantes Facturados */}
          <Section title="Detalle de Conceptos Facturados">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell weight="bold" style={{ width: "15%" }}>Código</TableCell>
                  <TableCell weight="bold" style={{ width: "40%" }}>Descripción / Detalle</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "10%" }}>Cant.</TableCell>
                  <TableCell weight="bold" align="right" style={{ width: "15%" }}>Precio Unit.</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "8%" }}>IVA</TableCell>
                  <TableCell weight="bold" align="right" style={{ width: "12%" }}>Subtotal</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ width: "15%" }}>{item.code || "—"}</TableCell>
                    <TableCell style={{ width: "40%" }}>
                      <Text weight="medium">{item.description}</Text>
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }}>{item.quantity}</TableCell>
                    <TableCell align="right" style={{ width: "15%" }}>
                      {item.unitPrice ? formatCurrency(item.unitPrice) : "—"}
                    </TableCell>
                    <TableCell align="center" style={{ width: "8%" }}>
                      {item.ivaPercent ? `${item.ivaPercent}%` : "21%"}
                    </TableCell>
                    <TableCell align="right" style={{ width: "12%" }} weight="semibold">
                      {item.subtotal ? formatCurrency(item.subtotal) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          {/* Resumen Impositivo y CAE Fiscal */}
          <View style={styles.totalsContainer}>
            <View style={styles.caeBox}>
              <View style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
                <PdfQRCode value={qrFiscalData} size={50} />
                <View>
                  <Text weight="bold" variant="xs" color="#0f172a">Comprobante Fiscal Autorizado</Text>
                  <Text variant="xs" color="#475569">CAE N°: <Text weight="semibold">{data.cae || "74218932104523"}</Text></Text>
                  <Text variant="xs" color="#475569">Vto. CAE: <Text weight="semibold">{data.caeDueDate || formatDate(data.dueDate)}</Text></Text>
                </View>
              </View>
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">Importe Neto Gravado:</Text>
                <Text variant="xs" weight="medium">{formatCurrency(data.netSubtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">IVA 21%:</Text>
                <Text variant="xs" weight="medium">{formatCurrency(data.iva21)}</Text>
              </View>
              {!!data.iva105 && (
                <View style={styles.totalRow}>
                  <Text variant="xs" color="#64748b">IVA 10.5%:</Text>
                  <Text variant="xs" weight="medium">{formatCurrency(data.iva105)}</Text>
                </View>
              )}
              {!!data.otherTaxes && (
                <View style={styles.totalRow}>
                  <Text variant="xs" color="#64748b">Percepciones / Otros:</Text>
                  <Text variant="xs" weight="medium">{formatCurrency(data.otherTaxes)}</Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text weight="bold" variant="sm" color="#0f172a">TOTAL FACTURA:</Text>
                <Text weight="bold" variant="sm" color="#2563eb">{formatCurrency(data.total)}</Text>
              </View>
            </View>
          </View>

          <PageFooter title="Comprobante emitido según régimen de Facturación Electrónica ARCA/AFIP" />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
