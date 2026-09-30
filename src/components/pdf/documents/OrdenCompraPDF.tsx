import React from "react"
import { Document, Page, View, StyleSheet } from "@/lib/pdf-primitives"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { Text } from "@/components/pdf/text/text"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/pdf/table/table"
import { Section } from "@/components/pdf/section/section"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PageFooter } from "@/components/pdf/page-footer/page-footer"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { OrdenCompraDocumentData } from "./types"

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
    borderBottomColor: "#475569",
  },
  companyCol: {
    maxWidth: "50%",
  },
  metaCol: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  twoColGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  cardBox: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
  },
  totalsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom: 10,
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
    borderTopColor: "#475569",
  },
  signaturesBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 28,
    paddingTop: 8,
  },
  signatureLine: {
    width: 140,
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    textAlign: "center",
    paddingTop: 4,
    fontSize: 8,
    color: "#475569",
  },
})

export function OrdenCompraPDF({ data }: { data: OrdenCompraDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Header */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>{data.company.name}</Text>
              <Text weight="semibold" variant="xs">Departamento de Compras & Abastecimiento</Text>
              <Text variant="xs" color="#64748b">CUIT: {data.company.cuit} • {data.company.address}</Text>
              <Text variant="xs" color="#64748b">Email: {data.company.email} • Tel: {data.company.phone}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="base" color="#0f172a">ORDEN DE COMPRA</Text>
              <Text weight="bold" variant="sm" color="#334155">N° {data.orderNumber}</Text>
              <Text variant="xs" color="#64748b">Fecha: {data.date}</Text>
              <Text variant="xs" color="#dc2626" weight="bold">Fecha Límite Entrega: {data.requiredDeliveryDate}</Text>
            </View>
          </View>

          {/* Grid de Proveedor y Destino */}
          <View style={styles.twoColGrid}>
            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Datos del Proveedor</Text>
              <KeyValue label="Razón Social" value={data.supplier.name} />
              <KeyValue label="CUIT" value={data.supplier.cuit} />
              {data.supplier.contactPerson && <KeyValue label="Contacto" value={data.supplier.contactPerson} />}
              {data.supplier.email && <KeyValue label="Email" value={data.supplier.email} />}
              {data.supplier.phone && <KeyValue label="Teléfono" value={data.supplier.phone} />}
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Lugar de Entrega / Destino</Text>
              <KeyValue label="Depósito Destino" value={data.targetDestination.depositName} />
              <KeyValue label="Dirección Recepción" value={data.targetDestination.address} />
              {data.targetDestination.surgeryRef && (
                <KeyValue label="Referencia Cirugía" value={data.targetDestination.surgeryRef} />
              )}
              {data.targetDestination.patientName && (
                <KeyValue label="Paciente" value={data.targetDestination.patientName} />
              )}
            </View>
          </View>

          {/* Tabla de Artículos Solicitados */}
          <Section>
            <Text style={styles.cardTitle}>Detalle de Implantes e Insumos Solicitados</Text>
            <Table>
              <TableHeader>
                <TableRow header>
                  <TableCell style={{ width: "15%" }}>Código Prov.</TableCell>
                  <TableCell style={{ width: "45%" }}>Descripción del Material</TableCell>
                  <TableCell align="center" style={{ width: "10%" }}>Cant.</TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>Precio Unit.</TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>Total</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ width: "15%" }}>{item.code || "—"}</TableCell>
                    <TableCell style={{ width: "45%" }}>
                      <Text weight="medium">{item.description}</Text>
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }}>
                      <Text weight="bold">{item.quantity}</Text>
                    </TableCell>
                    <TableCell align="right" style={{ width: "15%" }}>
                      {item.unitPrice ? formatCurrency(item.unitPrice) : "—"}
                    </TableCell>
                    <TableCell align="right" style={{ width: "15%" }}>
                      <Text weight="semibold">{item.subtotal ? formatCurrency(item.subtotal) : "—"}</Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          {/* Totales */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">Subtotal:</Text>
                <Text variant="xs" weight="medium">{formatCurrency(data.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">IVA Estimado:</Text>
                <Text variant="xs" weight="medium">{formatCurrency(data.ivaAmount)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text weight="bold" variant="sm" color="#0f172a">TOTAL ORDEN DE COMPRA:</Text>
                <Text weight="bold" variant="sm" color="#0f172a">{formatCurrency(data.total)}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 2 }}>
            <Text weight="semibold" variant="xs">Condición de Pago: <Text variant="xs">{data.paymentTerms}</Text></Text>
            {data.notes && <Text variant="xs" color="#475569" style={{ marginTop: 2 }}>Instrucciones Especiales: {data.notes}</Text>}
          </View>

          {/* Firmas */}
          <View style={styles.signaturesBox}>
            <View style={styles.signatureLine}>
              <Text weight="semibold">Autorizado por Compras</Text>
              <Text style={{ fontSize: 7, color: "#94a3b8" }}>{data.authorizedBy}</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text weight="semibold">Aceptación Proveedor</Text>
              <Text style={{ fontSize: 7, color: "#94a3b8" }}>Firma, Sello y Fecha</Text>
            </View>
          </View>

          <PageFooter leftText="Orden de Compra válida únicamente con confirmación de recepción y número de remito de entrega" />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
