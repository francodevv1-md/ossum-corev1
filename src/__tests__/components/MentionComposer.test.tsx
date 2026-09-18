import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MentionComposer } from "@/components/shared/mentions/MentionComposer"

const { fetchMentionableUsersMock } = vi.hoisted(() => ({
  fetchMentionableUsersMock: vi.fn(),
}))

vi.mock("@/lib/api/mentionable-users", () => ({
  fetchMentionableUsers: fetchMentionableUsersMock,
}))

describe("MentionComposer", () => {
  beforeEach(() => {
    fetchMentionableUsersMock.mockReset()
    fetchMentionableUsersMock.mockImplementation(async (_companyId: string, query: string) => {
      if (query === "ana") {
        return [
          {
            userId: "user-1",
            displayName: "Ana Pérez",
            companyId: "company-1",
            email: "ana1@test.com",
          },
          {
            userId: "user-3",
            displayName: "Ana Gómez",
            companyId: "company-1",
            email: "ana2@test.com",
          },
        ]
      }

      return [
        {
          userId: "user-1",
          displayName: "Ana Pérez",
          companyId: "company-1",
          email: "ana@test.com",
        },
        {
          userId: "user-2",
          displayName: "Luis Test",
          companyId: "company-1",
          email: "luis@test.com",
        },
      ]
    })
  })

  it("opens autosuggest on @ and returns structured mentions after keyboard selection", async () => {
    const onChange = vi.fn()

    function Wrapper() {
      const [value, setValue] = React.useState({ content: "", mentions: [] as Array<{ userId: string; displayName: string; companyId: string }> })
      return (
        <MentionComposer
          companyId="company-1"
          value={value}
          onChange={(next) => {
            setValue(next)
            onChange(next)
          }}
          placeholder="Escribí"
        />
      )
    }

    render(<Wrapper />)

    const textarea = screen.getByPlaceholderText("Escribí")
    fireEvent.change(textarea, { target: { value: "@" } })

    await waitFor(() => expect(fetchMentionableUsersMock).toHaveBeenCalledWith("company-1", ""))
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument()

    fireEvent.keyDown(textarea, { key: "Enter" })

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({
        content: "@Ana Pérez ",
        mentions: [{ userId: "user-1", displayName: "Ana Pérez", companyId: "company-1" }],
      })
    })
  })

  it("supports multiple mentions and leaves unresolved @text as plain text", async () => {
    function Wrapper() {
      const [value, setValue] = React.useState({ content: "", mentions: [] as Array<{ userId: string; displayName: string; companyId: string }> })
      return (
        <>
          <MentionComposer companyId="company-1" value={value} onChange={setValue} placeholder="Seguimiento" />
          <pre data-testid="state">{JSON.stringify(value)}</pre>
        </>
      )
    }

    render(<Wrapper />)

    const textarea = screen.getByPlaceholderText("Seguimiento")

    fireEvent.change(textarea, { target: { value: "@an" } })
    await screen.findByText("Ana Pérez")
    fireEvent.keyDown(textarea, { key: "Enter" })

    fireEvent.change(textarea, { target: { value: "@Ana Pérez coordina con @lu" } })
    await waitFor(() => expect(fetchMentionableUsersMock).toHaveBeenCalledWith("company-1", "lu"))
    fireEvent.keyDown(textarea, { key: "ArrowDown" })
    fireEvent.keyDown(textarea, { key: "Enter" })

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toContain('"mentions":[{"userId":"user-1"')
      expect(screen.getByTestId("state").textContent).toContain('"userId":"user-2"')
    })

    fireEvent.change(textarea, { target: { value: "Texto con @nadie sin resolver" } })

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe(
        JSON.stringify({ content: "Texto con @nadie sin resolver", mentions: [] })
      )
    })
  })

  it("shows an ambiguity hint only for exact ambiguous raw mentions", async () => {
    function Wrapper() {
      const [value, setValue] = React.useState({ content: "", mentions: [] as Array<{ userId: string; displayName: string; companyId: string }> })
      return <MentionComposer companyId="company-1" value={value} onChange={setValue} placeholder="Ambigüedad" />
    }

    render(<Wrapper />)

    const textarea = screen.getByPlaceholderText("Ambigüedad")

    fireEvent.change(textarea, { target: { value: "@an" } })
    await waitFor(() => expect(fetchMentionableUsersMock).toHaveBeenCalledWith("company-1", "an"))
    expect(screen.queryByText(/La mención @an es ambigua/i)).not.toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: "@ana" } })

    await waitFor(() => expect(fetchMentionableUsersMock).toHaveBeenCalledWith("company-1", "ana"))
    expect(await screen.findByText(/La mención @ana es ambigua/i)).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("Ana Gómez")).toBeInTheDocument()
  })
})
