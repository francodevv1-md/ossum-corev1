import { rm, stat } from "node:fs/promises"
import { resolve, relative } from "node:path"

const assets = resolve(".open-next/assets")
if (!(await stat(assets).catch(() => null))?.isDirectory()) {
  throw new Error("Cloudflare assets are not built; run cf:build first")
}
const internalDocuments = [
  "OSSUM_COR_Doc_Tecnica_Modulo_IA_Autorizaciones.pdf",
  "OSSUM_COR_Plan_Reconstruccion_Modulo_IA_Autorizaciones (1).pdf",
]
for (const name of internalDocuments) {
  const target = resolve(assets, name)
  if (relative(assets, target).startsWith("..")) throw new Error("Asset path escaped build output")
  // Only disposable generated copies; source/public originals remain unchanged.
  await rm(target, { force: true })
}
console.log(JSON.stringify({ cloudflareAssetsSanitized: true, excludedInternalDocuments: internalDocuments.length }))
