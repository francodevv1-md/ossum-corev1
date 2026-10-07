import { readdir, rm, stat } from "node:fs/promises"
import { resolve, relative } from "node:path"

const root = resolve(".next/standalone")
if (!(await stat(root).catch(() => null))?.isDirectory()) throw new Error("Standalone output is missing")
let excluded = 0
async function sanitize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (relative(root, path).startsWith("..")) throw new Error("Path escaped generated standalone output")
    const privateFile = /^\.env(?:\.|$)/.test(entry.name) || /^\.dev\.vars(?:\.|$)/.test(entry.name) || /\.(?:xls|xlsx)$/i.test(entry.name) || entry.name === "OSSUM_COR_MOCK_10_CIRUGIAS.md"
    if (privateFile || entry.name === ".runtime") {
      await rm(path, { force: true, recursive: entry.isDirectory() })
      excluded++
    } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
      await sanitize(path)
    }
  }
}
await sanitize(root)
console.log(JSON.stringify({ generatedServerSanitized: true, excludedPrivateCopies: excluded, sourceFilesUntouched: true }))
