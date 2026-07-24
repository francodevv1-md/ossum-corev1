import { describe, expect, it } from "vitest"
import {
  collectAmbiguousRawMentions,
  collectResolvedMentions,
  findMentionTrigger,
  replaceMentionTrigger,
  resolveRawMentionFallbacks,
} from "@/lib/mentions/utils"

describe("mentions utils", () => {
  it("detects an active @ trigger at the caret", () => {
    expect(findMentionTrigger("Coordinar con @an", "Coordinar con @an".length)).toEqual({
      start: 14,
      end: 17,
      query: "an",
    })
  })

  it("replaces the trigger with the selected display name", () => {
    expect(
      replaceMentionTrigger(
        "Avisar a @an hoy",
        { start: 9, end: 12, query: "an" },
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1" }
      )
    ).toEqual({
      content: "Avisar a @Ana Pérez hoy",
      caret: 19,
    })
  })

  it("keeps only resolved mentions present in content", () => {
    const mentions = collectResolvedMentions("@Ana Pérez coordina con @Luis Test", [
      { userId: "u1", displayName: "Ana Pérez", companyId: "c1" },
      { userId: "u2", displayName: "Luis Test", companyId: "c1" },
      { userId: "u3", displayName: "No Existe", companyId: "c1" },
    ])

    expect(mentions).toEqual([
      { userId: "u1", displayName: "Ana Pérez", companyId: "c1" },
      { userId: "u2", displayName: "Luis Test", companyId: "c1" },
    ])
  })

  it("resolves a unique raw mention token against active directory users", () => {
    expect(
      resolveRawMentionFallbacks("Avisar a @ana hoy", [], [
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1", email: "ana@test.com" },
        { userId: "u2", displayName: "Luis Test", companyId: "c1", email: "luis@test.com" },
      ])
    ).toEqual([{ userId: "u1", displayName: "Ana Pérez", companyId: "c1" }])
  })

  it("ignores duplicate raw mention matches", () => {
    expect(
      resolveRawMentionFallbacks("Avisar a @ana hoy", [], [
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1", email: "ana1@test.com" },
        { userId: "u2", displayName: "Ana Gómez", companyId: "c1", email: "ana2@test.com" },
      ])
    ).toEqual([])
  })

  it("detects ambiguous raw mention tokens with multiple exact matches", () => {
    expect(
      collectAmbiguousRawMentions("Avisar a @ana hoy", [], [
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1", email: "ana1@test.com" },
        { userId: "u2", displayName: "Ana Gómez", companyId: "c1", email: "ana2@test.com" },
      ])
    ).toEqual([
      {
        token: "ana",
        matches: [
          { userId: "u1", displayName: "Ana Pérez", companyId: "c1" },
          { userId: "u2", displayName: "Ana Gómez", companyId: "c1" },
        ],
      },
    ])
  })

  it("ignores partial raw mention tokens", () => {
    expect(
      resolveRawMentionFallbacks("Avisar a @an hoy", [], [
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1", email: "ana@test.com" },
      ])
    ).toEqual([])
  })

  it("does not report ambiguity for partial raw mention tokens", () => {
    expect(
      collectAmbiguousRawMentions("Avisar a @an hoy", [], [
        { userId: "u1", displayName: "Ana Pérez", companyId: "c1", email: "ana1@test.com" },
        { userId: "u2", displayName: "Ana Gómez", companyId: "c1", email: "ana2@test.com" },
      ])
    ).toEqual([])
  })
})
