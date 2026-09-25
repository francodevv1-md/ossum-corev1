"use client"

import React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── FormSection: Card container with icon, title, and clean structure ───
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  badge?: React.ReactNode
  children: React.ReactNode
}

export function FormSection({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Icon className="size-3.5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

// ─── SegmentedControl: Smooth tab/switch with framer-motion pill ───
interface SegmentedOption<T extends string = string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  name?: string
  className?: string
  size?: "sm" | "md"
}

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  name,
  className,
  size = "sm",
}: SegmentedControlProps<T>) {
  const layoutId = React.useId()

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        "inline-flex p-1 rounded-lg border border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/80 select-none shadow-inner",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        const OptionIcon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 font-medium transition-colors z-10",
              size === "sm" ? "px-3 py-1 text-xs rounded-md" : "px-4 py-1.5 text-sm rounded-md",
              isSelected
                ? "text-slate-900 font-semibold dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`segmented-active-pill-${layoutId}`}
                className="absolute inset-0 rounded-md bg-white shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            {OptionIcon && <OptionIcon className="relative z-10 size-3.5" />}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── SelectionCard: Interactive selectable card (Roles, Plans, Categories) ───
interface SelectionCardProps {
  selected: boolean
  onClick: () => void
  title: string
  description?: string
  icon?: LucideIcon
  badge?: string
  className?: string
}

export function SelectionCard({
  selected,
  onClick,
  title,
  description,
  icon: Icon,
  badge,
  className,
}: SelectionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer select-none",
        selected
          ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs dark:border-blue-500 dark:bg-blue-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
            selected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300"
          )}
        >
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </p>
          {badge && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
