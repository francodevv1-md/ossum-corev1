# Main repository retirement

## Approved result

Retire `E:/OSSUM_COR_PROJECT` without losing local work, Git history or any linked worktree. Franco approved the safe relocation and confirmed other sessions/agents are paused. `E:/OSSUM_COR_ANTIGRAVITY/ux-ui` remains the principal task workspace.

## Minimal implementation

1. Reserve the shared Git resource visibly in both workspaces. Preserve foreign locks.
2. Snapshot all five worktrees' HEAD, status, nonignored file hashes and index; snapshot shared refs/config and source directory identity. Do not output file contents or secrets.
3. Rename the complete main directory on the same volume to `E:/OSSUM_COR_ARCHIVE/OSSUM_COR_PROJECT-20261006`; the target must not exist. This retains tracked, untracked and ignored files without copying or deletion.
4. Run `git worktree repair` from the relocated main tree, using Git's supported repair mechanism to reconnect all linked worktrees.
5. Verify preservation and Git connectivity. On failure, rename back and repair the original connections; stop if rollback itself fails.
6. Record the result and release only this task's two own locks.

## Boundaries

No source/config/AGENTS/foreign-lock edits, commits/publication, DB operations, dependency installations, server/build/browser activity or other session migration. This is archival retirement, not disk-space cleanup. The shared Git directory will live inside the archive and must not be deleted.

## Evidence

- Installed Git: `2.52.0.windows.1`.
- Preflight: five worktrees; no Git lock files; no `core.worktree`, `core.hooksPath`, relative-worktree overrides or object alternates found.
- Source and principal workspace `node_modules` are ordinary directories, not root-linked junctions.
- Git documentation: moving the main tree manually and running `git worktree repair` there reconnects linked worktrees. `git worktree move` cannot move the main worktree.
- Source `.git` is a physical directory, used by all linked worktrees.

## Acceptance

- Original path absent; archived directory identity unchanged.
- All five worktrees remain usable, with their prior HEAD/status/index/content intact.
- Shared refs/config unchanged and Git connectivity passes.
- Principal workspace unchanged; existing foreign locks unchanged.
- No disk-space recovery or application/browser acceptance claimed.
