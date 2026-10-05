# Geographic declaration checkpoint

- Goal: version the existing complete ContactAddress geographic schema and unchanged SQL artifact, restoring the institution-map script's committed Prisma contract.
- Owner/model: GPT2 / openai/gpt-6.1-sol. Explicit approval includes local commit, not DB or importer execution.
- Base: ba258b71596f01c471aebfd39ea7c0673dd41b97. Reuse prior isolated candidate and diagnosis; preserve original dirty worktree and index ownership.
- Allowed schema delta: four enums; nineteen nullable ContactAddress columns; two indexes. Preserve three coordinate CHECK constraints in existing migration SQL. No new fields or semantic changes.
- Validation: compare names/native types/enum mappings/nullability/defaults/indexes and SQL CHECK definitions; Prisma format/validate/generate with temporary output; scoped script TypeScript and explicit pure unit suite; safe global TypeScript; independent exact candidate review.
- Index/commit: exact validated schema blob and original SQL only plus own brief/lock/handoff and prior demo status documents; no unrelated models/format/source/Cirugias staging or hook bypass.
- Stop: active overlapping owner, artifact semantic discrepancy, unsafe DB-dependent hook or two unresolved minimal Diagnose cycles.
