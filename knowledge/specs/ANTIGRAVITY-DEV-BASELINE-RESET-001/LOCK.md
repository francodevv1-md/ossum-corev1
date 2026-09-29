# Ownership Lock

- task: `ANTIGRAVITY-DEV-BASELINE-RESET-001`
- agent role: Backend / DB implementation + QA
- selected model: `openai/gpt-5.6-terra`
- owned files:
  - `prisma/migrations/**`
  - `knowledge/archive/antigravity-prebaseline-migrations-20260928/**`
  - `knowledge/specs/ANTIGRAVITY-DEV-BASELINE-RESET-001/**`
- status: released
- scope: completed canonical clean DEV baseline from the Git HEAD pre-fiscal schema, preserved the existing fiscal migration byte-for-byte, and reset only the explicitly confirmed disposable DEV database after offline proof
- exclusions: no seed, provider, auth, production, staging, real-data, application-code, or schema change
