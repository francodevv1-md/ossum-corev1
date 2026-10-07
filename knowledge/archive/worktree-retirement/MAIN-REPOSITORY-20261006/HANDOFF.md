# Main repository retirement — blocked before relocation

## Done

- Preflight and independent read-only script review completed. Relocation is **BLOCKED**, not delivered.
- The principal active session remains `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`.

## Changed

- Only this task's declarations, brief/handoff and external temporary tooling were created.
- No directory moved, no Git links repaired, no app/config/foreign locks/indices/HEADs/refs changed, no files deleted.
- Empty parent directory `E:/OSSUM_COR_ARCHIVE` was created for the planned move. The destination `OSSUM_COR_PROJECT-20261006` does not exist.

## Files

- `.opencode/locks/MAIN-REPOSITORY-RETIREMENT-20261006.lock.md` and its source mirror: shared reservation, awaiting manual replay.
- `TASK_BRIEF.md`: approved safe archival approach and acceptance.
- External approved tool: `C:/Users/franc/AppData/Local/Temp/opencode/ossum-main-retirement-20261006/retire_main.py`.
- External evidence: `baseline.json`, `fsck-before.log`, `fsck-rollback.log` in that same temporary directory; logs contain no file contents or credentials. The rollback-named log is a pre-move validation artifact; no rollback was needed because no move occurred.
- `find_root_handles.py` in that temporary directory: read-only native directory-identity probe. It duplicates only diagnostic handles, closes its own copies, and never closes original handles or changes other processes.

## Validations

- PASS: fresh original-path inventory, all five worktrees, 9,690 nonignored file entries fingerprinted, HEADs/status/indices/shared refs/config and Git connectivity.
- PASS: independent read-only safety review of native rename, Git repair, rollback and preservation assertions.
- PASS: post-block regression check verifies the original directory identity and entries, all five worktrees' nonignored contents/status/indices/HEADs, shared refs/config and Git connectivity against the saved pre-move baseline.
- PASS: final independent read-only handoff review confirms blocked framing, safe external replay and preservation of foreign ownership; no required safety correction.
- BLOCKED: `python retire_main.py --apply` failed at `os.rename` with WinError 32, before invoking repair.
- PASS: exact root directory handle found in `opencode-cli.exe`, PID `46568`, using native file-identity comparison; no inaccessible candidate processes reported.
- Initial native diagnostic timed out while scanning generic file handles. Minimal diagnostic correction restricts candidates to editors/terminals/Node and file type DISK, avoiding pipe queries. Corrected probe completed successfully; no probe process left running or foreign handle closed.
- NOT RUN: actual relocated-state acceptance, application build/browser/DB tests (unrelated to this filesystem task).

## Risks

- The active OpenCode host retains a directory handle even though the session's task directory moved. Pausing agent work does not close that OS handle.
- Do not forcibly close that handle or kill the host while it is executing this task. Do not fall back to copy/delete.
- Keep other agents paused during manual replay. Foreign task locks stay untouched.
- The archive retains the full old checkout, including ignored local files; it does not reclaim disk space. Its `.git` will remain necessary for every linked worktree.

## Next

1. Close the blocking OpenCode instance manually. Open a **new PowerShell from Start**, not a terminal whose working directory is the old root.
2. Run:

```powershell
Set-Location 'E:\OSSUM_COR_ANTIGRAVITY\ux-ui'
python 'C:\Users\franc\AppData\Local\Temp\opencode\ossum-main-retirement-20261006\retire_main.py' --apply
python 'C:\Users\franc\AppData\Local\Temp\opencode\ossum-main-retirement-20261006\retire_main.py' --verify
```

The apply command takes fresh snapshots, requires an absent destination, performs the same-volume rename and repairs all Git connections. On repair/preservation failure it renames back and repairs from the original path. A successful run writes `result.json` with `PASS`; verification must pass before other agents resume.

3. Reopen OpenCode in the principal UX workspace. Validate the result, update this handoff, and release only this task's own lock and the relocated source mirror. No new approval is needed for the already-approved bounded replay.
