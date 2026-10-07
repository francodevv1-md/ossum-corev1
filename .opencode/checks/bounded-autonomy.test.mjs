import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

// Reads only this project's config; never executes the modeled commands or opens sample paths.
// Model pinned to OpenCode v1.18.34 Wildcard.match + ordered last-match rules, in Windows mode.
// This is NOT an installed-runtime test, shell parser, realpath/symlink check, or OS sandbox.
const config = JSON.parse(readFileSync(new URL("../opencode.json", import.meta.url), "utf8"))
const primaries = ["gentle-fast", "gentle-orchestrator"]
const phases = ["apply", "archive", "design", "explore", "init", "onboard", "propose", "spec", "tasks", "verify"].map(x => `sdd-${x}`)
const commands = [
  "git status", "git status --short", "git diff --check", "git diff --stat", "git log --oneline -10",
  "node .opencode/checks/bounded-autonomy.test.mjs",
  "npx --no-install tsc --noEmit --incremental false",
  "npx --no-install vitest run src/__tests__/unit/mentions-utils.test.ts",
]
function match(value, pattern) {
  const normalize = x => x.replaceAll("\\", "/")
  let regex = normalize(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")
  if (regex.endsWith(" .*")) regex = regex.slice(0, -3) + "( .*)?"
  return new RegExp(`^${regex}$`, "si").test(normalize(value))
}
function rules(profile) {
  return Object.entries(profile).flatMap(([permission, value]) =>
    Object.entries(typeof value === "string" ? { "*": value } : value)
      .map(([pattern, action]) => ({ permission, pattern, action })))
}
function decide(entries, tool, input) {
  return entries.findLast(r => match(tool, r.permission) && match(input, r.pattern))?.action ?? "ask"
}
assert.equal(match("git", "git *"), true)
assert.equal(match("GIT STATUS", "git status"), true)
assert.equal(match("SRC\\UI\\x.ts", "src/**"), true)
assert.equal(decide(rules({ edit: { "*": "ask", "src/**": "allow", "src/private/**": "ask" } }), "edit", "src/private/x.ts"), "ask")
assert.equal(config.$schema, "https://opencode.ai/config.json")
assert.equal(config.default_agent, "gentle-fast")
assert.deepEqual(config.instructions, ["knowledge/workflow/BOUNDED_DEV_AUTONOMY.md"])
assert.deepEqual(Object.keys(config.agent).sort(), [...primaries, ...phases].sort())
assert.deepEqual(config.plugin, ["./plugins/background-agents.ts", "./plugins/model-variants.ts"])
assert.deepEqual(config.mcp, {
  context7: { type: "remote", url: "https://mcp.context7.com/mcp" },
  engram: { type: "local", command: ["engram", "mcp", "--tools=agent", "--project", "ossum_cor_project"] },
})
assert.equal(config.share, "disabled")
const scopes = [["TOP", config.permission, null], ...Object.entries(config.agent).map(([name, agent]) => [name, agent.permission, agent])]
let assertions = 0
let constrainedGrants = 0
for (const [name, profile, agent] of scopes) {
  if (agent) assert.equal(Object.hasOwn(profile, "*"), false, `${name}: agent catchall is appended after inherited tool maps by runtime merge`)
  else assert.equal(profile["*"], "ask", name)
  for (const tool of ["read", "edit", "bash", "external_directory"]) {
    assert.equal(typeof profile[tool], "object", `${name}/${tool}: explicit legacy override required`)
    assert.equal(Object.keys(profile[tool])[0], "*", `${name}/${tool}: catchall first`)
    assert.equal(profile[tool]["*"], "ask", `${name}/${tool}`)
    if (agent) assert.deepEqual(Object.entries(profile[tool]), Object.entries(config.permission[tool]), `${name}/${tool}: same ordered map`)
  }
  for (const pattern of Object.keys(profile.read)) assert.ok(!/^(?:[a-z]:|\/|~)/i.test(pattern), `${name}: worktree-relative reads`)
  assert.deepEqual(Object.entries(profile.bash).filter(([, action]) => action === "allow").map(([pattern]) => pattern), commands, name)
  for (const value of Object.values(profile)) {
    for (const action of typeof value === "string" ? [value] : Object.values(value)) assert.ok(["ask", "allow", "deny"].includes(action), name)
  }
  // Legacy tools:true is converted first, then explicit permission rules supersede it.
  const legacy = agent ? Object.entries(agent.tools).map(([tool, enabled]) => ({ permission: tool === "write" ? "edit" : tool, pattern: "*", action: enabled ? "allow" : "deny" })) : []
  const effective = [...rules(config.permission), ...legacy, ...rules(profile)]
  const check = (tool, input, expected) => {
    assert.equal(decide(effective, tool, input), expected, `${name}/${tool}: ${input}`)
    assertions++
  }
  for (const command of commands) {
    check("bash", command, "allow")
    for (const suffix of [" --extra", " --auto", " && whoami", "; whoami", " | whoami", "\nwhoami"]) check("bash", command + suffix, "ask")
  }
  for (const command of ["whoami", "git diff --output=other.txt", "git status --short --branch", "git commit -m test", "git push", "gh pr create", "npm install", "npx anything", "node -e code", "python script.py", "powershell command", "npm run build", "npm run dev", "npm run typecheck", "npx --no-install next typegen", "npx --no-install vitest run", "npx --no-install playwright test", "npm run db:reset", "npx prisma db push", "Remove-Item src -Recurse"]) check("bash", command, "ask")
  for (const path of ["src/ui/example.ts", "docs/guide.md", "knowledge/specs/example/notes.md", "scripts/check.mjs"]) {
    check("read", path, "allow")
    check("edit", path, "allow")
    check("read", path.toUpperCase().replaceAll("/", "\\"), "allow")
  }
  for (const path of ["AGENTS.md", "package.json", "vitest.config.ts", "knowledge/core/PROJECT_BRIEF.md", ".opencode/skills/example/SKILL.md"]) check("read", path, "allow")
  for (const path of ["unknown.txt", "E:/OSSUM_COR_ANTIGRAVITY/ux-ui/src/ui/x.ts", "C:/Users/franc/Documents/notes.txt", "../other/src/x.ts"]) check("read", path, "ask")
  for (const path of [".env", ".env.local", "src/.env.example", "docs/credentials.json", "scripts/private.key", "src/cert.pem", "docs/secrets/token.txt", ".aws/credentials", ".ssh/id_rsa", ".config/gh/hosts.yml", "Library/Keychains/login.keychain", "docs/session.json", "scripts/storageState.json", "src/storage-state.json", "src/auth.json", "docs/raw.log", "src/logs/raw.txt", "src/.dev.vars"]) {
    check("read", path, "deny")
    check("read", path.toUpperCase().replaceAll("/", "\\"), "deny")
    check("edit", path, "ask")
  }
  for (const path of ["prisma/schema.prisma", "prisma/seed.ts", "src/lib/db.ts", "src/lib/store.ts", "src/types/index.ts", "src/app/cirugias/page.tsx", "src/components/cirugias/dialogs/NewSurgeryDialog.tsx", "src/hooks/useCirugiaActions.ts", "src/hooks/useCirugiasFilters.ts", "src/hooks/useCirugiaSelection.ts", "src/lib/cirugias.utils.ts", "src/lib/cirugias.constants.ts", "src/lib/businessRules.ts", "src/lib/automations.ts", "src/app/api/companies/[companyId]/route.ts", "src/lib/services/example.ts", "src/lib/validators/example.ts", "src/lib/permissions/example.ts", "src/components/expediente/Example.tsx", "src/components/operational-boards/Example.tsx", "src/app/coordinadores/page.tsx", "src/app/calendario/page.tsx", "src/components/auth/Example.tsx", "src/lib/security.ts", "src/lib/billing.ts", "src/lib/fiscal.ts", "src/app/ventas/pendientes-facturar/page.tsx", "src/middleware.ts", "AGENTS.md", "docs/AGENTS.md", "package.json", "scripts/package.json", "src/example.config.ts", ".opencode/opencode.json", ".opencode/checks/bounded-autonomy.test.mjs", ".opencode/plugins/example.ts", "knowledge/core/x.md", "knowledge/domain/x.md", "knowledge/architecture/x.md", "knowledge/workflow/x.md"]) {
    check("edit", path, "ask")
    check("edit", path.toUpperCase().replaceAll("/", "\\"), "ask")
  }
  for (const path of ["E:/OSSUM_COR_ANTIGRAVITY/ux-ui", "e:\\ossum_cor_antigravity\\UX-UI\\src\\ui"]) check("external_directory", path, "allow")
  for (const path of ["E:/OSSUM_COR_ANTIGRAVITY/ux-ui-other/src", "E:/OSSUM_COR_PROJECT", "C:/Users/franc", "C:/Users/franc/Documents", "C:/Users/franc/AppData/Local/Temp/opencode"]) check("external_directory", path, "ask")
  check("delegate", "sdd-apply", "deny")
  check("delegate", "arbitrary-agent", "deny")
  const allowedTasks = primaries.includes(name) ? phases : []
  assert.deepEqual(Object.entries(profile.task).filter(([, action]) => action === "allow").map(([task]) => task).sort(), [...allowedTasks].sort(), name)
  for (const task of [...phases, "general", "explore", "gga-reviewer", "arbitrary-agent"]) check("task", task, allowedTasks.includes(task) ? "allow" : "deny")
  check("unknown_tool", "anything", "ask")
  for (const tool of ["engram_mem_context", "engram_mem_search", "engram_mem_get_observation", "engram_mem_save", "engram_mem_session_summary"]) check(tool, "project task record", "allow")
  check("engram_mem_delete", "record", "ask")
  for (const [tool, input, action] of [["grep", "src/.*", "ask"], ["glob", "**/*", "allow"], ["list", ".", "allow"], ["question", "question", "allow"], ["todowrite", "todo", "allow"], ["skill", "example", "allow"], ["doom_loop", "loop", "ask"], ["context7_query-docs", "public docs", "allow"], ["cloudflare_mutation", "deploy", "ask"]]) check(tool, input, action)
  if (agent) {
    const expectedTools = primaries.includes(name) ? ["bash", "delegate", "delegation_list", "delegation_read", "edit", "read", "write"] : ["bash", "edit", "read", "write"]
    assert.deepEqual(Object.keys(agent.tools).sort(), [...expectedTools].sort(), `${name}: preserve legacy flags`)
    for (const tool of expectedTools) {
      assert.equal(agent.tools[tool], true, `${name}: preserve legacy flag`)
      assert.equal(decide(effective, tool === "write" ? "edit" : tool, "unknown"), tool === "delegate" ? "deny" : "ask", `${name}/${tool}: legacy grant must not override the profile`)
      constrainedGrants++
    }
  }
}
assert.equal(constrainedGrants, 54)
console.log(`PASS: ${scopes.length} profiles, ${assertions} policy cases, ${constrainedGrants} legacy grants constrained; Windows v1.18.34 model only, not a sandbox/runtime proof.`)

// Optional config diagnostics only: no --tool, model prompts, private reads or simulated command execution.
// Existing OpenCode startup plugins can initialize their normal caches; therefore this is opt-in.
if (process.argv.includes("--runtime")) {
  const cases = [
    ["read", "src/ui/example.ts", "allow"], ["read", "SRC\\UI\\example.ts", "allow"],
    ["read", ".env.local", "deny"], ["read", "docs/credentials.json", "deny"],
    ["read", "src/storageState.json", "deny"], ["edit", "src/ui/example.ts", "allow"],
    ["edit", "src/lib/store.ts", "ask"], ["edit", "src/app/cirugias/page.tsx", "ask"],
    ["edit", "src/app/api/companies/x/route.ts", "ask"], ["edit", ".opencode/opencode.json", "ask"],
    ["bash", "git status --short", "allow"], ["bash", "git diff --output=other.txt", "ask"],
    ["bash", "npm run build", "ask"], ["bash", "git status --short; whoami", "ask"],
    ["external_directory", "C:/Users/franc/Documents", "ask"],
    ["external_directory", "E:/OSSUM_COR_ANTIGRAVITY/ux-ui/src", "allow"],
    ["delegate", "anything", "deny"], ["delegation_read", "anything", "ask"],
    ["task", "general", "deny"], ["engram_mem_save", "project task", "allow"],
    ["engram_mem_delete", "record", "ask"],
  ]
  for (const name of [...primaries, ...phases]) {
    let raw
    try {
      raw = process.platform === "win32"
        ? execFileSync("cmd.exe", ["/d", "/s", "/c", `opencode debug agent ${name}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, maxBuffer: 8 * 1024 * 1024 })
        : execFileSync("opencode", ["debug", "agent", name], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, maxBuffer: 8 * 1024 * 1024 })
    } catch {
      throw new Error(`Cannot resolve ${name}; inspect CLI availability/config locally without publishing diagnostic secrets.`)
    }
    const effective = JSON.parse(raw).permission
    assert.ok(Array.isArray(effective), `${name}: installed permission rules required`)
    for (const [tool, input, expected] of cases) assert.equal(decide(effective, tool, input), expected, `${name}/resolved ${tool}: ${input}`)
    assert.equal(decide(effective, "task", "sdd-apply"), primaries.includes(name) ? "allow" : "deny", `${name}: native task rule`)
    console.log(`PASS: ${name}, ${cases.length + 1} cases against installed merged rules; no tools executed.`)
  }
}
