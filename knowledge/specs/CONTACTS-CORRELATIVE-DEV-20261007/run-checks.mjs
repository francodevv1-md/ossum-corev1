import { spawnSync } from 'node:child_process'
import '../CONTACTS-CREATE-STABILITY-20261007/qa/run-checks.mjs'
if (!process.exitCode) {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/__tests__/unit/contact-correlative.test.ts'], { stdio: 'inherit', timeout: 60000 })
  process.exitCode = result.status ?? 1
}
