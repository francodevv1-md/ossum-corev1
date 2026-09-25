"use client"

import React, { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Share2,
  Copy,
  Check,
  Send,
  Truck,
  Building2,
  CalendarDays,
  User,
  AlertTriangle,
  Clock,
  FileText,
  MapPin,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import type { LogisticsInboxItem } from "@/hooks/useLogisticsGlobalInbox"

export type LogisticsShareTemplate = "en_camino" | "proximo_arribo" | "entregado" | "demora" | "personalizado"

interface LogisticsShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LogisticsInboxItem | null
  activeVehicleName?: string | null
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha"
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function LogisticsShareDialog({
  open,
  onOpenChange,
  item,
  activeVehicleName,
}: LogisticsShareDialogProps) {
  const [template, setTemplate] = useState<LogisticsShareTemplate>("en_camino")
  const [customText, setCustomText] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [copied, setCopied] = useState(false)

  const defaultTemplates = useMemo(() => {
    if (!item) return {}

    const ref = item.surgery.reference ?? "S/R"
    const patient = item.surgery.patient ?? "Paciente"
    const institution = item.surgery.institution ?? "Institución"
    const doctor = item.surgery.doctor ? `Dr. ${item.surgery.doctor}` : "Equipo médico"
    const date = formatDate(item.surgery.date)
    const vehicle = activeVehicleName ?? "Unidad de Distribución"
    const nowTime = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })

    return {
      en_camino: `🚚 *OSSUM LOGÍSTICA — DESPACHO EN CAMINO*\n\nEstimados, informamos que el material para la cirugía *${ref}* ha sido despachado.\n\n• *Paciente:* ${patient}\n• *Destino:* ${institution}\n• *Médico:* ${doctor}\n• *Fecha Qx:* ${date}\n• *Transporte:* ${vehicle}\n\nQuedamos a disposición ante cualquier consulta.`,
      proximo_arribo: `📍 *OSSUM LOGÍSTICA — PRÓXIMO ARRIBO*\n\nEstimados, la unidad con los materiales para la cirugía *${ref}* (*${patient}*) se encuentra en proximidad de arribo a *${institution}*.\n\nPor favor confirmar personal disponible en recepción/farmacia para la descarga y firma de remito.`,
      entregado: `✅ *OSSUM LOGÍSTICA — ENTREGA CONFIRMADA*\n\nConfirmamos la entrega exitosa de los materiales para la cirugía *${ref}* en *${institution}*.\n\n• *Paciente:* ${patient}\n• *Hora de entrega:* ${nowTime} hs\n• *Recepción:* Conforme en destino.\n\n¡Muchas gracias!`,
      demora: `⚠️ *OSSUM LOGÍSTICA — AVISO DE NOVEDAD EN TRASLADO*\n\nInformamos que el despacho correspondiente a la cirugía *${ref}* (*${institution}*) registra una contingencia/demora operativa en tránsito.\n\nEstamos gestionando la regularización inmediata para minimizar el impacto. Los mantendremos informados.`,
      personalizado: customText,
    }
  }, [item, activeVehicleName, customText])

  const messageText = template === "personalizado" ? customText : defaultTemplates[template] || ""

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
      toast.success("Mensaje copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("No se pudo copiar el mensaje")
    }
  }

  const handleOpenWhatsApp = () => {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "")
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-5 gap-4">
        <DialogHeader className="gap-1 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-sky-600" />
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Compartir Estado de Despacho
              </DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {item.surgery.reference ?? "S/R"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Generá y compartí avisos operativos de logística, remitos y seguimiento en vivo por WhatsApp o portapapeles.
          </DialogDescription>
        </DialogHeader>

        {/* Surgery Summary Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1.5 dark:bg-slate-800/60 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {item.surgery.patient ?? "Sin paciente"}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(item.surgery.date)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.surgery.institution ?? "Sin institución"}</span>
          </div>
        </div>

        {/* Template Selector Pills */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Plantilla de Comunicación
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setTemplate("en_camino")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                template === "en_camino"
                  ? "bg-sky-50 border-sky-400 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0 text-sky-600" />
              <span className="truncate">En camino</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("proximo_arribo")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                template === "proximo_arribo"
                  ? "bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="truncate">Por arribar</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("entregado")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                template === "entregado"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">Entregado</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("demora")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                template === "demora"
                  ? "bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span className="truncate">Demora</span>
            </button>
          </div>
        </div>

        {/* Message Editor / Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Contenido del Mensaje
            </Label>
            <span className="text-[10px] text-slate-400">Podés editar el texto antes de enviar</span>
          </div>
          <Textarea
            value={messageText}
            onChange={(e) => {
              if (template !== "personalizado") setTemplate("personalizado")
              setCustomText(e.target.value)
            }}
            rows={7}
            className="text-xs font-mono bg-slate-50 border-slate-200 text-slate-800 focus:bg-white resize-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Recipient Phone (Optional for direct WhatsApp) */}
        <div className="flex items-center gap-2">
          <div className="w-full space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              Teléfono destino (opcional para abrir chat directo):
            </Label>
            <Input
              type="tel"
              placeholder="Ej: +5491123456789 o 11..."
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs gap-1.5 font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar por WhatsApp</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
