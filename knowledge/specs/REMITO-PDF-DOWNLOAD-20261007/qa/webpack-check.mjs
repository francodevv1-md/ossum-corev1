import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import assert from "node:assert/strict"
const require = createRequire(import.meta.url)
const webpack = require("next/dist/compiled/webpack/webpack").webpack
const output = path.join(process.env.LOCALAPPDATA, "Temp/opencode/remito-pdf-webpack")
const compiler = webpack({
  mode: "production", target: "web",
  optimization: { minimize: false },
  entry: fileURLToPath(new URL("./webpack-entry.mjs", import.meta.url)),
  output: { path: output, filename: "main.js" },
})
compiler.run((error, stats) => {
  compiler.close(() => {
    try {
      if (error) throw error
      if (stats.hasErrors()) throw new Error(stats.toString({ all: false, errors: true }))
      const assets = stats.toJson({ all: false, assets: true }).assets
      assert.ok(assets.some(asset => asset.name.endsWith(".wasm")))
      console.log(JSON.stringify({ result: "PASS", output, assets: assets.map(asset => asset.name) }))
    } catch (error) { console.error(error); process.exitCode = 1 }
  })
})
