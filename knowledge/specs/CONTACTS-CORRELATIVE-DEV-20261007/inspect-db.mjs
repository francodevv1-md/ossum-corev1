import nextEnv from '@next/env'
import pg from 'pg'
nextEnv.loadEnvConfig(process.cwd())
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 })
try {
  await client.connect()
  const indexes = await client.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ContactCompanyLink'`)
  const stats = await client.query(`SELECT count(*)::int AS links, count(*) FILTER (WHERE code !~ '^C-[0-9]+$')::int AS legacy_codes, max(substring(code from '^C-([0-9]+)$')::numeric)::text AS maximum FROM "ContactCompanyLink"`)
  const own = await client.query(`SELECT c."firstName", l.code, l."isActive", (SELECT count(*)::int FROM "AuditEvent" a WHERE a."entityId" = c.id AND a."entityType" = 'Contact') AS audits FROM "Contact" c JOIN "ContactCompanyLink" l ON l."contactId" = c.id WHERE c."firstName" LIKE 'QA-CONTACT-CORRELATIVE-%' ORDER BY l.code`)
  console.log(JSON.stringify({ indexes: indexes.rows, stats: stats.rows, ownFixtures: own.rows, development: process.env.OSSUM_DEPLOYMENT_TIER === 'development' }))
} catch (error) {
  console.error('Read-only DB inspection failed', error.code ?? error.name)
  process.exitCode = 1
} finally { await client.end() }
