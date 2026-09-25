import type { Surgery } from "@/types"

export async function generateSurgeryCardBlob(surgery: Surgery): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Could not get 2D context from canvas")
  }

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630)
  bgGrad.addColorStop(0, "#0B132B")
  bgGrad.addColorStop(0.5, "#1C2541")
  bgGrad.addColorStop(1, "#0B132B")
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, 1200, 630)

  // Decorative blue glow top-right
  const glow = ctx.createRadialGradient(1000, 100, 10, 1000, 100, 450)
  glow.addColorStop(0, "rgba(29, 47, 192, 0.45)")
  glow.addColorStop(1, "rgba(29, 47, 192, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1200, 630)

  // Top header border accent
  ctx.fillStyle = "#1D2FC0"
  ctx.fillRect(0, 0, 1200, 10)

  // Logo / System pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)"
  ctx.beginPath()
  ctx.roundRect(60, 45, 240, 46, 12)
  ctx.fill()
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = "#60A5FA"
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
  ctx.fillText("OSSUM COR", 80, 75)

  ctx.fillStyle = "#94A3B8"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("COORDINACIÓN", 200, 75)

  // Case Number Pill
  const caseNumberText = `CX ${surgery.visibleNumber || surgery.id}`
  ctx.fillStyle = surgery.urgente ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)"
  ctx.beginPath()
  ctx.roundRect(880, 45, 260, 46, 12)
  ctx.fill()
  ctx.strokeStyle = surgery.urgente ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.5)"
  ctx.stroke()

  ctx.fillStyle = surgery.urgente ? "#F87171" : "#93C5FD"
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(surgery.urgente ? `🚨 ${caseNumberText} (URGENTE)` : caseNumberText, 1010, 75)
  ctx.textAlign = "left"

  // Patient Name
  ctx.fillStyle = "#FFFFFF"
  ctx.font = "bold 38px system-ui, -apple-system, sans-serif"
  const patientText = surgery.patient || "Paciente no especificado"
  ctx.fillText(patientText.length > 36 ? patientText.substring(0, 36) + "..." : patientText, 60, 160)

  // Procedure subtitle
  ctx.fillStyle = "#94A3B8"
  ctx.font = "22px system-ui, -apple-system, sans-serif"
  const procText = surgery.procedure || "Procedimiento quirúrgico"
  ctx.fillText(procText.length > 55 ? procText.substring(0, 55) + "..." : procText, 60, 205)

  // Main details card
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)"
  ctx.beginPath()
  ctx.roundRect(60, 240, 1080, 300, 20)
  ctx.fill()
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
  ctx.stroke()

  // Column 1
  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("MÉDICO CIRUJANO", 90, 285)
  ctx.fillStyle = "#F1F5F9"
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif"
  ctx.fillText(surgery.surgeon ? `Dr. ${surgery.surgeon}` : "A definir", 90, 320)

  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("INSTITUCIÓN / SANATORIO", 90, 385)
  ctx.fillStyle = "#F1F5F9"
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif"
  ctx.fillText(surgery.institution || "A definir", 90, 420)

  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("OBRA SOCIAL / COBERTURA", 90, 480)
  ctx.fillStyle = "#F1F5F9"
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
  ctx.fillText(surgery.obraSocial || surgery.client || "A confirmar", 90, 510)

  // Column 2
  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("FECHA Y HORA PROGRAMADA", 620, 285)
  ctx.fillStyle = surgery.date ? "#34D399" : "#FBBF24"
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif"
  const dateFormatted = surgery.date ? `${surgery.date}${surgery.time ? ` - ${surgery.time} hs` : ""}` : "Fecha pendiente de coordinar"
  ctx.fillText(dateFormatted, 620, 320)

  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("DISPONIBILIDAD DE MATERIAL", 620, 385)
  ctx.fillStyle = "#E2E8F0"
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
  ctx.fillText(surgery.materialAvailabilityDate || "A coordinar con logística", 620, 420)

  ctx.fillStyle = "#64748B"
  ctx.font = "14px system-ui, -apple-system, sans-serif"
  ctx.fillText("COORDINADOR RESPONSABLE", 620, 480)
  ctx.fillStyle = "#60A5FA"
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
  ctx.fillText(surgery.coordinadorCx || "Equipo de Coordinación", 620, 510)

  // Bottom footer timestamp
  ctx.fillStyle = "#475569"
  ctx.font = "13px system-ui, -apple-system, sans-serif"
  const timestamp = new Date().toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
  ctx.fillText(`Generado por OSSUM COR · ${timestamp}`, 60, 585)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("Canvas toBlob returned null"))
      }
    }, "image/png")
  })
}

export async function generateSurgeryCardFile(surgery: Surgery): Promise<File> {
  const blob = await generateSurgeryCardBlob(surgery)
  const filename = `resumen-cirugia-${surgery.visibleNumber || surgery.id}.png`
  return new File([blob], filename, { type: "image/png" })
}
