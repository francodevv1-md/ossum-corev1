import React from "react"
import { Document, Page, View, StyleSheet } from "@/lib/pdf-primitives"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"
import { Text } from "@/components/pdf/text/text"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/pdf/table/table"
import { Section } from "@/components/pdf/section/section"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PageFooter } from "@/components/pdf/page-footer/page-footer"
import { formatDate } from "@/lib/formatters"
import type { ConsumoDocumentData } from "./types"

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
    borderBottomColor: "#059669",
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
    color: "#059669",
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
    color: "#047857",
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
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
    borderTopColor: "#059669",
    textAlign: "center",
    paddingTop: 4,
    fontSize: 8,
    color: "#0f172a",
  },
})

export function ConsumoQuirurgicoPDF({ data }: { data: ConsumoDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Header */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>Planilla de Consumo Quirúrgico</Text>
              <Text weight="semibold" variant="xs">Registro Oficial de Implantes Utilizados en Quirófano</Text>
              <Text variant="xs" color="#64748b">Remito de Origen: <Text weight="bold" color="#059669">{data.remitoReference}</Text></Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="md" color="#047857">ACTA DE CONSUMO</Text>
              <Text weight="bold" variant="sm" color="#059669">N° {data.consumoNumber}</Text>
              <Text variant="xs" color="#64748b">Fecha Acto: {data.date}</Text>
            </View>
          </View>

          {/* Grid de Paciente y Quirófano */}
          <View style={styles.twoColGrid}>
            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Paciente & Obra Social</Text>
              <KeyValue label="Paciente" value={data.patient.name} />
              {data.patient.dni && <KeyValue label="DNI" value={data.patient.dni} />}
              <KeyValue label="Obra Social" value={data.patient.obraSocial || "Particular"} />
              {data.patient.affiliateNumber && <KeyValue label="N° Afiliado" value={data.patient.affiliateNumber} />}
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardTitle}>Detalle del Acto Quirúrgico</Text>
              <KeyValue label="Expediente CX" value={data.surgery.visibleNumber || data.surgery.id} />
              {data.surgery.classification && <KeyValue label="Clasificación" value={data.surgery.classification} />}
              {data.surgery.institution && <KeyValue label="Institución" value={data.surgery.institution} />}
              {data.surgery.surgeon && <KeyValue label="Cirujano" value={data.surgery.surgeon} />}
              {data.surgery.instrumentador && <KeyValue label="Instrumentador/a" value={data.surgery.instrumentador} />}
            </View>
          </View>

          {/* Tabla de Implantes: Remitido vs Consumido vs Devuelto */}
          <Section title="Balance de Implantes y Materiales (Consumidos vs Devueltos)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell weight="bold" style={{ width: "15%" }}>Código</TableCell>
                  <TableCell weight="bold" style={{ width: "35%" }}>Descripción del Implante</TableCell>
                  <TableCell weight="bold" style={{ width: "20%" }}>Lote / Sticker</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "10%" }}>Enviado</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "10%" }}>Consumo</TableCell>
                  <TableCell weight="bold" align="center" style={{ width: "10%" }}>Devuelto</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.consumedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ width: "15%" }}>{item.code}</TableCell>
                    <TableCell style={{ width: "35%" }}>
                      <Text weight="medium">{item.description}</Text>
                    </TableCell>
                    <TableCell style={{ width: "20%" }}>
                      <Text weight="bold" color="#047857">{item.lotNumber}</Text>
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }}>{item.remittedQuantity}</TableCell>
                    <TableCell align="center" style={{ width: "10%" }} weight="bold">
                      <Text color="#059669">{item.consumedQuantity}</Text>
                    </TableCell>
                    <TableCell align="center" style={{ width: "10%" }}>
                      <Text color="#64748b">{item.returnedQuantity}</Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          {/* Estado de Cajas e Instrumental */}
          {data.boxesUsed.length > 0 && (
            <Section title="Control y Devolución de Cajas Quirúrgicas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell weight="bold" style={{ width: "25%" }}>Código Set</TableCell>
                    <TableCell weight="bold" style={{ width: "45%" }}>Nombre del Instrumental</TableCell>
                    <TableCell weight="bold" style={{ width: "30%" }}>Estado de Devolución</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.boxesUsed.map((box, index) => (
                    <TableRow key={index}>
                      <TableCell style={{ width: "25%" }}>{box.code}</TableCell>
                      <TableCell style={{ width: "45%" }}>{box.name}</TableCell>
                      <TableCell style={{ width: "30%" }}>
                        <Text weight="semibold" color={box.status === "Completa" ? "#059669" : "#d97706"}>
                          {box.status}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          )}

          {data.observations && (
            <View style={{ marginTop: 6 }}>
              <Text variant="xs" color="#475569">Observaciones Médicas: {data.observations}</Text>
            </View>
          )}

          {/* Firmas Cirujano e Instrumentador */}
          <View style={styles.signaturesBox}>
            <View style={styles.signatureLine}>
              <Text weight="semibold">Médico Cirujano</Text>
              <Text style={{ fontSize: 7.5, color: "#334155" }}>{data.surgery.surgeon || "Firma y Matrícula"}</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text weight="semibold">Instrumentador/a Quirúrgico/a</Text>
              <Text style={{ fontSize: 7.5, color: "#334155" }}>{data.surgery.instrumentador || "Firma y Aclaración"}</Text>
            </View>
          </View>

          <PageFooter title="Documento quirúrgico legal para cotejo, trazabilidad ANMAT y liquidación" />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
