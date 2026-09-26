"use client"

import { useState } from "react"
import { CheckCircle2, CircleAlert, Clock3, Save, TriangleAlert, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BoxExpectedContentVersion } from "@/features/boxes/presentation/boxes-presentation-fixtures"

type EditorState = "edit" | "review" | "error" | "conflict" | "success"

export function ExpectedContentEditor({
  value,
  onConfirm,
  onClose,
}: {
  value: BoxExpectedContentVersion
  onConfirm: (value: BoxExpectedContentVersion) => void
  onClose: () => void
}) {
  const [state, setState] = useState<EditorState>("edit")
  const [draft, setDraft] = useState(() => value.items.map((item) => ({ ...item })))
  const [targetLabel] = useState(value.nextLabel)
  const [sourceLabel] = useState(value.label)
  const valid = draft.length > 0 && draft.every((item) => item.articleId.trim() && item.articleName.trim() && item.expectedQuantity > 0 && item.quantityUnit.trim())

  function updateItem(index: number, field: keyof (typeof draft)[number], nextValue: string | number | undefined) {
    setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: nextValue } : item))
  }

  function confirmVersion() {
    if (!valid) return
    onConfirm({
      label: targetLabel,
      nextLabel: "Versión siguiente ilustrativa",
      context: "Referencia vigente para nuevas preparaciones",
      items: draft,
    })
    setState("success")
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="expected-editor-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-5 sm:px-6">
        <div><div className="flex items-center gap-2"><Save className="size-4 text-muted-foreground" aria-hidden="true" /><h2 id="expected-editor-title" className="text-lg font-semibold">Editar Contenido esperado</h2></div><p className="mt-1 text-sm text-muted-foreground">Edición directa en Artículos y Stock; nunca modifica evidencia histórica.</p></div>
        <div className="flex items-center gap-2"><Badge variant="outline" className="bg-muted/30">Presentación ilustrativa</Badge><Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={onClose} aria-label="Cerrar editor"><X className="size-4" /></Button></div>
      </div>

      <div className="flex gap-3 border-b bg-muted/20 px-5 py-4 text-sm leading-6 sm:px-6">
        <Clock3 className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p><span className="font-medium">Guardado versionado:</span> confirmar crea {targetLabel} para futuras preparaciones. Preparaciones abiertas y controles históricos conservan {sourceLabel}.</p>
      </div>

      {state === "error" ? <div role="alert" className="border-b bg-red-50 px-5 py-4 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100"><p className="font-semibold">No se guardó la versión ilustrativa</p><p className="mt-1">La revisión y los cambios permanecen disponibles.</p></div> : null}
      {state === "conflict" ? <div role="alert" className="border-b bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"><p className="font-semibold">Existe información más reciente</p><p className="mt-1">No se realizó un merge silencioso. Revisá nuevamente antes de confirmar.</p></div> : null}
      {state === "success" ? <div role="status" aria-live="polite" className="border-b bg-emerald-50 px-5 py-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{targetLabel} creada localmente</p><p className="mt-1">La nueva referencia aplica solo a futuras preparaciones ilustrativas.</p></div></div></div> : null}

      {state === "edit" ? (
        <div className="divide-y">
          {draft.map((item, index) => (
            <fieldset key={`component-${index}`} className="grid gap-3 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.5fr)_8rem_9rem_6rem]">
              <legend className="sr-only">Componente {index + 1}</legend>
              <label className="text-xs font-medium text-muted-foreground">Artículo<input value={item.articleId} onChange={(event) => updateItem(index, "articleId", event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <label className="text-xs font-medium text-muted-foreground">Nombre<input value={item.articleName} onChange={(event) => updateItem(index, "articleName", event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <label className="text-xs font-medium text-muted-foreground">Cantidad<input type="number" min="1" value={item.expectedQuantity} onChange={(event) => updateItem(index, "expectedQuantity", Number(event.target.value))} className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <label className="text-xs font-medium text-muted-foreground">Unidad<input value={item.quantityUnit} onChange={(event) => updateItem(index, "quantityUnit", event.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <label className="text-xs font-medium text-muted-foreground">Orden<input type="number" min="1" value={item.order ?? ""} onChange={(event) => updateItem(index, "order", event.target.value ? Number(event.target.value) : undefined)} className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            </fieldset>
          ))}
        </div>
      ) : null}

      {state === "review" || state === "error" || state === "conflict" ? (
        <div className="px-5 py-5 sm:px-6"><h3 className="font-semibold">Revisión de cambios</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-3">Artículo</th><th className="py-3">Antes</th><th className="py-3">Nueva versión</th></tr></thead><tbody className="divide-y">{draft.map((item, index) => { const previous = value.items[index]; return <tr key={`${item.articleId}-${index}`}><td className="py-3"><p className="font-medium">{item.articleName}</p><p className="font-mono text-xs text-muted-foreground">{item.articleId}</p></td><td className="py-3 text-muted-foreground">{previous ? `${previous.expectedQuantity} ${previous.quantityUnit} · orden ${previous.order ?? "—"}` : "Nuevo"}</td><td className="py-3 font-medium">{item.expectedQuantity} {item.quantityUnit} · orden {item.order ?? "—"}</td></tr> })}</tbody></table></div></div>
      ) : null}

      {state !== "success" ? (
        <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {state === "edit" ? <Button type="button" className="min-h-11" disabled={!valid} onClick={() => setState("review")}>Revisar cambios</Button> : <><Button type="button" variant="ghost" className="min-h-11" onClick={() => setState("edit")}>Volver a editar</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setState("conflict")}><TriangleAlert className="size-4" aria-hidden="true" /> Simular conflicto</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setState("error")}><CircleAlert className="size-4" aria-hidden="true" /> Simular error</Button><Button type="button" className="min-h-11" disabled={!valid} onClick={confirmVersion}>Confirmar {targetLabel}</Button></>}
        </div>
      ) : <div className="flex justify-end border-t px-5 py-4 sm:px-6"><Button type="button" className="min-h-11" onClick={onClose}>Cerrar y ver versión actual</Button></div>}

      <p className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">Límite: no guarda datos, no crea validación técnica, API, auditoría ni persistencia real.</p>
    </section>
  )
}
