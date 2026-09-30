import React from "react"
import { Document, Page, View, StyleSheet } from "@/lib/pdf-primitives"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { Text } from "@/components/pdf/text/text"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/pdf/table/table"
import { Section } from "@/components/pdf/section/section"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PageHeader } from "@/components/pdf/page-header/page-header"
import { PageFooter } from "@/components/pdf/page-footer/page-footer"
import { Divider } from "@/components/pdf/divider/divider"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { PresupuestoDocumentData } from "./types"

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Inter, sans-serif",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  headerBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1d4ed8",
  },
  companyCol: {
    maxWidth: "55%",
  },
  metaCol: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 4,
    color: "#1d4ed8",
    fontSize: 8,
    fontWeight: "bold",
  },
  twoColGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  cardBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
  },
  totalsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom: 14,
  },
  totalsBox: {
    width: "45%",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 6,
  },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grandTotalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: "#1d4ed8",
  },
  disclaimerBox: {
    padding: 8,
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 4,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: "#92400e",
    lineHeight: 1.3,
  },
  signaturesBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 32,
    paddingTop: 12,
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

export function PresupuestoPDF({ data }: { data: PresupuestoDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Header Superior */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>{data.company.name}</Text>
              <Text weight="semibold" variant="xs">Distribuidora Quirúrgica & Ortopedia</Text>
              <Text variant="xs" color="#64748b">CUIT: {data.company.cuit} • {data.company.address}</Text>
              <Text variant="xs" color="#64748b">Tel: {data.company.phone} • Email: {data.company.email}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="lg" color="#1e293b">PRESUPUESTO</Text>
              <Text weight="bold" variant="sm" color="#2563eb">N° {data.number} ({data.version})</Text>
              <Text variant="xs" color="#64748b">Emisión: {data.date}</Text>
              <Text variant="xs" color="#64748b">Vencimiento: {data.validUntil}</Text>
            </View>
          </View>

          {/* Grid de Paciente y Cirugía */}
          <View style={styles.twoColGrid}>
            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Datos del Paciente</Text>
              <KeyValue label="Paciente" value={data.patient.name} />
              {data.patient.dni && <KeyValue label="DNI" value={data.patient.dni} />}
              <KeyValue label="Obra Social / Prepaga" value={data.patient.obraSocial || "Particular"} />
              {data.patient.affiliateNumber && <KeyValue label="N° Afiliado" value={data.patient.affiliateNumber} />}
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Referencia Quirúrgica</Text>
              <KeyValue label="Expediente CX" value={data.surgery.visibleNumber || data.surgery.id} />
              {data.surgery.classification && <KeyValue label="Clasificación" value={data.surgery.classification} />}
              {data.surgery.institution && <KeyValue label="Institución / Sanatorio" value={data.surgery.institution} />}
              {data.surgery.surgeon && <KeyValue label="Médico Cirujano" value={data.surgery.surgeon} />}
              {data.surgery.date && <KeyValue label="Fecha Prevista CX" value={formatDate(data.surgery.date)} />}
            </View>
          </View>

          {/* Tabla de Materiales e Implantes */}
          <Section>
            <Text style={styles.cardTitle}>Detalle de Materiales e Implantes Cotizados</Text>
            <Table>
              <TableHeader>
                <TableRow header>
                  <TableCell style={{ width: "15%" }}>Código</TableCell>
                  <TableCell style={{ width: "45%" }}>Descripción del Implante / Insumo</TableCell>
                  <TableCell align="center" style={{ width: "10%" }}>Cant.</TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>Precio Unit.</TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>Subtotal</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ width: "15%" }}>{item.code || "—"}</TableCell>
                    <TableCell style={{ width: "45%" }}>
                      <Text weight="medium">{item.description}</Text>
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }}>{item.quantity}</TableCell>
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

          {/* Resumen de Totales y Condiciones */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">Subtotal Neto:</Text>
                <Text variant="xs" weight="medium">{formatCurrency(data.subtotal)}</Text>
              </View>
              {!!data.discountAmount && (
                <View style={styles.totalRow}>
                  <Text variant="xs" color="#16a34a">Descuento aplicado:</Text>
                  <Text variant="xs" color="#16a34a">-{formatCurrency(data.discountAmount)}</Text>
                </View>
              )}
              {!!data.ivaAmount && (
                <View style={styles.totalRow}>
                  <Text variant="xs" color="#64748b">IVA discriminado:</Text>
                  <Text variant="xs" weight="medium">{formatCurrency(data.ivaAmount)}</Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text weight="bold" variant="sm" color="#0f172a">TOTAL GENERAL:</Text>
                <Text weight="bold" variant="sm" color="#1d4ed8">{formatCurrency(data.total)}</Text>
              </View>
            </View>
          </View>

          {/* Condiciones Comerciales y Leyenda Canónica */}
          <View style={{ marginTop: 4 }}>
            <Text weight="semibold" variant="xs">Condición de Pago: <Text variant="xs">{data.paymentTerms}</Text></Text>
            {data.notes && <Text variant="xs" color="#475569" style={{ marginTop: 2 }}>Observaciones: {data.notes}</Text>}
          </View>

          {/* Aclaración Fija Estimativa Canónica */}
          <View style={styles.disclaimerBox}>
            <Text weight="bold" style={{ fontSize: 7.5, color: "#92400e", marginBottom: 2 }}>
              Aclaración Importante:
            </Text>
            <Text style={styles.disclaimerText}>
              {data.canonicalDisclaimer}
            </Text>
          </View>

          {/* Firmas */}
          <View style={styles.signaturesBox}>
            <View style={styles.signatureLine}>
              <Text>Responsable Comercial</Text>
              <Text style={{ fontSize: 7, color: "#94a3b8" }}>{data.company.name}</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text>Aceptación / Paciente</Text>
              <Text style={{ fontSize: 7, color: "#94a3b8" }}>Firma y Aclaración</Text>
            </View>
          </View>

          <PageFooter leftText="Documento generado automáticamente por OSSUM COR ERP Quirúrgico" />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
