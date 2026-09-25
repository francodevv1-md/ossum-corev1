"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, AtSign, Check, CornerDownLeft, Sparkles, User, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { fetchMentionableUsers } from "@/lib/api/mentionable-users"
import type { MentionComposerValue, MentionLookupUser, MentionRef } from "@/lib/mentions/types"
import {
  collectAmbiguousRawMentions,
  collectResolvedMentions,
  findMentionTrigger,
  mergeMentionDirectory,
  replaceMentionTrigger,
} from "@/lib/mentions/utils"

type MentionComposerProps = {
  companyId?: string
  value: MentionComposerValue
  onChange: (value: MentionComposerValue) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  textareaClassName?: string
}

function uniqSuggestions(items: MentionLookupUser[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.companyId}:${item.userId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (name.slice(0, 2) || "U").toUpperCase()
}

const AVATAR_PALETTES = [
  { bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800" },
  { bg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800" },
  { bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" },
  { bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" },
  { bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" },
  { bg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800" },
]

function getAvatarStyle(idOrName: string) {
  let hash = 0
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

export const MentionComposer = forwardRef<HTMLTextAreaElement, MentionComposerProps>(function MentionComposer(
  { companyId, value, onChange, placeholder, disabled, className, textareaClassName },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const blurTimeoutRef = useRef<number | null>(null)
  const mentionDirectoryRef = useRef<MentionLookupUser[]>(mergeMentionDirectory([], value.mentions))
  const [trigger, setTrigger] = useState<ReturnType<typeof findMentionTrigger>>(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<MentionLookupUser[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, [])

  useEffect(() => {
    mentionDirectoryRef.current = mergeMentionDirectory(mentionDirectoryRef.current, value.mentions)
  }, [value.mentions])

  useEffect(() => {
    if (!companyId || !trigger) {
      setLoading(false)
      setSuggestions([])
      setActiveIndex(0)
      return
    }

    const query = trigger.query.trim()

    let cancelled = false
    setLoading(true)

    const timeoutId = window.setTimeout(async () => {
      try {
        const users = await fetchMentionableUsers(companyId, query)
        if (cancelled) return
        const merged = uniqSuggestions(mergeMentionDirectory(users, value.mentions))
        mentionDirectoryRef.current = uniqSuggestions(mergeMentionDirectory(mentionDirectoryRef.current, merged))
        setSuggestions(merged)
        setActiveIndex(0)
      } catch {
        if (cancelled) return
        setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [companyId, trigger, value.mentions])

  const showSuggestions = Boolean(trigger && companyId && (loading || suggestions.length > 0 || trigger.query.length >= 0))

  const mentionSummary = useMemo(() => value.mentions.map((mention) => mention.displayName), [value.mentions])
  const ambiguousMentions = useMemo(
    () => collectAmbiguousRawMentions(value.content, value.mentions, mentionDirectoryRef.current),
    [suggestions, value.content, value.mentions]
  )
  const ambiguousMentionLabel = ambiguousMentions[0] ? `@${ambiguousMentions[0].token}` : null

  function syncComposer(nextContent: string, caret: number) {
    const resolvedMentions = collectResolvedMentions(nextContent, mentionDirectoryRef.current)
    onChange({
      content: nextContent,
      mentions: resolvedMentions,
    })
    setTrigger(findMentionTrigger(nextContent, caret))
  }

  function handleSelectMention(mention: MentionRef) {
    if (!trigger || !textareaRef.current) return

    const replacement = replaceMentionTrigger(value.content, trigger, mention)
    mentionDirectoryRef.current = mergeMentionDirectory(mentionDirectoryRef.current, [mention])
    const nextMentions = collectResolvedMentions(replacement.content, mentionDirectoryRef.current)

    onChange({
      content: replacement.content,
      mentions: nextMentions,
    })

    setTrigger(null)
    setSuggestions([])
    setActiveIndex(0)

    window.requestAnimationFrame(() => {
      const element = textareaRef.current
      if (!element) return
      element.focus()
      element.setSelectionRange(replacement.caret, replacement.caret)
    })
  }

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={value.content}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => syncComposer(event.target.value, event.target.selectionStart ?? event.target.value.length)}
        onClick={(event) => setTrigger(findMentionTrigger(value.content, event.currentTarget.selectionStart ?? value.content.length))}
        onKeyUp={(event) => setTrigger(findMentionTrigger(value.content, event.currentTarget.selectionStart ?? value.content.length))}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => {
            setTrigger(null)
            setSuggestions([])
          }, 140)
        }}
        onFocus={(event) => setTrigger(findMentionTrigger(value.content, event.currentTarget.selectionStart ?? value.content.length))}
        onKeyDown={(event) => {
          if (!showSuggestions || suggestions.length === 0) return

          if (event.key === "ArrowDown") {
            event.preventDefault()
            setActiveIndex((current) => (current + 1) % suggestions.length)
            return
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
            return
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault()
            handleSelectMention(suggestions[activeIndex])
            return
          }

          if (event.key === "Escape") {
            setTrigger(null)
            setSuggestions([])
          }
        }}
        className={cn(
          "min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500",
          textareaClassName
        )}
      />

      <AnimatePresence>
        {showSuggestions ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl dark:border-slate-800 dark:bg-slate-950/95"
          >
            {/* Header bar with animated icon & shortcuts hint */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="flex size-4 items-center justify-center rounded-md bg-[var(--ossum-action)]/10 text-[var(--ossum-action)]">
                  <AtSign className="size-2.5" />
                </span>
                <span>{loading ? "Buscando usuarios..." : "Mencionar a alguien del equipo"}</span>
              </div>
              <div className="hidden items-center gap-1 text-[10px] text-slate-400 sm:flex">
                <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800">↑↓</kbd>
                <span>navegar</span>
                <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800">↵</kbd>
                <span>seleccionar</span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="size-3.5 animate-spin text-[var(--ossum-action)]" />
                  <span>Buscando</span>
                </div>
                {[0, 1].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-2.5 rounded-lg p-1.5">
                    <div className="size-7 rounded-full bg-slate-200/70 dark:bg-slate-800" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-800" />
                      <div className="h-2.5 w-36 rounded bg-slate-100 dark:bg-slate-850" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {suggestions.map((user, index) => {
                  const isSelected = index === activeIndex
                  const avatarStyle = getAvatarStyle(user.displayName || user.userId)
                  return (
                    <button
                      key={`${user.companyId}:${user.userId}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current)
                        handleSelectMention(user)
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150",
                        isSelected
                          ? "bg-[var(--ossum-action)] text-white shadow-xs"
                          : "hover:bg-slate-100/80 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/80"
                      )}
                    >
                      {/* Avatar with initials */}
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tracking-tight transition-transform duration-150 group-hover:scale-105",
                          isSelected
                            ? "border-white/30 bg-white/20 text-white"
                            : avatarStyle.bg
                        )}
                      >
                        {getUserInitials(user.displayName)}
                      </span>

                      {/* User Info */}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold">{user.displayName}</span>
                        </span>
                        <span
                          className={cn(
                            "block truncate text-[10px]",
                            isSelected ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                          )}
                        >
                          {user.email}
                        </span>
                      </span>

                      {/* Selection check indicator */}
                      {isSelected ? (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                        >
                          <Check className="size-3" />
                        </motion.span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <AtSign className="mb-1 size-5 text-slate-300 dark:text-slate-600" />
                <p>No se encontraron usuarios para esa mención.</p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Ambiguous Mentions Warning */}
      <AnimatePresence>
        {ambiguousMentions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 shadow-2xs"
            role="status"
          >
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {ambiguousMentions.length === 1
                ? `La mención ${ambiguousMentionLabel} es ambigua. Seleccioná una persona de la lista para mencionarla.`
                : `Hay ${ambiguousMentions.length} menciones ambiguas. Seleccioná una persona de la lista para mencionarla.`}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mentioned Pills Summary */}
      <AnimatePresence>
        {mentionSummary.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {mentionSummary.map((name) => (
              <motion.span
                key={name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--ossum-action)]/20 bg-[var(--ossum-action)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--ossum-action)] shadow-2xs dark:border-indigo-400/30 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <AtSign className="size-2.5" />
                {name}
              </motion.span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
})

