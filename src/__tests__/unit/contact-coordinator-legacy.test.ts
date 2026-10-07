import { describe, expect, it, vi } from 'vitest'
import type { Prisma, PrismaClient } from '@prisma/client'
import { createContact } from '@/lib/services/contact.service'

type LinkRow = {
  id: string
  contactId: string
  companyId: string
  code: string
  role: string | null
  roles: string[]
  isActive: boolean
  isPayer?: boolean
  vatCondition?: string | null
  paymentTerms?: string | null
  defaultPriceList?: string | null
  usualDiscount?: number | null
  doctorLicense?: string | null
  specialty?: string | null
  deliveryNotes?: string | null
}
type ContactRow = { id: string; firstName: string | null; lastName: string | null; legalName: string | null; isCompany: boolean }

function buildTx(overrides: { links?: LinkRow[]; contacts?: ContactRow[] } = {}) {
  const links = overrides.links ?? []
  const contacts = overrides.contacts ?? []
  let nextLinkId = 1
  let nextContactId = 1
  const tx = {
    contactCompanyLink: {
      findMany: vi.fn(async ({ where }: { where: { companyId: string; code?: { startsWith?: string } } }) => {
        let rows = links.filter(row => row.companyId === where.companyId)
        const startsWith = where.code?.startsWith
        if (typeof startsWith === "string") rows = rows.filter(row => row.code.startsWith(startsWith))
        return rows
      }),
      findUnique: vi.fn(async (args: { where: { contactId_companyId: { contactId: string; companyId: string } }; include?: unknown }) => {
        const row = links.find(r => r.contactId === args.where.contactId_companyId.contactId && r.companyId === args.where.contactId_companyId.companyId)
        if (!row) return null
        if (args.include) {
          // Stub the relation include that contact.service expects when reading back.
          const contactRecord = contacts.find(c => c.id === row.contactId) ?? { id: row.contactId, firstName: null, lastName: null, legalName: null, isCompany: false }
          return {
            ...row,
            contact: {
              ...contactRecord,
              addresses: [],
              groupMemberships: [],
            },
          }
        }
        return row
      }),
      findFirst: vi.fn(async ({ where }: { where: { companyId: string; contactId: string; role?: string; isActive?: boolean } }) => {
        return links.find(row => {
          if (row.companyId !== where.companyId) return false
          if (row.contactId !== where.contactId) return false
          if (where.role !== undefined && row.role !== where.role) return false
          if (where.isActive !== undefined && row.isActive !== where.isActive) return false
          return true
        }) ?? null
      }),
      create: vi.fn(async ({ data }: { data: Partial<LinkRow> }) => {
        const row: LinkRow = {
          id: `link-${nextLinkId++}`,
          contactId: data.contactId!,
          companyId: data.companyId!,
          code: data.code!,
          role: data.role ?? null,
          roles: data.roles ?? [],
          isActive: data.isActive ?? true,
          isPayer: data.isPayer,
          vatCondition: data.vatCondition,
          paymentTerms: data.paymentTerms,
          defaultPriceList: data.defaultPriceList,
          usualDiscount: data.usualDiscount,
          doctorLicense: data.doctorLicense,
          specialty: data.specialty,
          deliveryNotes: data.deliveryNotes,
        }
        links.push(row)
        return row
      }),
      update: vi.fn(),
    },
    contact: {
      create: vi.fn(async ({ data }: { data: Partial<ContactRow> }) => {
        const row: ContactRow = {
          id: `contact-${nextContactId++}`,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          legalName: data.legalName ?? null,
          isCompany: data.isCompany ?? false,
        }
        contacts.push(row)
        return row
      }),
    },
    contactGroup: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async ({ create }: { create: { companyId: string; slug: string; role: string; name: string } }) => ({ id: `${create.companyId}:${create.slug}`, slug: create.slug, role: create.role, name: create.name })),
    },
    contactGroupMembership: {
      deleteMany: vi.fn(async () => ({})),
      createMany: vi.fn(async () => ({})),
    },
    contactAddress: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({})),
    },
    auditEvent: {
      create: vi.fn(async () => ({})),
    },
  } as unknown as Prisma.TransactionClient
  return { tx, links, contacts }
}

function dbWith(tx: Prisma.TransactionClient) {
  return { $transaction: vi.fn(async (callback: (tx: Prisma.TransactionClient) => unknown) => callback(tx)) } as unknown as PrismaClient
}

describe('createContact — coordinator legacy role mapping', () => {
  it('persists role:coordinator on the link when group includes coordinadores and role:interno, while keeping roles:[interno]', async () => {
    const { tx, links } = buildTx()
    const db = dbWith(tx)
    const result = await createContact(db, 'company-A', {
      firstName: 'Carla',
      lastName: 'Coord',
      role: 'interno',
      roles: ['interno'],
      groupSlugs: ['coordinadores'],
    } as unknown as Parameters<typeof createContact>[2])
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ role: 'coordinator', roles: ['interno'], isActive: true })
    // The createContact pattern: returns flattened contact (not the link); but the link exposes the role.
    expect(result).toBeTruthy()
  })

  it('does not rewrite role when group does not include coordinadores (existing interno callers unaffected)', async () => {
    const { tx, links } = buildTx()
    const db = dbWith(tx)
    await createContact(db, 'company-A', {
      firstName: 'Otro',
      lastName: 'Interno',
      role: 'interno',
      roles: ['interno'],
      groupSlugs: ['deposito'],
    } as unknown as Parameters<typeof createContact>[2])
    expect(links).toHaveLength(1)
    expect(links[0].role).toBe('interno')
    expect(links[0].roles).toEqual(['interno'])
  })

  it('does not rewrite role when caller already passes role:coordinator', async () => {
    const { tx, links } = buildTx()
    const db = dbWith(tx)
    await createContact(db, 'company-A', {
      firstName: 'Directo',
      lastName: 'Coord',
      role: 'coordinator',
      roles: ['interno'],
      groupSlugs: ['coordinadores'],
    } as unknown as Parameters<typeof createContact>[2])
    expect(links).toHaveLength(1)
    expect(links[0].role).toBe('coordinator')
  })

  it('does not rewrite role for cliente/proveedor even with coordinadores group (only the interno+coordinadores pair triggers)', async () => {
    const { tx, links } = buildTx()
    const db = dbWith(tx)
    await createContact(db, 'company-A', {
      legalName: 'Cliente SA',
      isCompany: true,
      role: 'cliente',
      roles: ['cliente'],
      groupSlugs: ['coordinadores'],
    } as unknown as Parameters<typeof createContact>[2])
    expect(links).toHaveLength(1)
    expect(links[0].role).toBe('cliente')
  })

  it('end-to-end: createContact with interno+coordinadores is then findable by surgery.service coordinator lookup', async () => {
    const { tx, links } = buildTx()
    const db = dbWith(tx)
    const result = await createContact(db, 'company-A', {
      firstName: 'Carla',
      lastName: 'Coord',
      role: 'interno',
      roles: ['interno'],
      groupSlugs: ['coordinadores'],
    } as unknown as Parameters<typeof createContact>[2])
    const newContactId = (result as unknown as { id: string }).id
    // Simulate the surgery.service findFirst({ companyId, contactId, role: 'coordinator', isActive: true })
    const found = await tx.contactCompanyLink.findFirst({
      where: { companyId: 'company-A', contactId: newContactId, role: 'coordinator', isActive: true },
    })
    expect(found).not.toBeNull()
    expect(found!.contactId).toBe(newContactId)
    // Maestro role filter via roles array still shows it as interno.
    expect(found!.roles).toEqual(['interno'])
    expect(links).toHaveLength(1)
  })
})
