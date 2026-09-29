"use client"

import * as React from "react"
import { HelpCircle, Info, Sparkles, Command } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface InfoTooltipProps {
  /** Optional bold title displayed at top of tooltip */
  title?: string
  /** Main description or text content */
  description?: React.ReactNode
  /** Alternative alias for description or rich JSX content */
  content?: React.ReactNode
  /** Optional keyboard shortcuts list to render as styled kbd tags */
  shortcuts?: Array<{ key: string; label?: string }>
  /** Tooltip placement side */
  side?: "top" | "right" | "bottom" | "left"
  /** Tooltip alignment */
  align?: "start" | "center" | "end"
  /** Trigger icon style (default is "help" -> HelpCircle) */
  icon?: "help" | "info" | "sparkles" | "command" | React.ReactNode
  /** Trigger button size */
  size?: "xs" | "sm" | "md"
  /** Visual variant of trigger icon */
  variant?: "muted" | "primary" | "emerald" | "amber"
  /** Custom trigger element (replaces default icon button) */
  children?: React.ReactNode
  /** Delay before showing tooltip in ms */
  delayDuration?: number
  /** Additional CSS class for trigger */
  className?: string
  /** Additional CSS class for tooltip popover content */
  contentClassName?: string
  /** Max width of tooltip popover */
  maxWidth?: number | string
}

const ICON_SIZES = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
} as const

const BUTTON_SIZES = {
  xs: "size-4 text-[10px]",
  sm: "size-5 text-xs",
  md: "size-6 text-sm",
} as const

const VARIANTS = {
  muted: "text-muted-foreground/70 hover:text-foreground hover:bg-muted/80",
  primary: "text-primary/70 hover:text-primary hover:bg-primary/10",
  emerald: "text-emerald-600/70 hover:text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400/80",
  amber: "text-amber-600/70 hover:text-amber-600 hover:bg-amber-500/10 dark:text-amber-400/80",
} as const

export function InfoTooltip({
  title,
  description,
  content,
  shortcuts,
  side = "top",
  align = "center",
  icon = "help",
  size = "sm",
  variant = "muted",
  children,
  delayDuration = 120,
  className,
  contentClassName,
  maxWidth = 280,
}: InfoTooltipProps) {
  const bodyContent = content || description

  const renderIcon = () => {
    const iconSizeClass = ICON_SIZES[size] || ICON_SIZES.sm
    if (typeof icon !== "string") return icon
    switch (icon) {
      case "info":
        return <Info className={iconSizeClass} />
      case "sparkles":
        return <Sparkles className={iconSizeClass} />
      case "command":
        return <Command className={iconSizeClass} />
      case "help":
      default:
        return <HelpCircle className={iconSizeClass} />
    }
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ? (
            children
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-full transition-colors cursor-help shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                BUTTON_SIZES[size],
                VARIANTS[variant],
                className
              )}
              aria-label={title || "Más información"}
            >
              {renderIcon()}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          style={{ maxWidth }}
          className={cn(
            "p-2.5 text-xs shadow-md border bg-popover text-popover-foreground leading-relaxed animate-in fade-in-0 zoom-in-95",
            contentClassName
          )}
        >
          {title ? (
            <div className="font-semibold text-foreground mb-1 text-[11px] flex items-center gap-1.5">
              {title}
            </div>
          ) : null}

          {bodyContent ? (
            <div className="text-muted-foreground text-[11px] leading-relaxed">
              {bodyContent}
            </div>
          ) : null}

          {shortcuts && shortcuts.length > 0 ? (
            <div className="mt-2 pt-1.5 border-t border-border/60 flex flex-wrap items-center gap-1.5">
              {shortcuts.map((sc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 font-mono text-[9.5px] bg-muted/90 text-foreground px-1.5 py-0.5 rounded border border-border/80"
                >
                  <kbd className="font-bold">{sc.key}</kbd>
                  {sc.label ? <span className="text-muted-foreground font-sans text-[9px]">{sc.label}</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Super lightweight inline (?) help tooltip for input labels, table headers, and form fields.
 */
export function HelpTip({
  text,
  title,
  shortcuts,
  side = "top",
  className,
}: {
  text: React.ReactNode
  title?: string
  shortcuts?: Array<{ key: string; label?: string }>
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}) {
  return (
    <InfoTooltip
      title={title}
      description={text}
      shortcuts={shortcuts}
      size="xs"
      side={side}
      className={cn("ml-1 align-middle", className)}
    />
  )
}
