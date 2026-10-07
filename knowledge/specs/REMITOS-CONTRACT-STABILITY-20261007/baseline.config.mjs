// Read-only comparison against the audited committed hook; never restore/overwrite source.
import { execFileSync } from "node:child_process"
import { mergeConfig } from "vitest/config"
import base from "../../../vitest.config.ts"

export default mergeConfig(base, {
  plugins: [{
    name: "remitos-committed-hook-baseline",
    enforce: "pre",
    load(id) {
      if (id.replaceAll("\\", "/").endsWith("/src/hooks/useRemitos.ts")) {
        return execFileSync("git", ["show", "ec981cfeb189943eb212ddedbd024f090e44676d:src/hooks/useRemitos.ts"], { encoding: "utf8" })
      }
    },
  }],
})
