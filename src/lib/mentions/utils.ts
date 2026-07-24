import type { MentionLookupUser, MentionRef } from "@/lib/mentions/types"

export type MentionTriggerMatch = {
  start: number
  end: number
  query: string
}

export type AmbiguousMentionMatch = {
  token: string
  matches: MentionRef[]
}

const MAX_MENTION_QUERY_LENGTH = 40

function normalizeMentionSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function isBoundaryCharacter(value: string | undefined) {
  if (!value) return true
  return !/[\p{L}\p{N}_]/u.test(value)
}

export function buildMentionLabel(displayName: string) {
  return `@${displayName.trim()}`
}

export function findMentionTrigger(content: string, caret: number): MentionTriggerMatch | null {
  const safeCaret = Math.max(0, Math.min(caret, content.length))
  const beforeCaret = content.slice(0, safeCaret)
  const triggerStart = beforeCaret.lastIndexOf("@")

  if (triggerStart < 0) return null
  if (!isBoundaryCharacter(content[triggerStart - 1])) return null

  const query = content.slice(triggerStart + 1, safeCaret)
  if (query.length > MAX_MENTION_QUERY_LENGTH) return null
  if (/\s/.test(query)) return null

  const nextWhitespace = content.slice(safeCaret).search(/\s/)
  const tokenEnd = nextWhitespace === -1 ? content.length : safeCaret + nextWhitespace
  const fullToken = content.slice(triggerStart + 1, tokenEnd)

  if (fullToken.includes("@")) return null

  return {
    start: triggerStart,
    end: safeCaret,
    query,
  }
}

export function replaceMentionTrigger(content: string, trigger: MentionTriggerMatch, mention: MentionRef) {
  const rawLabel = buildMentionLabel(mention.displayName)
  const nextSlice = content.slice(trigger.end)
  const needsTrailingSpace = nextSlice.length > 0 ? !/^\s/.test(nextSlice) : true
  const label = needsTrailingSpace ? `${rawLabel} ` : rawLabel
  const nextContent = `${content.slice(0, trigger.start)}${label}${nextSlice}`
  const caret = trigger.start + label.length

  return {
    content: nextContent,
    caret,
  }
}

function contentIncludesMentionLabel(content: string, label: string) {
  let searchFrom = 0

  while (searchFrom < content.length) {
    const index = content.indexOf(label, searchFrom)
    if (index === -1) return false

    const end = index + label.length
    if (isBoundaryCharacter(content[index - 1]) && isBoundaryCharacter(content[end])) {
      return true
    }

    searchFrom = index + 1
  }

  return false
}

function collectMentionLabelRanges(content: string, mentions: MentionRef[]) {
  const ranges: Array<{ start: number; end: number }> = []

  mentions.forEach((mention) => {
    const label = buildMentionLabel(mention.displayName)
    let searchFrom = 0

    while (searchFrom < content.length) {
      const index = content.indexOf(label, searchFrom)
      if (index === -1) return

      const end = index + label.length
      if (isBoundaryCharacter(content[index - 1]) && isBoundaryCharacter(content[end])) {
        ranges.push({ start: index, end })
      }

      searchFrom = index + 1
    }
  })

  return ranges
}

function collectRawMentionTokens(content: string, occupiedRanges: Array<{ start: number; end: number }>) {
  const matches = Array.from(content.matchAll(/@([^\s@]{1,40})/gu))

  return matches
    .map((match) => {
      const index = match.index ?? -1
      const token = match[1] ?? ""
      const end = index + token.length + 1

      if (index < 0) return null
      if (!isBoundaryCharacter(content[index - 1])) return null
      if (!isBoundaryCharacter(content[end])) return null
      if (occupiedRanges.some((range) => index >= range.start && index < range.end)) return null

      return {
        token,
        normalizedToken: normalizeMentionSearchText(token),
      }
    })
    .filter((value): value is { token: string; normalizedToken: string } => {
      return value !== null && value.normalizedToken.length > 0
    })
}

function buildMentionLookupKeys(user: MentionLookupUser) {
  const parts = user.displayName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ""
  const lastName = parts.length > 1 ? parts[parts.length - 1] : ""

  return new Set(
    [user.displayName, firstName, lastName]
      .map((value) => normalizeMentionSearchText(value))
      .filter(Boolean)
  )
}

function findRawMentionMatches(normalizedToken: string, directory: MentionLookupUser[]) {
  return directory
    .filter((user) => buildMentionLookupKeys(user).has(normalizedToken))
    .reduce<MentionRef[]>((unique, user) => {
      if (unique.some((match) => match.userId === user.userId && match.companyId === user.companyId)) {
        return unique
      }

      unique.push({
        userId: user.userId,
        displayName: user.displayName,
        companyId: user.companyId,
      })

      return unique
    }, [])
}

export function collectResolvedMentions(content: string, knownMentions: MentionRef[]) {
  const unique = new Map<string, MentionRef>()

  knownMentions.forEach((mention) => {
    const label = buildMentionLabel(mention.displayName)
    if (contentIncludesMentionLabel(content, label)) {
      unique.set(`${mention.companyId}:${mention.userId}`, {
        userId: mention.userId,
        displayName: mention.displayName,
        companyId: mention.companyId,
      })
    }
  })

  return Array.from(unique.values())
}

export function resolveRawMentionFallbacks(
  content: string,
  knownMentions: MentionRef[],
  directory: MentionLookupUser[]
) {
  const occupiedRanges = collectMentionLabelRanges(content, knownMentions)
  const rawTokens = collectRawMentionTokens(content, occupiedRanges)
  const knownMentionUserIds = new Set(knownMentions.map((mention) => mention.userId))
  const fallbackMentions = new Map<string, MentionRef>()

  rawTokens.forEach(({ normalizedToken }) => {
    const matches = findRawMentionMatches(normalizedToken, directory)

    if (matches.length !== 1) return

    const match = matches[0]
    if (knownMentionUserIds.has(match.userId)) return

    fallbackMentions.set(match.userId, {
      userId: match.userId,
      displayName: match.displayName,
      companyId: match.companyId,
    })
  })

  return Array.from(fallbackMentions.values())
}

export function collectAmbiguousRawMentions(
  content: string,
  knownMentions: MentionRef[],
  directory: MentionLookupUser[]
): AmbiguousMentionMatch[] {
  const occupiedRanges = collectMentionLabelRanges(content, knownMentions)
  const rawTokens = collectRawMentionTokens(content, occupiedRanges)
  const ambiguousMentions = new Map<string, AmbiguousMentionMatch>()

  rawTokens.forEach(({ token, normalizedToken }) => {
    const matches = findRawMentionMatches(normalizedToken, directory)

    if (matches.length <= 1) return

    ambiguousMentions.set(normalizedToken, {
      token,
      matches,
    })
  })

  return Array.from(ambiguousMentions.values())
}

export function mergeMentionDirectory(
  directory: MentionLookupUser[],
  mentions: MentionRef[]
): MentionLookupUser[] {
  const next = new Map(directory.map((mention) => [`${mention.companyId}:${mention.userId}`, mention]))

  mentions.forEach((mention) => {
    const key = `${mention.companyId}:${mention.userId}`
    if (!next.has(key)) {
      next.set(key, {
        ...mention,
        email: "",
      })
    }
  })

  return Array.from(next.values())
}
