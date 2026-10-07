# GPT2-ISOLATED-BUILD-20261005

## Done
- Verified exact HEAD `21385527dcfbc6ebc5b1507096d03a2c402d8c4d`, branch ux/antigravity-redesign. Fresh own committed-source snapshot; dirty worktree not used as validation substitute.
- Prisma validate/generate PASS and explicit global TypeScript PASS retained from prior execution. **Current full build: PASS, actually executed, exit 0 in 134.784 seconds.** The historical BLOCKED entries below describe earlier authorization only; the final execution section is authoritative.

## Changed
- Only task documents and temporary harness/output. No shared source/config/dependency/client/.next/ports/index changes, no staging/commit.
- Temporary Prisma generator output redirected to snapshot/generated/prisma. Separate tsconfig.validation.json preserves HEAD compiler options with paths pointing to that newly generated client.
- Sanitized gate subprocess environments retain system execution variables only; synthetic local unreachable DIRECT_URL supplied only for offline Prisma configuration. No business secret values inherited/read/copied.

## Files
- Owned artifacts: this folder and C:/Users/franc/AppData/Local/Temp/opencode/isolated-build-2138552-20261005/.
- Temporary run-gates.mjs; validate.log/generate.log/typescript.log and corresponding .result.json; build.result.json records BLOCKED/not executed.
- Exported build/global-TypeScript input directories/configs directly from the pinned Git commit, not local files. Actual env files absent in committed root; no env templates, session state, .engram/tool credential configuration stores copied. Knowledge TypeScript is excluded by HEAD tsconfig.
- Harness coverage correction: added the two committed .opencode/plugins TypeScript sources initially omitted from the build-input export; reran global TypeScript successfully. No plugin execution or credential configuration copied.

## Validations
| Gate | Command inside sanitized harness | Exit/result |
|---|---|---|
| Prisma schema | node installed/prisma/build/index.js validate | 0 / PASS |
| Prisma client | node installed/prisma/build/index.js generate | 0 / PASS; temporary output only |
| Global TypeScript | node installed/typescript/bin/tsc --noEmit --incremental false -p tsconfig.validation.json | 0 / PASS, zero diagnostics |
| Full build | npm run build (HEAD script: next build --webpack) | 0 / PASS; 134.784 seconds; final continuation below |

Installed dependency versions recorded by the harness: Prisma/@prisma/client 7.8.0, TypeScript 5.9.3, Next 16.3.8. HEAD manifest declares Next ^16.1.1; this reuses installed dependencies through a junction and is NOT a fresh lockfile install.

### Preflight: precise blocked chain
- No package prebuild/postbuild scripts; database/importer/seed scripts are separate and were never invoked. HEAD Next config already sets ignoreBuildErrors=true; the independent explicit TypeScript gate is required and passed.
- Representative route: src/app/api/companies/[companyId]/personal-events/route.ts:1,7 imports auth-context and personal-calendar service. auth-context.ts:6–7 imports runtime Prisma and Supabase singletons; service imports Prisma as well.
- src/lib/prisma.ts:15–18 reads DATABASE_URL and throws `DATABASE_URL is required for Prisma runtime` at module scope if absent. Pool/client construction at21–31 is eager at import; Pool creation alone does not prove a network connection and none was executed here.
- src/lib/supabase/server.ts:7–18 calls requireEnv at module scope for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; missing values throw exact source literal `Missing required environment variable: ${name}`. createClient follows at25.
- Installed Next 16.3.8 dist/build/utils.js:662–669 calls loadComponents while checking pages/App Routes; dist/server/load-components.js:138/163 calls requirePage; dist/server/require.js:105 requires the compiled route module. Import-time userland/provider code is evaluated before a request handler runs. Dynamic request handling does not make those imports build-safe.
- Official Next 16.1.1 documentation also confirms Client Components are prerendered during next build. The initial read-only explorer's blanket claims that use-client prevents prerender and that API modules only load on first request were rejected by parent with loader-source evidence; its PASS-safe verdict is NOT accepted as build authorization evidence.
- Supplying real service-role credentials violates scope; using fake business credentials/mocks or disabling page-data/prerender to manufacture success is forbidden. Therefore the full build path was not executed. Error literals above are source evidence, not an invented build runtime stack trace.

### Diagnose / minimal product candidate (not applied)
- Scope/root cause: eager runtime client/environment initialization imported by build-time route-module collection, not Prisma schema or TypeScript failure.
- Minimum separately authorized candidate: defer runtime client initialization and mandatory env validation in src/lib/prisma.ts and src/lib/supabase/server.ts to real request/service use, with any direct callers scoped explicitly. Preserve runtime required-env errors, company scoping and service-role/Auth policy; no fake config, mocks, blanket dynamic flags or suppressed checks.
- This concerns product runtime/Auth bootstrap and is NOT a temporary harness fix; no implementation was attempted. Recheck other eager providers and actual full build only within a separately authorized bounded package.

## Risks
- No full build result, PostgreSQL acceptance, deployment or runtime readiness certified. Public font download permission is insufficient to unblock mandatory business secrets at module import.
- Dependency tree is reused, not guaranteed to match a fresh lockfile install. Full source TypeScript passes with the isolated generated client, not the dirty shared runtime client.

## Next
- GPT1 can scope the narrowly identified import-time bootstrap fix for approval/review, then rerun this isolated full-build gate. No automatic product/source/Auth changes or secret handling authorized by this validation task. Ownership released; original index/HEAD and dirty work preserved.

## DEV configuration continuation — current verdict
- Franco's subsequent explicit approval permits existing exclusively DEV configuration in a protected local build process, with no DB queries/mutations or Auth changes and stopping on data access. This supersedes the earlier secret-handling restriction; it does NOT authorize a preventive Prisma/Supabase refactor, and none was made.
- Reused the existing snapshot/harness. Target HEAD remains 21385527dcfbc6ebc5b1507096d03a2c402d8c4d; prior Prisma/TypeScript inputs were not modified, so those gates were not rerun.
- Private local verifier reads existing configuration only in process memory, compares the database target fingerprint to the existing user-approved DEV pin and matches Supabase server/public project identity and service-key JWT project/role claims. It emits booleans only. Exit 0, provenance PASS; JWT signature/credential validity and live target data are NOT verified.
- No values, endpoints, tokens or credentials copied into snapshot/repo/docs/prompts/logs; no business request, DNS validation, DB connection or Auth call. Only value-free provenance metadata persisted. Configuration was NOT forwarded to a build process.
- Effective containment gate FAILED readiness: run-gates.mjs is an offline gate runner, not a process-tree egress sandbox. A JavaScript fetch/socket patch cannot guarantee blocking native networking or every spawned child; it is not accepted as containment.
- Actual local capability probes: Docker and Podman commands absent; wsl.exe reports Windows Subsystem for Linux is not installed; WindowsSandbox.exe absent. No installation or OS/global firewall/security changes attempted. Blocking the shared node executable globally would also affect the live runtime, contrary to scope.
- Full command remains npm run build inside the own snapshot, NOT EXECUTED; exit code N/A. Build status BLOCKED, not a reproduced build FAIL. No data-access attempt occurred and no module/operation error was invented.
- Current next action: provide an already configured OS/container/VM-level process-tree network fence (deny business/DB/Auth/Supabase; optional allowlisted public font downloads) or separately scope safe setup of that isolated harness. Do not alter product source/Auth, supply fake credentials, change prerender or install tools in this task.

## Actual isolated build execution — final authoritative result

### Done
- **PASS.** Executed the committed `npm run build` → `next build --webpack` in the existing own snapshot. Final exit **0**, duration **134,784 ms**, start **2026-10-05T15:16:55.285Z**. Compiled successfully; page-data collection completed; **66/66 static pages generated**; optimization/build traces completed.
- Target/source SHA: `21385527dcfbc6ebc5b1507096d03a2c402d8c4d`; original HEAD checked before and after. Verified **1,242 compiler/source/config inputs** against Git blobs, equivalent after CRLF normalization. No dirty product files substituted.
- Latest approval: Franco answered `si avnaza amigo, que termine rapido la tarea` to verification of disposable DEV and authorization of necessary reads/DEV connections without Auth changes or mutations. This supersedes the prior no-read/network-fence prerequisite for this exact verified DEV; no additional infrastructure was required.

### Changed
- Temporary local dependency overlay resolves `@prisma/client` to the previously isolated generated client. Original source/config/dependencies/schema, index and shared runtime were untouched.
- Protected runner reruns the existing value-free DEV provenance verifier, loads only necessary existing DB/Supabase/public application configuration into subprocess memory, and excludes unrelated AI/mail/fiscal/storage credentials and shared runtime paths. No env files copied. Logs are redacted in memory **before** persistence or reporting.
- Initial actual build failed with exit **1** after **120,560 ms**: cross-drive dependency junction made Next's webpack entry calculation produce `./E:/OSSUM_COR_ANTIGRAVITY/ux-ui/node_modules/next/dist/client/next.js` and `app-next.js` relative to the C: snapshot. Installed `next/dist/build/webpack-config.js:569,575` prepends `./` to `path.relative`, explaining the invalid cross-drive entry.
- Minimum harness-only recovery: reuse byte copies of installed **Next and its command shims locally on C:**, leaving all shared packages unchanged. Exact npm build script then passed. Windows file-symlink privilege failure during overlay setup was handled by linking dependency directories only, not package-manager metadata files. No product fix, suppressed error, fake credentials, prerender bypass or altered Next configuration.

### Files
- Replay: `node C:/Users/franc/AppData/Local/Temp/opencode/isolated-build-2138552-20261005/run-build.mjs` (after source/provenance preflight; uses the already prepared local overlay).
- Temporary `run-build.mjs`, `preflight.mjs`, `localize-next.mjs`, `audit-output.mjs`; `build.attempt1.log` / `build.attempt1.result.json`; final `build.log` / `build.result.json`; `secret-output-audit.result.json`; isolated `snapshot/.next/` and local dependency overlay.
- Task documents only: `HANDOFF.md`, `TASK_BRIEF.md`, `LOCK.md`, `VERIFY_REPORT.md`.

### Validations
- Ownership: previous lock released, no existing snapshot Node process found; exclusive atomic execution lock prevented duplicate build writers. Final lock absent, no matching Node process, ownership released.
- Source preflight: AST inspection distinguished import-time calls from function/handler definitions. Mutating service methods and API handlers are defined, not called at import. No `generateStaticParams`/`generateMetadata` or eager DB mutation found. Prisma pool/client construction and Supabase singleton require environment at import but do not themselves invoke mutation routines. Receipt factories only assemble repositories/methods; mail constructors compute paths/clients without persisting; Auth browser work runs inside effects, not server prerender. No importer, migration, seed, operational HTTP request or Auth administrative operation invoked by the runner.
- DEV provenance: existing approved target fingerprint and Supabase project/service-role claims matched; signature/credential validity not independently certified.
- Final `npm run build`: **PASS / exit 0 / 134.784 s**, bounded **300-second** timeout per actual run; no timeout. Prior unchanged-input Prisma validate/generate/global TypeScript PASS reused, not rerun. HEAD's existing `ignoreBuildErrors=true` remains unchanged; separate global TS evidence is retained.
- Server-secret output audit: **PASS**, **3,093 files** scanned, **0** containing the configured DATABASE_URL or service-role key. No values/keys/DB URLs disclosed.

### Risks
- Reused installed dependencies: Next **16.3.8**, Prisma/client **7.8.0**, TypeScript **5.9.3**. **No fresh lockfile installation**; this is not clean-install reproducibility evidence.
- Existing archive has encoding-mangled non-ASCII filenames under `public/ejemplos`; compiler/source/config verification excludes those auxiliary public examples. Build PASS does not certify those sample download filenames.
- Build success is not live DB acceptance, Auth/E2E, operational behavior, fiscal integration, deployment readiness or proof of absent network reads. No process-tree network containment claim is made or required under the latest approval.

### Next
- Isolated build gate complete; parent may consume the actual PASS evidence. No product changes, deploy, staging, commit, migration or runtime restart authorized/performed. Ownership released.
