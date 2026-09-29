# Component Contract — InfoTooltip & HelpTip

Source: `src/components/ui/info-tooltip.tsx`

---

## 1. `InfoTooltip` Props

```typescript
export interface InfoTooltipProps {
  /** Título en negrita destacado en la cabecera del tooltip */
  title?: string
  /** Descripción o cuerpo de texto principal */
  description?: React.ReactNode
  /** Alias para contenido JSX enriquecido */
  content?: React.ReactNode
  /** Lista de atajos de teclado para renderizar como etiquetas <kbd> */
  shortcuts?: Array<{ key: string; label?: string }>
  /** Ubicación del tooltip respecto al disparador */
  side?: "top" | "right" | "bottom" | "left" // Default: "top"
  /** Alineación del tooltip */
  align?: "start" | "center" | "end" // Default: "center"
  /** Icono del disparador */
  icon?: "help" | "info" | "sparkles" | "command" | React.ReactNode // Default: "help"
  /** Tamaño del botón disparador */
  size?: "xs" | "sm" | "md" // Default: "sm"
  /** Variante de color del disparador */
  variant?: "muted" | "primary" | "emerald" | "amber" // Default: "muted"
  /** Disparador personalizado opcional */
  children?: React.ReactNode
  /** Retardo en milisegundos antes de mostrar el tooltip */
  delayDuration?: number // Default: 120
  /** Clase CSS adicional para el botón disparador */
  className?: string
  /** Clase CSS adicional para el contenedor del tooltip */
  contentClassName?: string
  /** Ancho máximo en px o string */
  maxWidth?: number | string // Default: 280
}
```

---

## 2. `HelpTip` Props

```typescript
export interface HelpTipProps {
  /** Texto o contenido de la ayuda */
  text: React.ReactNode
  /** Título opcional en negrita */
  title?: string
  /** Lista de atajos de teclado */
  shortcuts?: Array<{ key: string; label?: string }>
  /** Ubicación del tooltip */
  side?: "top" | "right" | "bottom" | "left" // Default: "top"
  /** Clase CSS adicional */
  className?: string
}
```

`HelpTip` es un envoltorio directo sobre `InfoTooltip` con `size="xs"` y clase `ml-1 align-middle`.
