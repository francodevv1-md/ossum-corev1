import { render, screen } from "@testing-library/react"
import { Package } from "lucide-react"
import { describe, expect, it } from "vitest"

import { FamilyThumb, STOCK_COLUMN_BY_KEY } from "@/components/stock/StockColumns"
import { FAMILY_STYLE, getFamilyStyle, STOCK_ITEMS } from "@/data/stock-mock"

describe("Stock family presentation", () => {
  it.each(["Trauma · Clavos", "Artroscopia · LCA", "Componente ficticio de caja"])("renders the canonical article family %s without crashing", (family) => {
    const item = { ...STOCK_ITEMS[0], family }

    render(<><FamilyThumb item={item} />{STOCK_COLUMN_BY_KEY.family.render(item)}</>)

    expect(screen.getByTitle(family)).toBeInTheDocument()
    expect(screen.getByText(family)).toBeInTheDocument()
  })

  it("uses an explicit neutral label when family is empty", () => {
    expect(getFamilyStyle("").label).toBe("Sin familia")
  })

  it("inherits known hierarchical styles and uses the neutral style only for unknown families", () => {
    expect(getFamilyStyle("Trauma")).toBe(FAMILY_STYLE.Trauma)
    expect(getFamilyStyle("Trauma · Clavos")).toMatchObject({
      icon: FAMILY_STYLE.Trauma.icon,
      thumb: FAMILY_STYLE.Trauma.thumb,
      label: "Trauma · Clavos",
    })
    expect(getFamilyStyle("Artroscopia · LCA")).toMatchObject({
      icon: Package,
      thumb: "bg-gray-50 text-gray-600 ring-gray-200",
      label: "Artroscopia · LCA",
    })
  })
})
