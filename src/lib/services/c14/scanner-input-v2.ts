import { GUARDED_WRITER_LOCATORS, WRITER_REGISTRY_V4, WRITER_REGISTRY_V4_SHA256 } from "./writer-registry-v4"

export const SCANNER_INPUT_V2_SHA256 = "69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a"

export const SCANNER_INPUT_V2 = {
  schemaVersion: "C14-INSERT-SCANNER-INPUT-V2-CX08-CCT1",
  bundleBindingSetSha256: WRITER_REGISTRY_V4.bundleBindingSetSha256,
  contractBindingSetSha256: WRITER_REGISTRY_V4.contractBindingSetSha256,
  databaseConstructionEntryPoint: "src/lib/db.ts#db",
  deferredCheckAdapterEntryPoint: "src/lib/services/c14/bundles/wcb-06.ts#private",
  guardedWriterLocators: GUARDED_WRITER_LOCATORS,
  lockAdapterEntryPoint: "src/lib/services/c14/bundles/wcb-06.ts#private",
  nonRouteContractOwnerEntryPoints: WRITER_REGISTRY_V4.contractBindings.map(binding => binding.publicCommandOwnerEntryPoint),
  privateContractWriterLocators: WRITER_REGISTRY_V4.contractBindings.map(binding => binding.privateRowWriterLocator),
  rereadAdapterEntryPoint: "src/lib/services/c14/bundles/wcb-06.ts#private",
  routeEligibleBundleEntryPoints: WRITER_REGISTRY_V4.bundleBindings.map(binding => binding.publicCommandEntryPoint),
  sharedWrapperEntryPoint: "src/lib/services/c14/bundles/wcb-06.ts#execute",
  writerRegistrySha256: WRITER_REGISTRY_V4_SHA256,
} as const

export type ScannerViolations = {
  rowWriterExports: number
  rowWriterImports: number
  productionContractOwnerImports: number
  ownerToOwnerEdges: number
  unregisteredRelationDmlPaths: number
  rawSqlOutsideAdapters: number
  dynamicEscapes: number
}

export const ZERO_SCANNER_VIOLATIONS: ScannerViolations = {
  rowWriterExports: 0,
  rowWriterImports: 0,
  productionContractOwnerImports: 0,
  ownerToOwnerEdges: 0,
  unregisteredRelationDmlPaths: 0,
  rawSqlOutsideAdapters: 0,
  dynamicEscapes: 0,
}

const scannerBytes = JSON.stringify(SCANNER_INPUT_V2)
export function conformsToScannerInputV2(candidate: unknown, violations: ScannerViolations): boolean {
  return JSON.stringify(candidate) === scannerBytes
    && JSON.stringify(violations) === JSON.stringify(ZERO_SCANNER_VIOLATIONS)
    && SCANNER_INPUT_V2.routeEligibleBundleEntryPoints.length === 11
    && SCANNER_INPUT_V2.nonRouteContractOwnerEntryPoints.length === 18
    && SCANNER_INPUT_V2.privateContractWriterLocators.length + SCANNER_INPUT_V2.guardedWriterLocators.length === 21
}
