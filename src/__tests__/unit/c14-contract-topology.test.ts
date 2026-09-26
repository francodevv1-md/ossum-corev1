import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SCANNER_INPUT_V2 } from "@/lib/services/c14/scanner-input-v2"
import { WRITER_REGISTRY_V4 } from "@/lib/services/c14/writer-registry-v4"

const root = process.cwd()
const relations: Record<string, string> = {
  "ISW-CX03-01": "public.StockIdentifiedUnitConfigurationVersion",
  "ISW-CX07-01": "public.StockEvidence",
  "ISW-CX11-01": "public.cajas_reservation_correlation",
  "ISW-CX11-02": "public.cajas_control",
  "ISW-CX11-03": "public.cajas_control_line",
  "ISW-CX12-01": "public.cajas_composition_change",
  "ISW-CX12-02": "public.cajas_composition_change_line",
  "ISW-CX12-03": "public.cajas_difference",
  "ISW-CX12-04": "public.cajas_difference_resolution",
  "ISW-CX12-05": "public.cajas_dispatch",
  "ISW-CX12-06": "public.cajas_return_confirmation",
  "ISW-CX12-07": "public.cajas_return_line",
  "ISW-CX12-08": "public.cajas_replacement_pair",
  "ISW-CX12-09": "public.cajas_consumption_confirmation",
  "ISW-CX12-10": "public.cajas_consumption_line",
  "ISW-CX08-01": "public.StockReservation",
  "ISW-CX08-02": "public.StockReservationEvidence",
  "ISW-CX06-01": "public.OperationalCommandEffect",
}

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name)
  return entry.isDirectory() ? sourceFiles(path) : path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : []
})

describe("C14 inert contract-owner topology", () => {
  it("materializes the exact registry/scanner identities in 18 service/validator pairs", () => {
    expect(WRITER_REGISTRY_V4.contractBindings).toHaveLength(18)
    expect(SCANNER_INPUT_V2.nonRouteContractOwnerEntryPoints).toEqual(WRITER_REGISTRY_V4.contractBindings.map(binding => binding.publicCommandOwnerEntryPoint))

    for (const binding of WRITER_REGISTRY_V4.contractBindings) {
      const servicePath = binding.publicCommandOwnerEntryPoint.replace("#execute", "")
      const validatorPath = servicePath.replace("/services/", "/validators/")
      const identity = { contractId: binding.contractId, physicalRelation: relations[binding.contractId], allowedBundleIds: [...binding.allowedBundleIds], contractRowSha256: binding.contractRowSha256 }
      const service = readFileSync(join(root, servicePath), "utf8")
      const validator = readFileSync(join(root, validatorPath), "utf8")

      for (const [key, value] of Object.entries(identity)) expect(service).toContain(Array.isArray(value) ? `${key}: ${JSON.stringify(value).replaceAll(",", ", ")}` : `${key}: ${JSON.stringify(value)}`)
      expect(validator.replace("validate", "execute")).toBe(service)
      expect(service).not.toMatch(/\b(rowWriter|INSERT|UPDATE|DELETE|createMany|executeRaw|queryRaw)\b/)
      expect(binding.publicCommandOwnerEntryPoint).toBe(`${servicePath}#execute`)
    }
  })

  it("has no production importers or owner-to-owner edges", () => {
    const importPattern = /(?:from\s+|import\s*\()["'][^"']*insert-serialization\/isw-cx/i
    const importers = sourceFiles(join(root, "src")).filter(path => !path.includes("__tests__") && importPattern.test(readFileSync(path, "utf8")))
    expect(importers).toEqual([])
  })
})
