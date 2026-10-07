// Compatibility import only; canonical global plugins own automatic registration.
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const canonical = await import(pathToFileURL(join(homedir(), ".config/opencode/plugins/background-agents.ts")).href)
export const BackgroundAgents = canonical.BackgroundAgents
export default canonical.default
