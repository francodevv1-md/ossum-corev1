"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Loader2, AtSign } from "lucide-react"
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
          }, 120)
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
        className={cn("min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500", textareaClassName)}
      />

      {showSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {loading ? "Buscando usuarios..." : "Mencionar a alguien del equipo"}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Buscando
            </div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-64 overflow-y-auto p-1">
              {suggestions.map((user, index) => (
                <button
                  key={`${user.companyId}:${user.userId}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current)
                    handleSelectMention(user)
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    index === activeIndex ? "bg-slate-900 text-white dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"
                  )}
                >
                  <span className={cn("mt-0.5 rounded-full p-1", index === activeIndex ? "bg-white/15" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                    <AtSign className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.displayName}</span>
                    <span className={cn("block truncate text-[11px]", index === activeIndex ? "text-slate-200" : "text-slate-500 dark:text-slate-400")}>{user.email}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No se encontraron usuarios para esa mención.</div>
          )}
        </div>
      ) : null}

      {ambiguousMentions.length > 0 ? (
        <div
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          role="status"
        >
          {ambiguousMentions.length === 1
            ? `La mención ${ambiguousMentionLabel} es ambigua. Seleccioná una persona de la lista para mencionarla.`
            : `Hay ${ambiguousMentions.length} menciones ambiguas. Seleccioná una persona de la lista para mencionarla.`}
        </div>
      ) : null}

      {mentionSummary.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mentionSummary.map((name) => (
            <span key={name} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              @{name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
})
