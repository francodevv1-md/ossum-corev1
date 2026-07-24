import { Mail, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"

type CorreoEmptyStateProps = {
  canAttach: boolean
  onAttach: () => void
}

export function CorreoEmptyState({ canAttach, onAttach }: CorreoEmptyStateProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <Mail className="size-6 text-[#0f4a93]" />
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Correo del expediente</div>
          <h3 className="text-base font-semibold text-slate-900">No hay correos vinculados a esta cirugía</h3>
          <p className="max-w-xl text-sm leading-5 text-slate-600">
            Vinculá conversaciones de correo electrónico relacionadas con este expediente.
          </p>
        </div>
        <Button onClick={onAttach} disabled={!canAttach} className="h-8 rounded-md bg-[#0a4d96] px-4 hover:bg-[#083f7b]">
          <Paperclip className="mr-2 size-4" />
          Adjuntar correo
        </Button>
      </div>
    </section>
  )
}
