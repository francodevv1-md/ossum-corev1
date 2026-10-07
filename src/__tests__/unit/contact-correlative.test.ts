import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createContact, getContactCodePreview } from '@/lib/services/contact.service'

describe('contact allocation retries', () => {
  it('uses numeric maxima, keeps inactive codes reserved, and ignores legacy formats', async () => {
    const findMany = vi.fn().mockResolvedValue([{ code: 'C-9999' }, { code: 'C-10000' }, { code: 'LEGACY' }])
    const result = await getContactCodePreview({ contactCompanyLink: { findMany } } as unknown as PrismaClient, 'company-A')
    expect(result).toEqual({ lastCode: 'C-10000', nextCode: 'C-10001' })
    expect(findMany).toHaveBeenCalledWith({ where: { companyId: 'company-A', code: { startsWith: 'C-' } }, select: { code: true } })
  })
  it('starts at C-0001 with no numeric codes', async () => {
    expect(await getContactCodePreview({ contactCompanyLink: { findMany: async () => [] } } as unknown as PrismaClient, 'empty')).toEqual({ lastCode: null, nextCode: 'C-0001' })
  })
  it('rejects unsafe numeric codes rather than allocating rounded duplicates', async () => {
    await expect(getContactCodePreview({ contactCompanyLink: { findMany: async () => [{ code: 'C-9007199254740992' }] } } as unknown as PrismaClient, 'company-A')).rejects.toMatchObject({ code: 'contact_code_allocation_conflict' })
  })
  it('bounds only appropriate retries and preserves explicit code conflicts', async () => {
    const error = { code: 'P2002', meta: { target: 'uq_contact_company_code' } }
    const transaction = vi.fn().mockRejectedValue(error)
    const db = { $transaction: transaction } as unknown as PrismaClient
    await expect(createContact(db, 'company-A', { firstName: 'Synthetic' })).rejects.toMatchObject({ code: 'contact_code_allocation_conflict' })
    expect(transaction).toHaveBeenCalledTimes(5)
    transaction.mockClear()
    await expect(createContact(db, 'company-A', { firstName: 'Synthetic', code: 'LEGACY' })).rejects.toMatchObject({ code: 'contact_code_conflict' })
    expect(transaction).toHaveBeenCalledTimes(1)
  })
  it('re-reads the numeric maximum after collision without adding the retry index', async () => {
    const allocated: string[] = []
    const tx = {
      contactCompanyLink: {
        findMany: vi.fn().mockResolvedValueOnce([{ code: 'C-0009' }]).mockResolvedValueOnce([{ code: 'C-0010' }]),
        create: vi.fn(async ({ data }) => {
          allocated.push(data.code)
          if (allocated.length === 1) throw { code: 'P2002', meta: { target: ['companyId', 'code'] } }
        }),
        findUnique: vi.fn(async () => ({ code: allocated.at(-1), contact: { id: 'new', addresses: [], groupMemberships: [] } })),
      },
      contact: { create: vi.fn(async () => ({ id: 'new' })) },
    }
    const db = { $transaction: vi.fn(async callback => callback(tx)) } as unknown as PrismaClient
    await createContact(db, 'company-A', { firstName: 'Synthetic' })
    expect(allocated).toEqual(['C-0010', 'C-0011'])
  })
  it('propagates unrelated unique violations without retry or code-conflict masking', async () => {
    const error = { code: 'P2002', meta: { target: ['id'] } }
    const transaction = vi.fn().mockRejectedValue(error)
    await expect(createContact({ $transaction: transaction } as unknown as PrismaClient, 'company-A', { firstName: 'Synthetic' })).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
  it('recognizes the installed PrismaPg quoted field metadata', async () => {
    const transaction = vi.fn().mockRejectedValue({ code: 'P2002', meta: { modelName: 'ContactCompanyLink', driverAdapterError: { cause: { constraint: { fields: ['"companyId"', 'code'] } } } } })
    await expect(createContact({ $transaction: transaction } as unknown as PrismaClient, 'company-A', { firstName: 'Synthetic', code: 'LEGACY' })).rejects.toMatchObject({ code: 'contact_code_conflict' })
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
