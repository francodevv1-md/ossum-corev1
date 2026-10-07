// Compatibility import only; canonical global plugins own automatic registration.
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const canonical = await import(pathToFileURL(join(homedir(), ".config/opencode/plugins/graphify.js")).href)
export const GraphifyPlugin = canonical.GraphifyPlugin
export default canonical.default
