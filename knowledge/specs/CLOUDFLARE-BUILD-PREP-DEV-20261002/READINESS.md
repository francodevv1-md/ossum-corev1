# Cloudflare local build preparation

## Scope
- Local compilation/package validation only. No deploy/upload, Cloudflare account resources, credentials provisioning, database mutations or publication performed.
- Existing PostgreSQL, Supabase Auth and operational R2 remain unchanged. OpenNext retains Next.js/webpack; no vinext/Vite or static-only migration.

## Commands
- `npm run build`: ordinary Next standalone production build, with source TypeScript validation expected enabled.
- `npm run cf:build`: Prisma client generation, Next build, generated-server sanitization, OpenNext bundle and generated-asset sanitization.
- `npm run cf:dry-run`: builds then validates upload locally without deployment.
- `npm run cf:typegen`: generates bindings/runtime declarations from the empty template, not local QA credentials.
- `npm run cf:sanitize:test`: one runnable check that generated private copies are removed and source originals retained.
- `npm run cf:preview`: local Workers preview only, after operator supplies reviewed local configuration; never `--remote` in this package.
- No deployment script added. Worker public domains and preview URLs default disabled.

## Executed evidence
- Next16.3.8 strict webpack production build passed, TypeScript passed and65static pages generated.
- OpenNext1.20.8 Worker bundle generated successfully on Windows, with its documented Windows support warning.
- Wrangler4.147 dry-run passed:40507.89KiBuncompressed /5984.92KiBgzip. Paid Workers size allowance required; exceeds free-tier limit.
- One generated environment-file copy removed before packaging; two internal technical PDFs excluded from generated public assets. Originals unchanged.
- Sanitizer unit1/1passed. Independent read-only configuration/sanitizer review found no prep blocker.
- Optional startup profiling failed in local Windows tooling; no Worker startup/SQL/full runtime acceptance claimed.

## Runtime/deployment gates
- Supply secrets through protected account tooling only after explicit authorization. Do not copy populated `.env`, `.dev.vars`, storageState, access journals or clinical source files into config/Git/upload assets.
- Set public build variables separately: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID and applicable NEXT_PUBLIC_APP_URL. Never promote server keys into NEXT_PUBLIC variables.
- Runtime API prerequisites include DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and operational R2 variables shown as empty names in the template; optional provider settings require their own reviewed scope.
- Workers support direct pg>=8.16.3 with Node compatibility; existing pg8.21 qualifies. Hyperdrive is optional. Still verify Prisma adapter/pool request lifetime with actual Workers runtime before rollout; no backend/provider migration silently made.
- Persistent mail/OAuth filesystem storage is not portable to Workers persistent storage. Port that feature only under its approved Auth/storage scope; generated cache dummy mode is not mail persistence.
- googleapis/native PDF/image paths need feature-level Workers runtime checks; successful bundle is not proof all APIs work.
- IMAGES binding needs Cloudflare Images support at deployment; dummy cache intentionally provides no durable ISR/revalidation until reviewed bindings exist.
- Dependency audit includes critical next-auth4.24.11 advisory and other legacy/transitive alerts. No Auth/security change or forced audit fix performed. Evaluate exposure and approved remediation before publication.
- The DB now contains explicitly supplied identifying case data. Any deployment target/access policy must be separately approved; no open public preview inferred.

## Current source stability gate
- After validated artifacts were generated, next.config.ts regained ignoreBuildErrors and an obsolete eslint.ignoreDuringBuilds property that fails Next16 TypeScript. These blocks were not written by this build owner; source ownership must be stabilized before certifying the latest config.
- Root app TypeScript excludes only generated Worker/standalone output and generated runtime declaration graph to avoid4GBheap exhaustion. Strict application checks remain enabled; Wrangler handles generated Worker validation separately.
- DEV5000 restored and public loginHTTP200; actual authenticated map API still returns both persisted institution markers.
