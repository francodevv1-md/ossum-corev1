import React from "react"
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

export type SurgeryReportPDFData = {
  surgeryNumber: string
  patient: string
  doctor: string
  institution: string
  payer: string
  date: string
  status: string
  preparationStatus: string
  coordinator: string
  classification: string
  description: string
  observations: string
  generatedAt: string
}

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", fontSize: 10, color: "#172033" },
  header: { borderBottom: "2 solid #162b4d", paddingBottom: 14, marginBottom: 18 },
  company: { fontSize: 16, fontWeight: 700, color: "#071935" },
  subtitle: { marginTop: 3, fontSize: 9, color: "#657085" },
  title: { marginTop: 18, fontSize: 14, fontWeight: 700, color: "#071935" },
  number: { marginTop: 4, fontSize: 11, color: "#1d2fc0" },
  section: { marginBottom: 14, border: "1 solid #dfe4eb", padding: 12 },
  sectionTitle: { marginBottom: 8, fontSize: 8, fontWeight: 700, color: "#657085", textTransform: "uppercase" },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 120, color: "#657085" },
  value: { flex: 1 },
  notes: { lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 32, left: 44, right: 44, borderTop: "1 solid #dfe4eb", paddingTop: 8, fontSize: 8, color: "#7b8495" },
})

function Field({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || "—"}</Text></View>
}

export default function SurgeryReportPDFDocument({ data }: { data: SurgeryReportPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>DISTRICORR · OSSUM COR</Text>
          <Text style={styles.subtitle}>Reporte operativo de cirugía</Text>
          <Text style={styles.title}>Resumen operativo</Text>
          <Text style={styles.number}>{data.surgeryNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cirugía</Text>
          <Field label="Paciente" value={data.patient} />
          <Field label="Médico" value={data.doctor} />
          <Field label="Institución" value={data.institution} />
          <Field label="Cliente / cobertura" value={data.payer} />
          <Field label="Fecha" value={data.date} />
          <Field label="Clasificación" value={data.classification} />
          <Field label="Descripción" value={data.description} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado operativo</Text>
          <Field label="Estado CX" value={data.status} />
          <Field label="Preparación" value={data.preparationStatus} />
          <Field label="Coordinador" value={data.coordinator} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observaciones</Text>
          <Text style={styles.notes}>{data.observations || "Sin observaciones registradas."}</Text>
        </View>

        <Text style={styles.footer}>Generado el {data.generatedAt} · Documento operativo, no fiscal ni clínico.</Text>
      </Page>
    </Document>
  )
}
