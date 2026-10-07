# Bounded DEV autonomy validation

## Scope

Project agent permission configuration only, OpenCode 1.18.34 on Windows. No application implementation, actual secret read, database action, modeled command execution, browser validation, runtime restart or elevated privileges. Existing model/provider/MCP and reviewer configuration is preserved; the supporting workflow is now referenced by project instructions.

## Checks

- `node .opencode/checks/bounded-autonomy.test.mjs`: PASS, 3,510 declaration-model cases, 13 profiles and 54 legacy tool grants constrained.
- `node .opencode/checks/bounded-autonomy.test.mjs --runtime`: PASS, 22 representative cases on each of 12 installed merged agent rule arrays (264 cases). This runs only config diagnostics; never `debug agent --tool`.
- `node --check .opencode/checks/bounded-autonomy.test.mjs`: PASS.
- Installed config loads with the existing `gentle-fast` default and preserved native SDD targeting. Both primary agents and all ten SDD phases were checked; broad custom delegation is denied. Unknown/background metadata operations remain gated.
- Known Engram context/search/get/save/summary operations are named individually. Deletion/unknown memory tools remain `ask`.
- Positive cases: ordinary relative source reads/edits, Windows case/slash variants, exact `git status --short`, approved project external directory.
- Negative cases: secret state/env reads remain `deny`; critical/self-config edits, personal paths, compound/unknown shell commands, build/typegen/E2E/DB/publication remain gated. General/arbitrary native task targets remain denied.
- Existing listeners preserved: OpenCode tailnet port 4096 PID 25532; project loopback port 5000 PID 21948. No process stopped or restarted.
- No real phone/browser/DB/application execution is claimed by these checks. Startup diagnostics can initialize existing plugin caches outside tool approval; this is documented, not sandbox isolation.

## Diagnose — permission ordering

### Reproduce

The initial source-JSON guard passed, but independent review and coordinator checks of installed merged rules found `gentle-fast/read/src/ui/example.ts` returned `ask` instead of `allow`. Secret reads also became `ask`, and custom delegation lost its intended denial.

### Scope

Permission merge ordering affected both primary agents and all ten SDD agents. Application code and running processes were unaffected because they were not reloaded.

### Evidence

The installed `gentle-fast` array placed an agent `* : ask` at index 373 after specific read/edit/bash/secret/delegate rules. Inherited object key ordering differs from the visible order in the project JSON; repeating the catchall inside an agent did not put it first in the effective runtime.

### Hypothesis

The late generic catchall overrode prior specific matches. A Windows path mismatch was weaker: the installed array itself showed the relevant correct source pattern before the final generic rule.

### Minimal Fix

Retained the general catchall at project level and removed it from the twelve agent profiles. Kept explicit per-tool maps and gated primary background-result metadata, so remaining legacy flags could not restore broad access. Added exact Engram journal/context allowances after a focused failing check showed that mandatory task recording would otherwise pause routine work.

### Validate

Reran the focused declaration guard and installed-rule evaluation: all twelve agents now preserve routine allows, secret/custom-delegate denials, personal/critical/unknown approval gates, Engram journal allows and native task restrictions. The saved `--runtime` check protects against future inherited/agent-file ordering regressions.

### Regression Check

Preserved model/provider/MCP/plugin/default-agent choices, legacy names, SDD targets and explicitly read-only reviewer denies. No broader test prefixes, `--auto`, privileged shell, public service or application changes were enabled.

### Handoff

Configuration checks are passing, but existing sessions retain their old loaded settings until safely reloaded. Permissions are approval controls, not an OS sandbox. Independent final re-review `small-sapphire-walrus`: PASS, prior blockers resolved; coordinator closes ownership after final bookkeeping.

## Subsequent approved activation attempt

Franco requested trying the reload and confirmed availability to enter the existing password locally. A guarded temporary PowerShell helper validated parser/policy behavior with synthetic inputs, authenticated against the existing web server and checked idle status and no pending permission/question requests twice before replacing only its owned backend.

- PASS: old web PID 25532 replaced by PID 24964, parent 23872, same tailnet address/port 4096 and no `--auto`.
- PASS: authenticated health and live `/agent` rule evaluation confirm `gentle-fast` ordinary relative read `allow`, `.env.local` read `deny` and custom delegate `deny`. No actual secret file or modeled tool operation executed.
- PASS: unauthenticated health still returns 401. Password never appears in prompts, repository, snapshots or sanitized status.
- PASS: original independent terminals 3812/25244 and app process 21948 on loopback5000 retained unchanged.
- NOT DONE: reconnecting those two original terminal conversations or claiming their old loaded settings changed. Wait for their work to finish and select the original sessions on the shared backend.
- Helper uses the installed V1 API responses directly. Do not assume a V2 `/openapi.json` endpoint in this version, and do not wrap `ConvertFrom-Json` output in a pipeline array for pending-count checks on PS5: empty JSON arrays can falsely count as one. Direct assignment was checked with empty and singleton synthetic examples.
