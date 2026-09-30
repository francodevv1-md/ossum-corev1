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
import { formatDecimalCurrency } from "@/lib/decimal-money"
import type { DocumentoAjuste } from "@/types/documentos-ajuste"

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: "Inter, sans-serif",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  watermarkBanner: {
    padding: 6,
    marginBottom: 8,
    textAlign: "center",
    borderRadius: 4,
  },
  watermarkDraft: {
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
    borderWidth: 1,
  },
  watermarkNoCae: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
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
    maxWidth: "42%",
  },
  docTypeBox: {
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#334155",
    backgroundColor: "#f8fafc",
  },
  metaCol: {
    textAlign: "right",
    alignItems: "flex-end",
    maxWidth: "42%",
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  contextBox: {
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
  fiscalBox: {
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

interface DocumentoAjustePDFProps {
  documento: DocumentoAjuste
}

export function DocumentoAjustePDF({ documento }: DocumentoAjustePDFProps) {
  const isCredit = documento.tipo === "CREDITO"
  const isDraft = documento.state === "Borrador"
  const isEmitted = documento.state === "Emitida"

  // Extracción segura de evidencia fiscal
  const meta = documento.metadata && typeof documento.metadata === "object"
    ? documento.metadata as Record<string, unknown>
    : null
  const cae = typeof meta?.cae === "string" && meta.cae.trim() !== "" ? meta.cae : null
  const caeExpiresAt = typeof meta?.caeExpiresAt === "string" ? meta.caeExpiresAt : null
  const hasAuthorizedCae = isEmitted && !!cae

  // Construcción de QR Oficial solo si existe CAE real autorizado
  let qrFiscalUrl: string | null = null
  if (hasAuthorizedCae && cae) {
    const rawCuit = "30716492819"
    const ptoVta = 1
    const tipoCmp = isCredit ? 3 : 2 // 3 = NC A / 2 = ND A general
    const nroCmp = documento.visibleNumber || 1
    const totalNum = Number(documento.total) || 0

    const qrPayload = {
      ver: 1,
      fecha: documento.issuedAt ? documento.issuedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      cuit: Number(rawCuit),
      ptoVta,
      tipoCmp,
      nroCmp,
      importe: totalNum,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: 80,
      nroDocRec: 0,
      tipoCodAut: "E",
      codAut: Number(cae.replace(/[^0-9]/g, "")) || 0,
    }

    qrFiscalUrl = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(JSON.stringify(qrPayload))}`
  }

  const docCode = isCredit ? "NC" : "ND"
  const docNumberStr = documento.visibleNumber != null
    ? `${docCode} 0001-${String(documento.visibleNumber).padStart(8, "0")}`
    : `BORRADOR · ${documento.id.slice(0, 8)}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfcnThemeProvider>
          {/* Banner de Evidencia Fiscal Progresiva */}
          {isDraft && (
            <View style={[styles.watermarkBanner, styles.watermarkDraft]}>
              <Text weight="bold" variant="xs" color="#b91c1c" style={{ textAlign: "center" }}>
                BORRADOR — SIN VALIDEZ OPERATIVA NI FISCAL
              </Text>
            </View>
          )}

          {isEmitted && !hasAuthorizedCae && (
            <View style={[styles.watermarkBanner, styles.watermarkNoCae]}>
              <Text weight="bold" variant="xs" color="#b45309" style={{ textAlign: "center" }}>
                CAE NO OBTENIDO — DOCUMENTO OPERATIVO. NO VÁLIDO COMO COMPROBANTE FISCAL
              </Text>
            </View>
          )}

          {/* Header Oficial */}
          <View style={styles.headerBox}>
            <View style={styles.companyCol}>
              <Text style={styles.title}>OSSUM DISTRIBUIDORA QUIRÚRGICA S.A.</Text>
              <Text weight="semibold" variant="xs">IVA Responsable Inscripto</Text>
              <Text variant="xs" color="#64748b">CUIT: 30-71649281-9</Text>
              <Text variant="xs" color="#64748b">IIBB: 901-284910-4</Text>
              <Text variant="xs" color="#64748b">Av. Corrientes 2450, Piso 6, CABA</Text>
            </View>

            <View style={styles.docTypeBox}>
              <Text weight="bold" style={{ fontSize: 18, color: isCredit ? "#b45309" : "#4338ca" }}>
                {docCode}
              </Text>
              <Text style={{ fontSize: 6, color: "#475569", fontWeight: "bold" }}>
                {isCredit ? "CRÉDITO" : "DÉBITO"}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text weight="bold" variant="base" color={isCredit ? "#b45309" : "#4338ca"}>
                {isCredit ? "NOTA DE CRÉDITO" : "NOTA DE DÉBITO"}
              </Text>
              <Text weight="bold" variant="sm" color="#0f172a">
                {docNumberStr}
              </Text>
              <Text variant="xs" color="#64748b">
                Fecha Emisión: {documento.issuedAt ? formatDate(documento.issuedAt) : "Sin emitir"}
              </Text>
              <Text variant="xs" color="#64748b">
                Fecha Registro: {formatDate(documento.createdAt)}
              </Text>
              <Text variant="xs" color="#64748b">
                Estado: <Text weight="semibold">{documento.state}</Text>
              </Text>
            </View>
          </View>

          {/* Factura Origen Inmutable y Receptor */}
          <View style={styles.contextBox}>
            <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ width: "50%" }}>
                <Text weight="bold" color="#0f172a" style={{ fontSize: 9, marginBottom: 2 }}>
                  Factura Origen (Comprobante Ajustado)
                </Text>
                <KeyValue label="Comprobante Origen" value={`FV ${documento.invoiceNumber}`} />
                <KeyValue label="ID de Factura" value={documento.invoiceId} />
                <KeyValue label="Motivo del Ajuste" value={documento.motivo} />
                {documento.observaciones && (
                  <KeyValue label="Observaciones" value={documento.observaciones} />
                )}
              </View>

              <View style={{ width: "45%" }}>
                <Text weight="bold" color="#0f172a" style={{ fontSize: 9, marginBottom: 2 }}>
                  Receptor & Expediente Quirúrgico
                </Text>
                {documento.clientName && (
                  <KeyValue label="Cliente / Receptor" value={documento.clientName} />
                )}
                {documento.surgeryId ? (
                  <KeyValue label="Expediente Quirúrgico" value={`Cirugía ${documento.surgeryId}`} />
                ) : (
                  <KeyValue label="Origen Comercial" value="Venta directa sin expediente" />
                )}
                <KeyValue
                  label="Modalidad"
                  value={
                    documento.modalidad === "TOTAL"
                      ? "Ajuste total"
                      : documento.modalidad === "PARCIAL"
                      ? "Ajuste parcial por ítems"
                      : "Ajuste manual justificado"
                  }
                />
              </View>
            </View>
          </View>

          {/* Tabla de Conceptos / Ajustes */}
          <Section>
            <Text weight="bold" style={{ fontSize: 9, marginBottom: 4, color: "#0f172a" }}>
              Detalle de Conceptos / Ítems Ajustados
            </Text>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header style={{ width: "45%" }}>Descripción / Concepto</TableCell>
                  <TableCell header align="center" style={{ width: "15%" }}>Cant. Ajustada</TableCell>
                  <TableCell header align="right" style={{ width: "20%" }}>Precio Unitario</TableCell>
                  <TableCell header align="right" style={{ width: "20%" }}>Subtotal Ajuste</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documento.items.length === 0 ? (
                  <TableRow>
                    <TableCell style={{ width: "45%" }}>Ajuste comercial s/ Factura {documento.invoiceNumber}</TableCell>
                    <TableCell align="center" style={{ width: "15%" }}>1</TableCell>
                    <TableCell align="right" style={{ width: "20%" }}>{formatDecimalCurrency(documento.total)}</TableCell>
                    <TableCell align="right" style={{ width: "20%" }}>{formatDecimalCurrency(documento.total)}</TableCell>
                  </TableRow>
                ) : (
                  documento.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell style={{ width: "45%" }}>
                        <Text weight="medium">{item.description}</Text>
                      </TableCell>
                      <TableCell align="center" style={{ width: "15%" }}>
                        {item.adjustedQuantity ?? item.quantity}
                      </TableCell>
                      <TableCell align="right" style={{ width: "20%" }}>
                        {formatDecimalCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell align="right" style={{ width: "20%" }}>
                        {formatDecimalCurrency(item.adjustedAmount ?? item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>

          {/* Resumen de Totales y Evidencia Fiscal */}
          <View style={styles.totalsContainer}>
            <View style={styles.fiscalBox}>
              {hasAuthorizedCae && qrFiscalUrl ? (
                <View style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <PdfQRCode value={qrFiscalUrl} size={48} />
                  <View>
                    <Text weight="bold" variant="xs" color="#0f172a">
                      Comprobante Fiscal Autorizado
                    </Text>
                    <Text variant="xs" color="#475569">
                      CAE N°: <Text weight="semibold">{cae}</Text>
                    </Text>
                    {caeExpiresAt && (
                      <Text variant="xs" color="#475569">
                        Vto. CAE: <Text weight="semibold">{formatDate(caeExpiresAt)}</Text>
                      </Text>
                    )}
                  </View>
                </View>
              ) : isEmitted ? (
                <View>
                  <Text weight="bold" variant="xs" color="#b45309">
                    Documento Operativo Emitido
                  </Text>
                  <Text variant="xs" color="#64748b" style={{ marginTop: 2 }}>
                    Este comprobante opera como constancia de ajuste comercial interna.
                  </Text>
                  <Text variant="xs" color="#64748b" style={{ marginTop: 2 }}>
                    Sin validación fiscal electrónica activa (CAE pendiente o no requerido).
                  </Text>
                </View>
              ) : (
                <View>
                  <Text weight="bold" variant="xs" color="#b91c1c">
                    Estado Borrador
                  </Text>
                  <Text variant="xs" color="#64748b" style={{ marginTop: 2 }}>
                    Documento en edición preliminar sin impacto comercial definitivo.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">Importe del Ajuste:</Text>
                <Text variant="xs" weight="medium">{formatDecimalCurrency(documento.total)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="xs" color="#64748b">Sentido del Ajuste:</Text>
                <Text variant="xs" weight="medium" color={isCredit ? "#b45309" : "#4338ca"}>
                  {isCredit ? "Disminución (-)" : "Incremento (+)"}
                </Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text weight="bold" variant="sm" color="#0f172a">IMPACTO NETO:</Text>
                <Text weight="bold" variant="sm" color={isCredit ? "#b45309" : "#4338ca"}>
                  {isCredit ? `-${formatDecimalCurrency(documento.total)}` : `+${formatDecimalCurrency(documento.total)}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <PageFooter
            centerText={
              hasAuthorizedCae
                ? "Documento de ajuste emitido según régimen de Facturación Electrónica ARCA/AFIP"
                : isEmitted
                ? "Comprobante operativo interno — OSSUM COR ERP Quirúrgico"
                : "Borrador de trabajo no emitido"
            }
          />
        </PdfcnThemeProvider>
      </Page>
    </Document>
  )
}
