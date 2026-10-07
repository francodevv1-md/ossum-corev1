import { fileURLToPath } from "node:url"
import path from "node:path"
import tailwind from "../../../../node_modules/@tailwindcss/postcss/dist/index.mjs"
const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, "../../../..")
export default {
  root,
  cacheDir: path.join(process.env.LOCALAPPDATA, "Temp/opencode/authorized-color-vite-cache"),
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.join(repo, "src") } },
  css: { postcss: { plugins: [tailwind({ base: repo })] } },
  build: { outDir: path.join(process.env.LOCALAPPDATA, "Temp/opencode/authorized-color-build"), emptyOutDir: false },
  server: { host: "127.0.0.1", port: 5197, strictPort: true, fs: { allow: [repo] } },
}
