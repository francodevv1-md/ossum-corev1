import React from "react"
import { createRoot } from "react-dom/client"
import { CirugiaStatusCell } from "@/components/cirugias/CirugiaStatusCell"
import { MobileCirugiaCard } from "@/components/cirugias/MobileCirugiaCard"
import { ALL_STATES, getCxStateVisual } from "@/lib/cirugias.constants"
import type { Surgery } from "@/types"
import "@/app/globals.css"

const datedStates = ALL_STATES.map((state, i) => ({
  id: `palette-${i}`, visibleNumber: `CX-${i}`, state, date: "2026-10-07", time: "08:00",
  patient: "Synthetic QA", institution: "Test institution", client: "Test client",
  surgeon: "Test doctor", classification: "Otro", preparationState: "Sin preparar", urgente: false,
} as Surgery))
const cases = [...datedStates, ...datedStates.slice(1, 3).map(s => ({ ...s, id: `${s.id}-undated`, date: "" }))]
const noop = () => {}

createRoot(document.getElementById("root")!).render(
  <main className="p-3 text-slate-900 dark:text-slate-100">
    <h1 className="mb-3 text-sm font-semibold">Surgery palette — synthetic component QA</h1>
    <div className="hidden sm:block">
      <table className="w-full text-xs"><thead><tr><th>State</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
        <tbody>{cases.map(s => <tr key={s.id} data-case={s.id}
          style={{ backgroundColor: document.documentElement.classList.contains("dark")
            ? getCxStateVisual(s.state, s.date).darkRowTint : getCxStateVisual(s.state, s.date).rowTint }}>
          <td className="px-2 py-2">{s.state}{!s.date && " (undated)"}</td>
          {(["a", "b", "c", "d"] as const).map(variant => <CirugiaStatusCell key={variant} state={s.state} date={s.date} variant={variant} />)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="space-y-2 sm:hidden">{cases.map(s => <div key={s.id} data-case={s.id}>
      <MobileCirugiaCard surgery={s} onOpen={noop} onOpenActions={noop} />
    </div>)}</div>
  </main>
)
