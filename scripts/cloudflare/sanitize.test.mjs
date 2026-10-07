import { test } from "node:test"
import assert from "node:assert/strict"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

test("Cloudflare sanitizers remove generated private copies and preserve originals", async () => {
  const approvedParent = "C:/Users/franc/AppData/Local/Temp/opencode"
  await access(approvedParent)
  const directory = await mkdtemp(resolve(approvedParent, "cf-sanitize-test-"))
  try {
    const standalone = resolve(directory, ".next/standalone")
    const assets = resolve(directory, ".open-next/assets")
    const pdf = "OSSUM_COR_Doc_Tecnica_Modulo_IA_Autorizaciones.pdf"
    await mkdir(resolve(standalone, ".runtime"), { recursive: true })
    await mkdir(assets, { recursive: true })
    await mkdir(resolve(directory, "public"))
    await writeFile(resolve(directory, ".env"), "original-fake-value")
    await writeFile(resolve(standalone, ".env"), "generated-fake-value")
    await writeFile(resolve(standalone, "CIRUGIAS.XLS"), "fake-operational-data")
    await writeFile(resolve(standalone, "server.js"), "safe-code")
    await writeFile(resolve(directory, "public", pdf), "original-document")
    await writeFile(resolve(assets, pdf), "generated-document")
    for (const script of ["sanitize-server.mjs", "sanitize-assets.mjs"]) {
      const result = spawnSync(process.execPath, [resolve("scripts/cloudflare", script)], { cwd: directory, encoding: "utf8" })
      assert.equal(result.status, 0, result.stderr)
    }
    for (const removed of [resolve(standalone, ".env"), resolve(standalone, ".runtime"), resolve(standalone, "CIRUGIAS.XLS"), resolve(assets, pdf)]) {
      await assert.rejects(access(removed))
    }
    assert.equal(await readFile(resolve(directory, ".env"), "utf8"), "original-fake-value")
    assert.equal(await readFile(resolve(directory, "public", pdf), "utf8"), "original-document")
    assert.equal(await readFile(resolve(standalone, "server.js"), "utf8"), "safe-code")
  } finally { await rm(directory, { recursive: true, force: true }) }
})
