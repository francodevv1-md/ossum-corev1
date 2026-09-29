import React from "react"
import { Document, Page, View, StyleSheet } from "@/lib/pdf-primitives"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { Text } from "@/components/pdf/text/text"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/pdf/table/table"
import { Section } from "@/components/pdf/section/section"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PageFooter } from "@/components/pdf/page-footer/page-footer"
import { PdfQRCode } from "@/components/pdf/qrcode/qrcode"
import { formatDate } from "@/lib/formatters"
import type { RemitoDocumentData } from "./types"

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
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#0284c7",
  },
  companyCol: {
    maxWidth: "50%",
  },
  centerTypeCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 4,
    backgroundColor: "#f0f9ff",
  },
  metaCol: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0369a1",
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
    color: "#0369a1",
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
  },
  logisticsBox: {
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
  },
  receptionSection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },
  receptionSignCol: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#475569",
    marginTop: 32,
    paddingTop: 4,
    textAlign: "center",
  },
})

export function RemitoPDF({ data }: { data: RemitoDocumentData }) {
  const qrValidationUrl = `https://app.ossumcor.com/remitos/verify/${encodeURIComponent(data.number)}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Header Remito Oficial */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>{data.company.name}</Text>
              <Text weight="semibold" variant="xs">Distribuidora de Material Quirúrgico e Implantes</Text>
              <Text variant="xs" color="#64748b">CUIT: {data.company.cuit} • {data.company.address}</Text>
              <Text variant="xs" color="#64748b">Tel: {data.company.phone} • Email: {data.company.email}</Text>
            </View>

            <View style={styles.centerTypeCol}>
              <Text weight="bold" style={{ fontSize: 20, color: "#0284c7" }}>R</Text>
              <Text style={{ fontSize: 6.5, color: "#0369a1", fontWeight: "bold" }}>DOC. NO FISCAL</Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="md" color="#0369a1">REMITO DE ENTREGA</Text>
              <Text weight="bold" variant="sm" color="#0284c7">N° {data.number}</Text>
              <Text variant="xs" color="#64748b">Emisión: {data.date}</Text>
              {data.surgeryDate && <Text variant="xs" color="#0369a1" weight="semibold">Fecha CX: {formatDate(data.surgeryDate)}</Text>}
            </View>
          </View>

          {/* Grid de Destino e Información Quirúrgica */}
          <View style={styles.twoColGrid}>
            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Lugar de Entrega / Sanatorio</Text>
              <KeyValue label="Institución" value={data.destination.institution} />
              <KeyValue label="Dirección Entrega" value={data.destination.address} />
              {data.destination.receiverName && (
                <KeyValue label="Contacto Quirófano" value={data.destination.receiverName} />
              )}
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Paciente & Acto Quirúrgico</Text>
              <KeyValue label="Paciente" value={data.patient.name} />
              {data.patient.obraSocial && <KeyValue label="Obra Social" value={data.patient.obraSocial} />}
              <KeyValue label="Expediente CX" value={data.surgery.visibleNumber || data.surgery.id} />
              {data.surgery.surgeon && <KeyValue label="Médico Cirujano" value={data.surgery.surgeon} />}
              {data.surgery.classification && <KeyValue label="Tipo Cirugía" value={data.surgery.classification} />}
            </View>
          </View>

          {/* Logística y Transporte */}
          <View style={styles.logisticsBox}>
            <Text weight="bold" style={{ fontSize: 8.5, color: "#166534", marginBottom: 2 }}>
              Datos de Despacho y Transporte
            </Text>
            <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="xs">Chofer / Repartidor: <Text weight="semibold">{data.logistics.driverName || "Logística Propia"}</Text></Text>
              {data.logistics.vehicle && <Text variant="xs">Vehículo: <Text weight="semibold">{data.logistics.vehicle}</Text></Text>}
              {data.logistics.dispatchTime && <Text variant="xs">Hora de Salida: <Text weight="semibold">{data.logistics.dispatchTime} hs</Text></Text>}
            </View>
          </View>

          {/* Cajas y Sets Quirúrgicos */}
          {data.boxes.length > 0 && (
            <Section title="Cajas y Sets de Instrumental Quirúrgico Enviados">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell weight="bold" style={{ width: "20%" }}>Código Caja</TableCell>
                    <TableCell weight="bold" style={{ width: "45%" }}>Nombre del Set / Instrumental</TableCell>
                    <TableCell weight="bold" style={{ width: "20%" }}>N° Precinto Seguridad</TableCell>
                    <TableCell weight="bold" align="center" style={{ width: "15%" }}>Piezas</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.boxes.map((box, index) => (
                    <TableRow key={index}>
                      <TableCell style={{ width: "20%" }}>
                        <Text weight="semibold" color="#0369a1">{box.code}</Text>
                      </TableCell>
                      <TableCell style={{ width: "45%" }}>{box.name}</TableCell>
                      <TableCell style={{ width: "20%" }}>
                        <Text weight="bold" color="#b45309">{box.sealNumber || "Sin precinto"}</Text>
                      </TableCell>
                      <TableCell align="center" style={{ width: "15%" }}>{box.itemsCount} u.</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {/* Implantes y Descartables en Tránsito */}
          <Section title="Detalle de Implantes, Prótesis y Material Descartable">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell weight="bold" style={{ width: "15%" }}>Código</TableCell>
                  <TableCell weight="bold" style={{ width: "40%" }}>Descripción del Implante</TableCell>
                  <TableCell weight="bold" style={{ width: "20%" }}>Lote / N° Serie</TableCell>
                  <TableCell weight="bold" style={{ width: "15%" }}>Vencimiento</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "10%" }}>Cant.</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ width: "15%" }}>{item.code || "—"}</TableCell>
                    <TableCell style={{ width: "40%" }}>
                      <Text weight="medium">{item.description}</Text>
                    </TableCell>
                    <TableCell style={{ width: "20%" }}>
                      <Text weight="semibold">{item.lotNumber || "—"}</Text>
                    </TableCell>
                    <TableCell style={{ width: "15%" }}>
                      {item.expiryDate ? formatDate(item.expiryDate) : "—"}
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }} weight="bold">
                      {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          {data.observations && (
            <View style={{ marginTop: 6 }}>
              <Text variant="xs" color="#475569">Observaciones: {data.observations}</Text>
            </View>
          )}

          {/* Sección de Conformidad y Recepción en Quirófano */}
          <View style={styles.receptionSection}>
            <View style={{ width: "20%", alignItems: "center", justifyContent: "center" }}>
              <PdfQRCode value={qrValidationUrl} size={54} />
              <Text style={{ fontSize: 6.5, color: "#64748b", marginTop: 2, textAlign: "center" }}>
                Validar entrega online
              </Text>
            </View>

            <View style={{ width: "75%", display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={styles.receptionSignCol}>
                <Text weight="semibold">Entregado por (Logística)</Text>
                <Text style={{ fontSize: 7, color: "#94a3b8" }}>Firma y DNI Chofer</Text>
              </View>

              <View style={styles.receptionSignCol}>
                <Text weight="semibold">Recibido en Quirófano / Farmacia</Text>
                <Text style={{ fontSize: 7, color: "#94a3b8" }}>Firma, Aclaración, DNI y Sello</Text>
              </View>
            </View>
          </View>

          <PageFooter title="Remito emitido bajo normas de trazabilidad de implantes quirúrgicos ANMAT" />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
