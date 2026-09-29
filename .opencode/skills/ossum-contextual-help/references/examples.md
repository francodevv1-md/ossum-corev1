# Usage Examples — OSSUM Contextual Help

---

## 1. Encabezado de Modal o Panel con Atajos de Teclado

```tsx
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { DialogTitle } from "@/components/ui/dialog"

export function WorkspaceHeader() {
  return (
    <div className="flex items-center gap-2">
      <DialogTitle className="text-base font-bold">
        Emisión de Factura Operativa
      </DialogTitle>
      
      <InfoTooltip
        title="Factura Operativa (DEV / Interna)"
        description="Carga ágil estilo planilla Excel con catálogo sincronizado y cálculo automático de IVA."
        shortcuts={[
          { key: "Tab / Enter", label: "Navegar celdas" },
          { key: "F2", label: "Buscar en catálogo" },
        ]}
        side="right"
      />
    </div>
  )
}
```

---

## 2. Etiqueta de Formulario con `HelpTip`

```tsx
import { Label } from "@/components/ui/label"
import { HelpTip } from "@/components/ui/info-tooltip"

export function FormFieldCliente() {
  return (
    <div className="space-y-1">
      <Label htmlFor="client-taxid" className="text-xs font-semibold flex items-center">
        CUIT / DNI
        <HelpTip
          title="Identificación Fiscal"
          text="Ingresá 11 dígitos para personas jurídicas o DNI para consumidores finales."
          side="top"
        />
      </Label>
      <input id="client-taxid" className="..." />
    </div>
  )
}
```

---

## 3. Encabezado de Columna en Tabla Densa

```tsx
import { HelpTip } from "@/components/ui/info-tooltip"

export function TableHeaders() {
  return (
    <thead>
      <tr>
        <th className="px-2 py-1.5 text-left">Código</th>
        <th className="px-2 py-1.5 text-left">Descripción</th>
        <th className="px-2 py-1.5 text-left">
          Lote
          <HelpTip text="Requerido únicamente para implantes y prótesis trazables por ANMAT." />
        </th>
        <th className="px-2 py-1.5 text-right">Cant.</th>
      </tr>
    </thead>
  )
}
```

---

## 4. Botón con Disparador Personalizado (Custom Children)

```tsx
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function AiAssistButton() {
  return (
    <InfoTooltip
      title="Extracción Asistida por IA"
      description="Analiza el texto o correo pegado para completar automáticamente paciente, médico y productos."
      side="bottom"
    >
      <Button variant="outline" size="sm" className="gap-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span>Autocompletar</span>
      </Button>
    </InfoTooltip>
  )
}
```
