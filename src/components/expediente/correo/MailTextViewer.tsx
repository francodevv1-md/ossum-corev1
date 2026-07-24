"use client"

import { useCallback } from "react"
import { Copy } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type MailTextViewerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: string
  sender?: string
  date?: string
  content: string
}

export function MailTextViewer({
  open,
  onOpenChange,
  subject,
  sender,
  date,
  content,
}: MailTextViewerProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Texto copiado al portapapeles")
    } catch {
      toast.error("No se pudo copiar el texto")
    }
  }, [content])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold dark:text-slate-100">
            {subject || "Texto importado desde correo"}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 dark:text-slate-400">
            {sender ? <span>{sender}</span> : null}
            {date ? <span>{date}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {content}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1.5 size-3.5" />
            Copiar texto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
