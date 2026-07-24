"use client"

/**
 * MaterialAutorizadoDetails — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-03)
 *
 * Pure presentational wrapper around the existing flat `material_autorizado`
 * array. Renders the list inside a native `<details>`/`<summary>` region with
 * the detected item count in the summary line. Collapsed by default.
 *
 * Constraints (DESIGN §4.2/§7.3):
 * - No grouping by Implantes/Instrumental (requires a `categoria` field → Phase B).
 * - No new dependency (native `<details>`, no Radix/shadcn Accordion).
 * - Per-item rendering moved verbatim from AiResultsPanel.tsx L180-202:
 *   code Badge, catalog Badge ("En catálogo" / "No en catálogo"),
 *   description, cantidad, precio ref.
 * - Emerald/secondary design tokens only — no mockup hex values (AC-07).
 * - Does NOT edit `autorizacion-ai.ts`; imports the type read-only.
 */

import { ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getCatalogByCode } from "@/data/mock-catalog"
import type { MaterialAutorizadoItem } from "@/lib/validators/autorizacion-ai"

export type MaterialAutorizadoDetailsProps = {
  items: MaterialAutorizadoItem[]
}

export function MaterialAutorizadoDetails({ items }: MaterialAutorizadoDetailsProps) {
  const count = items.length

  // Empty case: flat (non-collapsible) summary + the existing empty message.
  // No <details> element when there is nothing to expand (DESIGN §4.2).
  if (count === 0) {
    return (
      <section className="space-y-2 rounded-lg border p-3">
        <h4 className="text-sm font-medium">Material autorizado (0 ítems detectados)</h4>
        <p className="text-sm text-muted-foreground">No se detectó material autorizado.</p>
      </section>
    )
  }

  return (
    <section className="space-y-2 rounded-lg border p-3">
      <details
        className="group [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden"
        // Collapsed by default — no `open` attribute (DESIGN §4.2/§6.3).
      >
        <summary className="flex cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          Material autorizado ({count} ítems detectados)
        </summary>
        <div className="mt-2 space-y-2">
          {items.map((item, index) => {
            const catalogMatch = item.codigo ? getCatalogByCode(item.codigo) : undefined
            return (
              <div
                key={`${item.codigo || "item"}-${index}`}
                className="rounded-md bg-muted/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.codigo || "Sin código"}</Badge>
                  {catalogMatch ? (
                    <Badge variant="success" className="text-[10px]">En catálogo</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">No en catálogo</Badge>
                  )}
                  <span className="font-medium">{item.descripcion || "Sin descripción"}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-muted-foreground">
                  <span>Cantidad: {item.cantidad || "—"}</span>
                  <span>Precio ref.: {item.precio_referencia || "—"}</span>
                </div>
              </div>
            )
          })}
        </div>
      </details>
    </section>
  )
}
