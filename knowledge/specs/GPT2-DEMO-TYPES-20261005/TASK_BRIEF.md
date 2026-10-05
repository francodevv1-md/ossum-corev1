# GPT2 demo types

- Task: GPT2-DEMO-TYPES-20261005; owner GPT2, model openai/gpt-6.1-sol.
- Approval: minimal script/type regression fixes and local commit only after isolated validation and MiniMax review. No schema/migration changes or script/DB execution.
- Baseline verified: ba258b71596f01c471aebfd39ea7c0673dd41b97; original index empty.
- Owned source: scripts/dev/districorr-two-institution-map-20261002.ts and src/__tests__/unit/districorr-two-institution-map.test.ts. Artifacts: this folder only.
- Reuse existing isolated HEAD candidate and generate only into its local generated/prisma output; focused TypeScript and explicit two-institution unit suite. Never execute the importer main function.
- Excluded: Antigravity Surgery work, foreign geography schema/migration, secrets, DB/seeds/cleanup, config/dependencies/build/runtime and Git operations other than own authorized commit after gates.
- Stop: if preserving geography writes/verification requires schema fields missing from HEAD, record exact dependency and BLOCKED; no casts, any, ignores, raw SQL workaround or removed fields.
