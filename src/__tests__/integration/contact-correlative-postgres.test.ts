// @vitest-environment node
// Opt-in configured disposable DEV. Real password login + route invocation + PostgreSQL.
// Only exact-owned synthetic contacts are changed; fixtures remain inactive, never deleted.
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { ContactResponse } from '@/lib/validators/contact'

const enabled = process.env.OSSUM_RUN_CONTACT_CORRELATIVE_DEV === 'true'
const integration = enabled ? describe : describe.skip

integration('contact correlativo real authenticated PostgreSQL', () => {
  let db: PrismaClient
  let pool: { end: () => Promise<void> }
  afterAll(async () => { if (db) await db.$disconnect(); if (pool) await pool.end() })

  it('concurrent POSTs retry, persist, search/edit/status audit and safely roll back failed audit', async () => {
    if (process.env.OSSUM_DEPLOYMENT_TIER !== 'development' || process.env.NODE_ENV === 'production') throw new Error('Disposable DEV gate missing')
    const runtime = await import('@/lib/prisma')
    db = runtime.default
    pool = runtime.prismaPool
    const companyId = process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID
    if (!companyId) throw new Error('Configured company missing')
    const auth = createClient(process.env.SUPABASE_URL!.replace(/\/rest\/v1\/?$/, ''), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await auth.auth.signInWithPassword({ email: process.env.OSSUM_SMOKE_EMAIL!, password: process.env.OSSUM_SMOKE_PASSWORD! })
    if (error || !data.session) throw new Error('Configured DEV password login failed; no contact writes attempted')
    const token = data.session.access_token
    const { getApiAuthContext } = await import('@/lib/api/auth-context')
    const { POST, GET } = await import('@/app/api/companies/[companyId]/contacts/route')
    const { PATCH } = await import('@/app/api/companies/[companyId]/contacts/[contactId]/route')
    const { GET: PREVIEW } = await import('@/app/api/companies/[companyId]/contacts/code-preview/route')
    const { createContact, getContactCodePreview } = await import('@/lib/services/contact.service')
    const { contactResponseSchema } = await import('@/lib/validators/contact')
    const base = `http://console.test/api/companies/${companyId}/contacts`
    const context = { params: Promise.resolve({ companyId }) }
    const request = (method: string, body?: unknown, suffix = '') => new Request(base + suffix, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const ctx = await getApiAuthContext(request('GET'), companyId)
    expect(['admin', 'operator']).toContain(ctx.canonicalRole)
    expect(ctx.source).toBe('supabase-auth')
    const indexes = await db.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE tablename = 'ContactCompanyLink' AND indexname IN ('uq_contact_company_code', 'ContactCompanyLink_contactId_companyId_key')`
    expect(indexes).toHaveLength(2)
    const run = `QA-CONTACT-CORRELATIVE-${randomUUID()}`
    const before = await getContactCodePreview(db, companyId)
    const owned: string[] = []
    const statuses: number[] = []
    const backendPids: number[] = []
    let attempts = 0
    let reads = 0
    let release!: () => void
    const readBarrier = new Promise<void>(resolve => { release = resolve })
    const transaction = db.$transaction.bind(db)
    // A barrier after both real first reads forces the race. Retries are unrestricted real transactions.
    const spy = vi.spyOn(db, '$transaction').mockImplementation((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const first = ++attempts <= 2
      return transaction(async tx => {
        if (!first) return callback(tx)
        const [identity] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
        backendPids.push(identity.pid)
        const wrapped = new Proxy(tx, { get(target, property) {
          if (property !== 'contactCompanyLink') return Reflect.get(target, property)
          return new Proxy(target.contactCompanyLink, { get(delegate, key) {
            if (key !== 'findMany') return Reflect.get(delegate, key)
            return async (...args: Parameters<typeof delegate.findMany>) => {
              const result = await delegate.findMany(...args)
              if (++reads === 2) release()
              let timer: ReturnType<typeof setTimeout> | undefined
              try { await Promise.race([readBarrier, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Race barrier timeout')), 8000) })]) }
              finally { clearTimeout(timer) }
              return result
            }
          } })
        } })
        return callback(wrapped)
      }, { timeout: 20000, maxWait: 10000 }).catch((error: unknown) => {
        const failure = error as { code?: string; meta?: { target?: unknown; modelName?: string; driverAdapterError?: { cause?: { constraint?: unknown } } } }
        console.log(JSON.stringify({ transactionFailure: failure.code, target: failure.meta?.target, model: failure.meta?.modelName, constraint: failure.meta?.driverAdapterError?.cause?.constraint }))
        throw error
      })
    }) as typeof db.$transaction)
    const patch = async (id: string, body: unknown) => {
      const response = await PATCH(request('PATCH', body, `/${id}`), { params: Promise.resolve({ companyId, contactId: id }) })
      expect(response.status).toBe(200)
      return contactResponseSchema.parse((await response.json()).data)
    }
    try {
      const responses = await Promise.all(['A', 'B'].map(label => POST(request('POST', { firstName: `${run}-${label}`, roles: ['cliente'], usualDiscount: 7.5 }), context)))
      spy.mockRestore()
      const contacts: ContactResponse[] = []
      for (const response of responses) {
        statuses.push(response.status)
        const payload = await response.json()
        if (response.status === 201) { owned.push(payload.data.id); contacts.push(contactResponseSchema.parse(payload.data)) }
      }
      expect(statuses).toEqual([201, 201])
      expect(new Set(backendPids).size).toBe(2)
      expect(attempts).toBe(3)
      expect(new Set(contacts.map(row => row.code)).size).toBe(2)
      const start = Number(before.nextCode.slice(2))
      expect(contacts.map(row => Number(row.code.slice(2))).sort((a,b) => a-b)).toEqual([start, start + 1])
      const first = contacts[0]
      expect(first.usualDiscount).toBe(7.5)
      const listed = await GET(request('GET', undefined, `?search=${encodeURIComponent(first.code)}`), context)
      expect((await listed.json()).data.some((row: { id: string }) => row.id === first.id)).toBe(true)
      const edited = await patch(first.id, { firstName: `${run}-edited`, roles: ['cliente', 'proveedor'] })
      expect(edited.code).toBe(first.code)
      await patch(first.id, { isActive: false })
      const previewInactive = await getContactCodePreview(db, companyId)
      expect(Number(previewInactive.nextCode.slice(2))).toBe(start + 2)
      await patch(first.id, { isActive: true })
      const duplicate = await POST(request('POST', { firstName: `${run}-duplicate`, code: first.code }), context)
      expect(duplicate.status).toBe(409)
      expect((await duplicate.json()).error.code).toBe('contact_code_conflict')
      expect(await db.contact.count({ where: { firstName: `${run}-duplicate` } })).toBe(0)
      const audits = await db.auditEvent.findMany({ where: { companyId, entityId: first.id, entityType: 'Contact' }, select: { action: true } })
      expect(audits.map(row => row.action).sort()).toEqual(['created', 'deactivated', 'reactivated', 'updated'])
      // Inject failure at the audit delegate, keeping every preceding operation on the real transaction.
      const failingDb = { $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => transaction(tx => callback(new Proxy(tx, { get(target, key) {
        if (key === 'auditEvent') return { create: async () => { throw new Error('Synthetic audit rollback probe') } }
        return Reflect.get(target, key)
      } }))) } as unknown as PrismaClient
      await expect(createContact(failingDb, companyId, { firstName: `${run}-rollback` }, undefined, ctx.actorUserId)).rejects.toThrow('Synthetic audit rollback probe')
      expect(await db.contact.count({ where: { firstName: `${run}-rollback` } })).toBe(0)
      const preview = await PREVIEW(request('GET', undefined, '/code-preview'), context)
      expect((await preview.json()).data).toEqual(previewInactive)
      console.log(JSON.stringify({ run, realPostgres: true, realPasswordLogin: true, transport: 'in-process actual route handlers (not HTTP listener)', concurrentPostStatuses: statuses, transactionAttempts: attempts, distinctBackendConnections: new Set(backendPids).size, codes: contacts.map(row => row.code), auditRollback: true, syntheticContacts: owned.length }))
    } finally {
      spy.mockRestore()
      for (const id of owned) await patch(id, { isActive: false })
      const active = await db.contactCompanyLink.count({ where: { contactId: { in: owned }, companyId, isActive: true } })
      expect(active).toBe(0)
      console.log(JSON.stringify({ retainedSyntheticContacts: owned.length, activeSyntheticContacts: active, deleted: 0 }))
    }
  }, 90000)
})
