import { fileURLToPath } from "node:url"
import path from "node:path"
import tailwind from "../../../../node_modules/@tailwindcss/postcss/dist/index.mjs"
const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, "../../../..")
export default {
  root,
  cacheDir: path.join(process.env.LOCALAPPDATA, "Temp/opencode/comprobantes-vite-cache"),
  esbuild: { jsx: "automatic" },
  resolve: { alias: [
    { find: "@/components/auth/AuthProvider", replacement: path.join(root, "auth.ts") },
    { find: "@/lib/auth/client", replacement: path.join(root, "auth.ts") },
    { find: "@", replacement: path.join(repo, "src") },
    { find: "react-dom", replacement: path.join(repo, "node_modules/react-dom") },
    { find: "react", replacement: path.join(repo, "node_modules/react") },
  ] },
  css: { postcss: { plugins: [tailwind({ base: repo })] } },
  server: { host: "127.0.0.1", port: 5187, strictPort: true, fs: { allow: [repo] } },
}
