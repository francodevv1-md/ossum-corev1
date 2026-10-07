## Reproduce
- Ordinary Next16.3.8 production build passed with TypeScript and65static pages.
- Adapter build reusing that output failed: `.next/standalone/.next/server/pages-manifest.json` missing.

## Scope
- Build-output configuration only; no application/Auth/DB changes.

## Evidence
- next.config.ts had no `output: standalone`; adapter expects the standalone output layout when skipping Next build.

## Hypothesis
- Missing standalone artifact, not a failed API or a reason to migrate framework/DB provider.

## Minimal Fix
- Explicit standalone output with project tracing root; rebuild after this actual config change, sanitize generated environment/private-data copies before adapter packaging.

## Validate
- Pending standalone rebuild/adapter bundle/dry-run. No unsupported-version or validation bypass flags.

## Regression Check
- Existing providers/source and source operational data remain untouched; no deploy. Cache disabled until reviewed resources exist.

## Handoff
- Distinguish successful Next build from incomplete Workers package until actual bundling succeeds.

## Generated-output compiler reproduction
- After a successful Worker bundle/dry-run, root tsc exhausted its4GBheap. The project enables allowJs and recursive include; generated Cloudflare declarations import the40MBWorker graph, and standalone output adds a duplicate dependency tree.
- Exclude only generated Worker/standalone artifacts and generated runtime declarations from app tsconfig. Do not weaken strictness, ignore diagnostics or exclude application modules.
- Optional Wrangler startup profiling had local-tool format/resolution failures on Windows; no startup/runtime acceptance is claimed from those failures. Worker build and dry-run remained successful.
