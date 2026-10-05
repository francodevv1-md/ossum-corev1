# Bounded OSSUM DEV autonomy — 2026-10-03

## What this mode does

Activation update, 2026-10-03: the private web backend was safely reloaded and its live `gentle-fast` policy verified through authenticated `/agent` responses. Ordinary source reads are allowed, environment-secret reads denied and custom delegation denied. The two original independent terminal processes were preserved and are **not yet reconnected** to this backend; this update does not claim their loaded configuration changed.

OpenCode can perform ordinary, explicitly requested development work in `E:/OSSUM_COR_ANTIGRAVITY/ux-ui` without asking for every routine file operation. Critical changes, unknown commands and access outside the approved scope still require a decision. This is not administrator access or unrestricted control of the PC.

Franco approved this bounded profile with `si confirmo`. That approval covers configuring agent permissions; it does not approve every future feature, database operation or unpublished task found in old worktrees.

## Activation without interrupting current work

1. Let both active agents finish or reach a safe handoff. Do not terminate a running task to reload permissions.
2. When idle, quit and restart OpenCode so the project configuration is loaded again. The existing processes keep their already-loaded permissions until restarted; edited files are not proof of an active policy.
3. For phone/terminal shared control, reload the web backend when it is idle, preserve password authentication and tailnet-only binding, then reconnect the terminals and select their original conversations. Do not start a second listener on port 4096 or duplicate an in-progress conversation.
4. Retain `gentle-fast` as the default executor. Do not use `--auto` or approve `*` permanently: that would auto-approve the profile's `ask` decisions.
5. Run the saved policy check and confirm runtime agent rules after reload. This task does not restart the existing terminals, web service or DEV5000 server.

The profile is project-scoped. Other repositories and tools, including the external Antigravity application, do not automatically adopt it. Model subscriptions/providers and Windows rights are unchanged.

The web reload used the same locally entered password and tailnet-only port 4096 after idle/session/pending-request checks. Authenticated health passed and an unauthenticated request still returned 401. Original terminal PIDs 3812/25244 and the DEV5000 process were not stopped. Temporary guarded launcher/self-test and sanitized status remain outside Git under the approved temporary directory; its expected old PID makes it single-use, not an automatic recurring restart service.

## Routine versus protected actions

| Work | Treatment |
| --- | --- |
| Read ordinary source, task docs and development references in the active worktree | Automatic within configured paths. |
| Edit ordinary non-sensitive source, scripts and task artifacts | Automatic only inside the existing requested outcome and owned file set. |
| Run exact read-only Git checks, the policy check, static TypeScript without incremental writes, and the explicitly vetted pure test | Automatic only for the exact configured commands. |
| Retrieve project work context and record progress in Engram | Five named context/search/get/save/summary tools are automatic; unknown or deletion tools are not. |
| Run a new command, broader test suite, app build/typegen, browser E2E or server restart | Requires approval/ownership review; do not assume a command is harmless because it says test or DEV. |
| Change schema, Auth, permissions, critical Surgery flow, API/service contracts, fiscal/payment behavior or canonical decisions | Still protected by `AGENTS.md` and file approval rules. |
| Read secrets, credentials, saved authentication state or raw logs | Not part of autonomous work. Never put their contents in prompts, reports, tests or Engram. |
| Delete work, mutate real data, install/change providers, deploy, commit/push/PR/merge | Not authorized by this profile. |

Unknown operations are intentionally not automatically approved. The narrow test allowlist is not a promise that all future tests run unattended. Inspect and authorize an additional command when it is genuinely needed; do not add broad `npm *`, `node *`, PowerShell or shell prefixes to avoid a blocker.

## Working while Franco is away

Use a finite queue of requested tasks with an outcome, owner, files, dependencies, checks and stop conditions. No task exists merely because it appears in an archive or a reminder list.

For each eligible task:

1. Check the current file locks and dirty work; preserve foreign changes.
2. Reserve one owner per writable scope. Parallelize only disjoint writes or read-only work.
3. Implement the minimum requested result, run its approved focused checks, and Diagnose before fixes.
4. Park a task when an approval, credential, environment or dependency blocks it. Do not grant yourself the missing permission. Continue another independent, already-requested eligible task; do not invent unrelated work.
5. Stop the affected scope on an ownership conflict or after two unsuccessful minimal Diagnose cycles. Record evidence without secrets.
6. Record completion, actual verification, open risks and the next action. Use clear user-facing Caveman replies and precise technical evidence in agent handoffs.

Native subagents must respect their effective permissions and the same owned scope. Custom background delegation must not be used to bypass the native task allowlist or permission inheritance. Reviewer/read-only roles must stay read-only.

The PC must stay awake and online, the model quota must remain available and the execution process must remain running. A web server keeps access available; it does not create an infinite work queue, choose new business outcomes or guarantee hours of uninterrupted execution.

## Verification

Saved guard check:

```powershell
node .opencode/checks/bounded-autonomy.test.mjs
```

The check models the pinned OpenCode last-match and Windows path behavior against the declared profile and legacy-agent overrides. It does not execute destructive commands or read private files.

Compare installed runtime permission rules with the declaration. Use sanitized `opencode debug config` / `opencode debug agent` output only; do not dump credentials or full provider configuration. Never use `debug agent --tool` as a harmless simulation: it can execute a tool and store a session.

Opt-in installed-rule check (not in the unattended shell allowlist because startup diagnostics initialize existing plugin caches):

```powershell
node .opencode/checks/bounded-autonomy.test.mjs --runtime
```

It reads only the diagnostic permission arrays and evaluates fictitious paths/commands; it does not execute the modeled operations. It detects agent-file/global ordering differences that a source-JSON check alone can miss. Keep the general `* : ask` fallback at project level, not duplicated inside legacy agents: the installed merge can append an agent catchall after specific rules, canceling both automatic work and explicit secret denials.

Evidence for this configuration package belongs in `knowledge/specs/BOUNDED-DEV-AUTONOMY-20261003/`. Application tests, real DB integration and browser execution are separate evidence and are not claimed by a permission check.

## Security limits

These are approval gates, **not an operating-system sandbox**. Approved code runs with the current Windows account's rights. Scripts/tests import other code; symlinks/junctions can lead outside apparent paths; plugins execute at startup outside normal tool gates and may write their existing development caches. No Windows administrator elevation, plugin hardening, filesystem isolation, firewall change or public network exposure is configured here.

Content-search permissions are not filename exclusions: a grep regex permission cannot reliably enforce secret-file exclusions. Keep content search gated rather than advertise a guarantee that all search paths are safe.

The project profile must override legacy per-agent `tools: true` grants as well as global defaults. A top-level `ask` alone is insufficient. Existing external scripts, MCP services, arbitrary user approvals or another application can still bypass a profile if given separate authority. If stronger containment is required, plan an isolated environment as a separately approved task.

Do not assume that a built-in mode named Plan is intrinsically read-only under inherited configuration. The existing explicitly read-only reviewer denies are preserved; this task does not redesign all built-in agent modes.

## Handoff

- Done: bounded autonomy behavior and activation documented; runtime activation pending deliberate reload.
- Changed: permissions are scoped to project work rather than broad PC authority.
- Files: project OpenCode configuration, policy check and supporting evidence/docs.
- Validations: see package verification for actual outcomes; no application completion inferred.
- Risks: current sessions retain old loaded permissions; approval gates are not a sandbox; new checks may remain blocked while Franco is away.
- Next: finish current work, reload and verify the profile, then assign a finite task queue.
