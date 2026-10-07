import nextEnv from '@next/env'
import { spawnSync } from 'node:child_process'
nextEnv.loadEnvConfig(process.cwd())
if (!process.argv.includes('--confirmed-disposable-dev')) throw new Error('Explicit disposable DEV confirmation required')
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/__tests__/integration/contact-correlative-postgres.test.ts'], {
  stdio: 'inherit', timeout: 120000,
  env: { ...process.env, OSSUM_RUN_CONTACT_CORRELATIVE_DEV: 'true' },
})
process.exitCode = result.status ?? 1
