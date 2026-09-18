# GGA Commit Routine

1. Define one bounded task with its allowed files and required validations.
2. Run the focused tests, typecheck/build, browser QA, and any domain gates required by `AGENTS.md` and `QUALITY_GATES.md`.
3. Stage only the reviewed task files. Inspect `git diff --cached` and `git status --short` before every commit.
4. The shared pre-commit hook runs `gga run` against the staged index only. It applies this repository's `.gga` configuration and `AGENTS.md` rules.
5. If GGA rejects the change, use Diagnose, correct only in-scope findings, rerun validation, stage the correction, and let GGA run again. Never bypass the hook.
6. If GGA fails because of infrastructure, preserve the staged work, record the concrete failure, and stop rather than retrying in a loop.
7. Commit only after all required gates pass. Push, deploy, and production actions remain separately authorized.
