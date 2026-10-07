# Bounded OSSUM DEV autonomy — 2026-10-03

## Approval and outcome

Franco answered `si confirmo` to the explicit offer to prepare autonomy limited to OSSUM and its development tools, without unrestricted personal-file access or critical changes without authorization. This approves project-scoped OpenCode configuration, not Windows elevation, arbitrary PC control, application Auth/RLS changes, data mutation or deployment.

## Task declaration

- Task: BOUNDED-DEV-AUTONOMY-20261003; risk T3 (agent permission configuration).
- Owner: primary agent / OpenCode configuration author / `openai/gpt-6.1-sol`.
- Mode: implementation of project config and supporting docs/checks only.
- Allowed files: `.opencode/opencode.json`; `.opencode/checks/bounded-autonomy.test.mjs`; `knowledge/workflow/BOUNDED_DEV_AUTONOMY.md`; this spec folder; `.opencode/locks/BOUNDED-DEV-AUTONOMY-20261003.lock.md`; a single scoped milestone append to `knowledge/worklog/WORKLOG.md` after clean-status/no-overlap verification.
- Forbidden: global config, providers/credentials/MCP connection changes, application sources/tests, AGENTS, active server/E2E fixtures, Auth/schema/DB, personal files, dependencies and unrelated working-tree changes.
- Commands: read-only Git/OpenCode config diagnostics with sanitized output; focused local config-policy check; vetted mocked checks only if inspected; no `--auto`.
- Forbidden commands: runtime termination/restarts, unrestricted shell execution, installs, migrations/seeds, cleanup/deletion, real mail/fiscal/billing, deployment and Git writes/publication.
- Scope boundaries: active root `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`; preserve existing model/provider selection and session history. Ongoing sessions keep loaded settings until deliberately restarted when idle.
- Stop: competing owner on config/new files, secrets, changed scope, actual runtime conflict, or the same proven blocker after two minimal Diagnose cycles.
- Output: Done / Changed / Files / Validations / Risks / Next.

## Design and verification

Inspect effective merged configuration, not just source JSON. Global defaults currently allow tools broadly, and legacy `tools: true` become per-agent allow overrides. A top-level permission change alone is insufficient.

Use a bounded project default agent and default-ask rules. Ordinary scoped source/document work and explicitly vetted checks may proceed; unknown commands, external paths and critical files require approval. Legacy agents must not keep unconditional shell/read/edit overrides. Keep custom delegation off if inheritance cannot be verified; use native scoped subagents instead.

Implementation retains `gentle-fast` as default, all model/provider/MCP choices and native SDD task allowlists. The general catchall is project-level only; explicit read/edit/bash/external maps on all twelve legacy agents constrain their inherited tool enables. Five exact project Engram context/journal tools remain automatic; unknown and deletion operations do not.

Permissions are tool approval controls, not an OS sandbox. Approved project scripts/tests execute with the user account's rights. Do not promise that these rules prevent every shell/path/symlink bypass, and do not authorize administrator elevation, blanket approvals or access to secrets.

Validate official schema and installed OpenCode startup/config merge, path/pattern behavior, agent overrides and representative positive/negative checks. Require independent read-only review. No actual sensitive file access or dangerous command execution is needed to test a rule.
