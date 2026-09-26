import { WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

export type C14Activation = { bundleId: string; contractIds: readonly string[] }

export function isC14BundleEnabled(input: C14Activation, env: Record<string, string | undefined> = process.env): boolean {
  return env.OSSUM_C14_WCB06_ENABLED === "true"
    && input.bundleId === "WCB-06"
    && input.contractIds.length === WCB06_CONTRACT_IDS.length
    && input.contractIds.every((id, index) => id === WCB06_CONTRACT_IDS[index])
}
