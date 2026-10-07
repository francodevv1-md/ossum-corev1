// Compatibility import only; canonical global plugins own automatic registration.
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const canonical = await import(pathToFileURL(join(homedir(), ".config/opencode/plugins/model-variants.ts")).href)
export const ModelVariantsPlugin = canonical.ModelVariantsPlugin
export default canonical.default
