import { readFileSync } from "node:fs"
import { registeredRoots, sessionOptions, EXPIRED } from "../../../scripts/qa/dev-session.mjs"

// Read only the explicitly configured external state; emit no session values.
try {
  const options = sessionOptions(process.env, "preflight", registeredRoots(process.cwd()))
  if (options.base !== "http://127.0.0.1:5000" || options.company !== "codevdistricorr1000000000") throw new Error()
  const state = JSON.parse(readFileSync(options.state, "utf8"))
  const records = state.origins?.find(origin => origin.origin === options.base)?.localStorage ?? []
  const record = records.find(entry => /^sb-.+-auth-token$/.test(entry.name))
  const session = record ? JSON.parse(record.value) : null
  if (!session?.access_token || typeof session.expires_at !== "number") throw new Error()
  console.log(session.expires_at * 1000 <= Date.now() ? EXPIRED : "PASS saved state not expired (offline; not membership evidence)")
} catch { console.log("BLOCKED external session prerequisites; details withheld"); process.exitCode = 1 }
