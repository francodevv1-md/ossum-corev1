import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SCANNER_INPUT_V2, ZERO_SCANNER_VIOLATIONS } from "@/lib/services/c14/scanner-input-v2"
import { WRITER_REGISTRY_V4 } from "@/lib/services/c14/writer-registry-v4"

const root = process.cwd()
const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name)
  return entry.isDirectory() ? sourceFiles(path) : path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : []
})

describe("C14 inert bundle-owner topology", () => {
  it("materializes exact RegistryV4/ScannerInputV2 identities in 11 service/validator pairs", () => {
    expect(WRITER_REGISTRY_V4.bundleBindings).toHaveLength(11)
    expect(SCANNER_INPUT_V2.routeEligibleBundleEntryPoints).toEqual(WRITER_REGISTRY_V4.bundleBindings.map(binding => binding.publicCommandEntryPoint))

    for (const binding of WRITER_REGISTRY_V4.bundleBindings) {
      const servicePath = binding.publicCommandEntryPoint.replace("#execute", "")
      const validatorPath = servicePath.replace("/services/", "/validators/")
      const service = readFileSync(join(root, servicePath), "utf8")
      const validator = readFileSync(join(root, validatorPath), "utf8")

      for (const [key, value] of Object.entries(binding).filter(([key]) => key !== "publicCommandEntryPoint")) {
        expect(service).toContain(Array.isArray(value) ? `${key}: ${JSON.stringify(value).replaceAll(",", ", ")}` : `${key}: ${JSON.stringify(value)}`)
      }
      if (binding.bundleId !== "WCB-06") expect(validator.replace("validate", "execute")).toBe(service)
      else expect(validator).not.toMatch(/Prisma\.TransactionClient|wcb06Runtime|\.(create|update|delete)\(/)
      if (binding.bundleId !== "WCB-06") expect(service).not.toMatch(/\b(rowWriter|INSERT|UPDATE|DELETE|create|createMany|upsert|executeRaw|queryRaw|\$transaction)\b/)
    }
  })

  it("keeps only WCB-06 as an activation candidate without runtime or DML", () => {
    const states = WRITER_REGISTRY_V4.bundleBindings.map(binding => {
      const source = readFileSync(join(root, binding.publicCommandEntryPoint.replace("#execute", "")), "utf8")
      return [binding.bundleId, source.includes('productState: "ACTIVATION_CANDIDATE"') ? "ACTIVATION_CANDIDATE" : "INERT"]
    })
    expect(states).toEqual(WRITER_REGISTRY_V4.bundleBindings.map(binding => [binding.bundleId, binding.bundleId === "WCB-06" ? "ACTIVATION_CANDIDATE" : "INERT"]))
  })

  it("proves canonical 11/18/21/29 topology and zero bypass/import/DML violations", () => {
    const production = sourceFiles(join(root, "src")).filter(path => !path.includes("__tests__"))
    const ownerImport = /(?:from\s+|import\s*\()["'][^"']*(?:c14\/bundles\/wcb-|c14\/insert-serialization\/isw-cx)/i
    const dml = /\b(?:INSERT|UPDATE|DELETE)\b|\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(|\$(?:executeRaw|queryRaw)/

    expect(WRITER_REGISTRY_V4.bundleCount).toBe(11)
    expect(WRITER_REGISTRY_V4.contractCount).toBe(18)
    expect(WRITER_REGISTRY_V4.privateContractWriterCount + WRITER_REGISTRY_V4.guardedWriterCount).toBe(21)
    expect(SCANNER_INPUT_V2.routeEligibleBundleEntryPoints.length + SCANNER_INPUT_V2.nonRouteContractOwnerEntryPoints.length).toBe(29)
    expect(production.filter(path => !path.endsWith("private-writer-runtime.ts") && !path.endsWith("wcb-06.ts") && ownerImport.test(readFileSync(path, "utf8")))).toEqual([
      join(root, "src", "lib", "services", "remito.service.ts"),
    ])
    expect(production.filter(path => path.includes(`${join("c14", "bundles", "wcb-")}`) && !path.endsWith("wcb-06.ts") && dml.test(readFileSync(path, "utf8")))).toEqual([])
    expect(ZERO_SCANNER_VIOLATIONS).toEqual(Object.fromEntries(Object.keys(ZERO_SCANNER_VIOLATIONS).map(key => [key, 0])))
  })
})
