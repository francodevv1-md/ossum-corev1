import path from "node:path"
import { fileURLToPath } from "node:url"
import base from "../../../../vitest.config.ts"
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")
export default {
  ...base,
  resolve: {
    ...base.resolve,
    alias: {
      "@/components/expediente/ComprobantesAsociados": path.join(process.env.LOCALAPPDATA, "Temp/opencode/remito-pdf-staged-panel.tsx"),
      "lucide-react": path.join(repo, "node_modules/lucide-react"),
      "framer-motion": path.join(repo, "node_modules/framer-motion"),
      "react-dom": path.join(repo, "node_modules/react-dom"),
      "react": path.join(repo, "node_modules/react"),
      ...base.resolve.alias,
    },
  },
}
