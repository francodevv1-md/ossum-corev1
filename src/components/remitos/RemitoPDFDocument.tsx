import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer"
import { REMITO_DOCUMENT_THEME } from "@/lib/remito-document-theme"

const { brand, colors, documentTitle, fontFamily } = REMITO_DOCUMENT_THEME

// ─── Fonts ─────────────────────────────────────────────────

Font.register({
  family: fontFamily,
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf", fontWeight: 700 },
  ],
})

Font.register({
  family: "JetBrains Mono",
  src: "https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf",
})

// ─── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily,
    fontSize: 10,
    color: colors.ink,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `2 solid ${colors.line}`,
  },
  headerLeft: { flex: 1 },
  brandLogo: { width: 154, height: 35, objectFit: "contain", marginBottom: 3 },
  companySub: { fontSize: 9, color: colors.muted },
  headerRight: { alignItems: "flex-end" },
  documentTag: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  documentNumber: { fontSize: 14, fontWeight: 600, color: colors.heading },
  // Metadata strip
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 20,
  },
  metaChip: {
    backgroundColor: colors.softLine,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: colors.muted,
  },
  // Sections
  sectionRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  sectionBox: {
    flex: 1,
    border: `1 solid ${colors.line}`,
    borderRadius: 4,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.quiet,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    borderBottom: `1 solid ${colors.softLine}`,
    paddingBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  fieldLabel: { width: 80, fontSize: 8, color: colors.quiet },
  fieldValue: { flex: 1, fontSize: 9, color: colors.text },
  fieldValueMono: { flex: 1, fontSize: 8, fontFamily: "JetBrains Mono", color: colors.muted },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.softSurface,
    borderBottom: `2 solid ${colors.line}`,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${colors.softLine}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colCode: { width: "15%", fontFamily: "JetBrains Mono", fontSize: 8, color: colors.muted },
  colDesc: { width: "55%", fontSize: 9, color: colors.text },
  colQty: { width: "15%", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 9 },
  colUnit: { width: "15%", textAlign: "center", fontSize: 8, color: colors.muted },
  detailCode: { width: "11%", fontFamily: "JetBrains Mono", fontSize: 7, color: colors.muted },
  detailDesc: { width: "26%", fontSize: 8, color: colors.text },
  detailQty: { width: "8%", textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 8 },
  detailUnit: { width: "8%", textAlign: "center", fontSize: 7, color: colors.muted },
  detailTrace: { width: "11%", fontFamily: "JetBrains Mono", fontSize: 6.5, color: colors.quiet },
  detailExpiration: { width: "13%", fontFamily: "JetBrains Mono", fontSize: 6.5, color: colors.quiet },
  detailIdentification: { width: "12%", fontFamily: "JetBrains Mono", fontSize: 6.5, color: colors.quiet },
  detailGroup: { backgroundColor: colors.softSurface, paddingVertical: 5, paddingHorizontal: 8, fontSize: 8, fontWeight: 700, color: colors.heading },
  colReturned: { width: "14%", textAlign: "right" },
  colReturnedValue: { fontFamily: "JetBrains Mono", fontSize: 8, color: colors.warningText },
  th: { fontWeight: 700, color: colors.muted, fontSize: 8, textTransform: "uppercase" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 48,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: `1 solid ${colors.line}`,
    paddingTop: 12,
  },
  footerLeft: {},
  footerLabel: { fontSize: 7, color: colors.quiet, textTransform: "uppercase", marginBottom: 1 },
  footerValue: { fontSize: 8, color: colors.muted },
  qrContainer: { alignItems: "center" },
  qrCode: { width: 60, height: 60 },
  qrLabel: { fontSize: 7, color: colors.quiet, marginTop: 2 },
  // Signatures
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sigBlock: { width: 140, alignItems: "center" },
  sigLine: { borderTop: `1 solid ${colors.strongLine}`, width: 140, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: colors.muted },
  // Observations
  obsBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: colors.warningBackground,
    borderRadius: 4,
    border: `1 solid ${colors.warningBorder}`,
  },
  obsText: { fontSize: 8, color: colors.warningText },
  // Totals
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  totalLabel: { fontSize: 9, fontWeight: 700, color: colors.muted, marginRight: 4 },
  totalValue: { fontFamily: "JetBrains Mono", fontSize: 10, fontWeight: 700, color: colors.heading },
})

// ─── Types ─────────────────────────────────────────────────

export type RemitoPDFData = {
  documentNumber: string
  state: string
  origin: string
  salidaReason: string
  branchLabel: string
  surgeryLabel: string | null
  surgeryDescription?: string | null
  surgeryDate?: string | null
  patient?: string | null
  doctor?: string | null
  institution?: string | null
  client?: string | null
  issuedAt: string
  deliveredAt: string
  returnedAt: string
  createdAt: string
  destinatario: {
    nombre: string
    codigo?: string
    cuitDni?: string
  }
  direccion: {
    domicilio?: string
    localidad?: string
    provincia?: string
  } | null
  transporte: {
    nombre?: string
  } | null
  packageCount: number | null
  declaredValue: string | null
  items: Array<{
    sku: string | null
    description: string
    quantity: string
    unit: string | null
    lotNumber: string | null
    serialNumber: string | null
    returnedQuantity: string
  }>
  detailItems?: Array<{
    groupLabel: string | null
    sku: string | null
    description: string
    quantity: string
    unit: string | null
    lotNumber: string | null
    serialNumber: string | null
    expirationDate: string | null
    identifiedCode: string | null
  }>
  observations: string | null
  qrDataUrl: string | null
  logoDataUrl: string
}

// ─── Component ─────────────────────────────────────────────

export default function RemitoPDFDocument({ data }: { data: RemitoPDFData }) {
  const totalItems = data.items.length
  const detailItems = data.detailItems ?? data.items.map((item) => ({
    ...item,
    groupLabel: null,
    expirationDate: null,
    identifiedCode: null,
  }))
  const surgeryFields = [
    ["CX / expediente", data.surgeryLabel],
    ["Paciente", data.patient],
    ["Médico", data.doctor],
    ["Institución", data.institution],
    ["Cliente", data.client],
    ["Fecha", data.surgeryDate],
  ].filter((field): field is [string, string] => Boolean(field[1]))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* React-PDF Image has no HTML alt prop. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.logoDataUrl} style={styles.brandLogo} />
            <Text style={styles.companySub}>{brand.subtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTag}>{documentTitle}</Text>
            <Text style={styles.documentNumber}>{data.documentNumber}</Text>
          </View>
        </View>

        {/* ── META CHIPS ── */}
        <View style={styles.metaStrip}>
          <Text style={styles.metaChip}>Estado: {data.state}</Text>
          <Text style={styles.metaChip}>Origen: {data.origin}</Text>
          <Text style={styles.metaChip}>Motivo: {data.salidaReason}</Text>
          <Text style={styles.metaChip}>Sucursal: {data.branchLabel}</Text>
          {data.surgeryLabel && <Text style={styles.metaChip}>CX: {data.surgeryLabel}</Text>}
        </View>

        {surgeryFields.length > 0 && (
          <View style={[styles.sectionBox, { marginBottom: 16 }]}>
            <Text style={styles.sectionTitle}>Contexto quirúrgico</Text>
            {surgeryFields.map(([label, value]) => (
              <View key={label} style={styles.fieldRow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue}>{value}</Text></View>
            ))}
          </View>
        )}

        {/* ── SECTIONS GRID ── */}
        <View style={styles.sectionRow}>
          {/* Destinatario */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Destinatario</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{data.destinatario.nombre}</Text>
            </View>
            {data.destinatario.codigo && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Código</Text>
                <Text style={styles.fieldValueMono}>{data.destinatario.codigo}</Text>
              </View>
            )}
            {data.destinatario.cuitDni && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>CUIT/DNI</Text>
                <Text style={styles.fieldValueMono}>{data.destinatario.cuitDni}</Text>
              </View>
            )}
          </View>

          {/* Dirección */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Dirección de entrega</Text>
            {data.direccion?.domicilio ? (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Domicilio</Text>
                  <Text style={styles.fieldValue}>{data.direccion.domicilio}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Localidad</Text>
                  <Text style={styles.fieldValue}>
                    {[data.direccion.localidad, data.direccion.provincia].filter(Boolean).join(", ") || "—"}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 8, color: colors.quiet }}>
                Sin dirección registrada
              </Text>
            )}
          </View>
        </View>

        <View style={styles.sectionRow}>
          {/* Fechas */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Fechas</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Emisión</Text>
              <Text style={styles.fieldValueMono}>{data.issuedAt}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Entrega</Text>
              <Text style={styles.fieldValueMono}>{data.deliveredAt}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Devolución</Text>
              <Text style={styles.fieldValueMono}>{data.returnedAt}</Text>
            </View>
          </View>

          {/* Logística */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Logística</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Transporte</Text>
              <Text style={styles.fieldValue}>{data.transporte?.nombre || "—"}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Bultos</Text>
              <Text style={styles.fieldValueMono}>{data.packageCount ?? "—"}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Valor decl.</Text>
              <Text style={styles.fieldValueMono}>{data.declaredValue ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* ── ITEMS TABLE ── */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Ítems enviados ({totalItems})</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.colCode, styles.th]}>SKU</Text>
            <Text style={[styles.colDesc, styles.th]}>Descripción</Text>
            <Text style={[styles.colQty, styles.th]}>Cant.</Text>
            <Text style={[styles.colUnit, styles.th]}>Ud.</Text>
          </View>

          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colCode}>{item.sku || "—"}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit || "—"}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ítems:</Text>
            <Text style={styles.totalValue}>{totalItems}</Text>
          </View>
        </View>

        {/* ── OBSERVATIONS ── */}
        {data.observations && (
          <View style={styles.obsBox}>
            <Text style={styles.obsText}>{data.observations}</Text>
          </View>
        )}

        {/* ── SIGNATURES ── */}
        <View style={styles.sigRow}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Entregó</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Recibió conforme</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Fecha</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Documento generado por OSSUM COR</Text>
            <Text style={styles.footerValue}>{data.createdAt}</Text>
          </View>
          {data.qrDataUrl && (
            <View style={styles.qrContainer}>
              {/* React-PDF Image has no HTML alt prop. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={data.qrDataUrl} style={styles.qrCode} />
              <Text style={styles.qrLabel}>Verificar documento</Text>
            </View>
          )}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.logoDataUrl} style={styles.brandLogo} />
            <Text style={styles.companySub}>{brand.subtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTag}>Detallado</Text>
            <Text style={styles.documentNumber}>{data.documentNumber}</Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <Text style={styles.metaChip}>Estado: {data.state}</Text>
          <Text style={styles.metaChip}>Sucursal: {data.branchLabel}</Text>
          {data.surgeryLabel && <Text style={styles.metaChip}>CX: {data.surgeryLabel}</Text>}
        </View>

        {surgeryFields.length > 0 && (
          <View style={[styles.sectionBox, { marginBottom: 16 }]}>
            <Text style={styles.sectionTitle}>Contexto quirúrgico</Text>
            {surgeryFields.map(([label, value]) => (
              <View key={label} style={styles.fieldRow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue}>{value}</Text></View>
            ))}
          </View>
        )}

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Componentes emitidos · snapshot original ({detailItems.length})</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.detailCode, styles.th]}>SKU</Text>
            <Text style={[styles.detailDesc, styles.th]}>Descripción</Text>
            <Text style={[styles.detailQty, styles.th]}>Cant.</Text>
            <Text style={[styles.detailUnit, styles.th]}>Ud.</Text>
            <Text style={[styles.detailTrace, styles.th]}>Lote</Text>
            <Text style={[styles.detailTrace, styles.th]}>Serie</Text>
            <Text style={[styles.detailExpiration, styles.th]}>Vencimiento</Text>
            <Text style={[styles.detailIdentification, styles.th]}>Identificación</Text>
          </View>
          {detailItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.groupLabel && (index === 0 || detailItems[index - 1]?.groupLabel !== item.groupLabel) && <Text style={styles.detailGroup}>{item.groupLabel}</Text>}
              <View style={styles.tableRow}>
                <Text style={styles.detailCode}>{item.sku || "—"}</Text>
                <Text style={styles.detailDesc}>{item.description}</Text>
                <Text style={styles.detailQty}>{item.quantity}</Text>
                <Text style={styles.detailUnit}>{item.unit || "—"}</Text>
                <Text style={styles.detailTrace}>{item.lotNumber || "—"}</Text>
                <Text style={styles.detailTrace}>{item.serialNumber || "—"}</Text>
                <Text style={styles.detailExpiration}>{item.expirationDate || "—"}</Text>
                <Text style={styles.detailIdentification}>{item.identifiedCode || "—"}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Detallado del remito</Text>
            <Text style={styles.footerValue}>{data.documentNumber}</Text>
          </View>
          {data.qrDataUrl && (
            <View style={styles.qrContainer}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={data.qrDataUrl} style={styles.qrCode} />
              <Text style={styles.qrLabel}>Verificar documento</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
