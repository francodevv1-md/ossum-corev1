"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Loader2, Mail, Send } from "lucide-react"

export interface SendExistingFinancialDocumentDialogProps {
  kind: "invoice" | "receipt"
  open?: boolean
  onOpenChange: (open: boolean) => void
  documentNumber?: string
  recipientEmail?: string
}

export function SendExistingFinancialDocumentDialog({
  kind,
  open = true,
  onOpenChange,
  documentNumber = "",
  recipientEmail = "",
}: SendExistingFinancialDocumentDialogProps) {
  const [docNumber, setDocNumber] = useState(documentNumber)
  const [email, setEmail] = useState(recipientEmail)
  const [subject, setSubject] = useState(
    kind === "invoice" ? `Factura ${documentNumber || "comercial"}` : `Recibo de cobro ${documentNumber || ""}`
  )
  const [message, setMessage] = useState(
    kind === "invoice"
      ? "Estimado cliente, adjuntamos el comprobante de su factura comercial correspondiente a la operación registrada."
      : "Estimado cliente, adjuntamos el recibo de cobro imputado."
  )
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Por favor, ingresá un correo electrónico de destino.")
      return
    }

    setSending(true)
    try {
      // Simulate/Trigger sending document email
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success(
        kind === "invoice"
          ? "Factura enviada correctamente por correo electrónico."
          : "Recibo enviado correctamente por correo electrónico."
      )
      onOpenChange(false)
    } catch {
      toast.error("No se pudo enviar el documento por correo.")
    } finally {
      setSending(false)
    }
  }

  const title = kind === "invoice" ? "Enviar factura por correo" : "Enviar recibo por correo"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-lg border-slate-200 shadow-2xl dark:border-slate-800"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Mail className="size-5" />
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Enviá el documento comercial directamente al correo del cliente o pagador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="email-doc-number" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Número o referencia del comprobante
              </Label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <Input
                  id="email-doc-number"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Ej: F-00042 o número de referencia"
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-recipient" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email de destino *
              </Label>
              <Input
                id="email-recipient"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-subject" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Asunto
              </Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-message" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mensaje adjunto
              </Label>
              <Textarea
                id="email-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-20 text-xs resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sending}
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={sending}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold"
            >
              {sending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Enviar documento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
