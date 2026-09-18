export type MentionRef = {
  userId: string
  displayName: string
  companyId: string
}

export type MentionLookupUser = MentionRef & {
  email: string
  role?: string
}

export type MentionComposerValue = {
  content: string
  mentions: MentionRef[]
}
