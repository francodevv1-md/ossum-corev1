/**
 * OSSUM COR - ntfy.sh Notification Service
 * Envia notificaciones push con adjuntos (fotos, PDFs) y acciones interactivas a moviles y PC.
 */

import type { Surgery } from "@/types"

export type NtfyPriority = "min" | "low" | "default" | "high" | "urgent" | 1 | 2 | 3 | 4 | 5

export interface NtfyAction {
  action: "view" | "broadcast" | "http"
  label: string
  url: string
  clear?: boolean
}

export interface SendNtfyOptions {
  topic?: string
  title: string
  message: string
  priority?: NtfyPriority
  tags?: string[]
  attachmentUrl?: string
  attachmentFileName?: string
  clickUrl?: string
  actions?: NtfyAction[]
  serverUrl?: string
}

const DEFAULT_SERVER_URL = process.env.NTFY_SERVER_URL || "https://ntfy.sh"
const DEFAULT_TOPIC = process.env.NTFY_DEFAULT_TOPIC || "ossum-coordinacion"

export function sanitizeTopicName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function getCoordinatorTopic(coordinatorName?: string | null): string {
  if (!coordinatorName || coordinatorName.trim() === "" || coordinatorName.includes("Sin asignar")) {
    return DEFAULT_TOPIC
  }
  const clean = sanitizeTopicName(coordinatorName.split(" ")[0])
  return `ossum-coord-${clean}`
}

export async function sendNtfyNotification(options: SendNtfyOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const server = options.serverUrl || DEFAULT_SERVER_URL
  const topic = options.topic || DEFAULT_TOPIC
  const url = `${server.replace(/\/$/, "")}/${encodeURIComponent(topic)}`

  const headers: Record<string, string> = {
    "Title": options.title,
    "Priority": String(options.priority || "default"),
  }

  if (options.tags && options.tags.length > 0) {
    headers["Tags"] = options.tags.join(",")
  }

  if (options.attachmentUrl) {
    headers["Attach"] = options.attachmentUrl
    if (options.attachmentFileName) {
      headers["Filename"] = options.attachmentFileName
    }
  }

  if (options.clickUrl) {
    headers["Click"] = options.clickUrl
  }

  if (options.actions && options.actions.length > 0) {
    const actionStrings = options.actions.map((act) => `${act.action}, ${act.label}, ${act.url}`)
    headers["Actions"] = actionStrings.join("; ")
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: options.message,
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { success: false, error: `ntfy HTTP ${res.status}: ${errorText}` }
    }

    const data = await res.json().catch(() => ({}))
    return { success: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * Alerta automática cuando una cirugía se marca como URGENTE
 */
export async function dispatchSurgeryUrgentAlert(surgery: Surgery, originUrl?: string) {
  const cxId = surgery.visibleNumber || surgery.id
  const title = `🚨 URGENCIA: CX ${cxId} · ${surgery.patient}`
  const message = [
    `Cirugía Prioritaria para Dr. ${surgery.surgeon || "Sin asignar"}.`,
    `Institución: ${surgery.institution}`,
    `Fecha: ${surgery.date || "Sin fecha asignada"}`,
    `Cobertura: ${surgery.financiador || surgery.obraSocial || surgery.client || "Sin definir"}`,
    `Coord: ${surgery.coordinadorCx || "Sin asignar"}`,
  ].join("\n")

  // Send to global coordination and coordinator personal topic
  const topics = [DEFAULT_TOPIC]
  const personal = getCoordinatorTopic(surgery.coordinadorCx)
  if (personal !== DEFAULT_TOPIC) topics.push(personal)

  const clickUrl = originUrl || (typeof window !== "undefined" ? window.location.origin + "/coordinadores" : undefined)

  for (const topic of topics) {
    await sendNtfyNotification({
      topic,
      title,
      message,
      priority: "urgent",
      tags: ["rotating_light", "hospital", "warning"],
      clickUrl,
      actions: clickUrl ? [{ action: "view", label: "Abrir en OSSUM", url: clickUrl }] : undefined,
    })
  }
}

/**
 * Alerta cuando un supervisor solicita fecha a un coordinador
 */
export async function dispatchDateRequestedAlert(surgery: Surgery, originUrl?: string, customNote?: string) {
  const cxId = surgery.visibleNumber || surgery.id
  const coordTopic = getCoordinatorTopic(surgery.coordinadorCx)
  const title = `📅 Definir Fecha: CX ${cxId} · ${surgery.patient}`
  const messageParts = [
    `Se requiere coordinar fecha de quirófano con Dr. ${surgery.surgeon || "Sin asignar"}.`,
    `Institución: ${surgery.institution}`,
  ]
  if (customNote?.trim()) {
    messageParts.push(`Nota: ${customNote.trim()}`)
  } else {
    messageParts.push(`Disponibilidad Material: ${surgery.materialAvailabilityDate || "A consultar"}`)
  }
  const message = messageParts.join("\n")

  const clickUrl = originUrl || (typeof window !== "undefined" ? window.location.origin + "/coordinadores" : undefined)

  await sendNtfyNotification({
    topic: coordTopic,
    title,
    message,
    priority: "high",
    tags: ["calendar", "clipboard"],
    clickUrl,
    actions: clickUrl ? [{ action: "view", label: "Gestionar Caso", url: clickUrl }] : undefined,
  })
}

/**
 * Alerta cuando se asigna una nueva cirugía a un coordinador
 */
export async function dispatchCoordinatorAssignedAlert(surgery: Surgery, coordinatorName: string, originUrl?: string) {
  const cxId = surgery.visibleNumber || surgery.id
  const coordTopic = getCoordinatorTopic(coordinatorName)
  const title = `👤 Nueva Asignación: CX ${cxId} · ${surgery.patient}`
  const message = [
    `Se te asignó la coordinación del caso.`,
    `Médico: Dr. ${surgery.surgeon || "Sin asignar"}`,
    `Institución: ${surgery.institution}`,
    `Estado: ${surgery.state}`,
  ].join("\n")

  const clickUrl = originUrl || (typeof window !== "undefined" ? window.location.origin + "/coordinadores/mi-bandeja" : undefined)

  await sendNtfyNotification({
    topic: coordTopic,
    title,
    message,
    priority: "high",
    tags: ["bust_in_silhouette", "hospital"],
    clickUrl,
    actions: clickUrl ? [{ action: "view", label: "Ir a Mi Bandeja", url: clickUrl }] : undefined,
  })
}
