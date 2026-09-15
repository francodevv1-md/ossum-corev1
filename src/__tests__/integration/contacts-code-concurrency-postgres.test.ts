import type { PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { updateContact } from "@/lib/services/contact.service"

const RUN_FLAG = "OSSUM_RUN_CONTACT_CODE_CONCURRENCY_DEV_INTEGRATION"
const DEV_PROJECT_REF = "yywqcdromnmmelijvspi"
if (process.env[RUN_FLAG] === "true") {
  loadEnv({ path: ".env.local", override: false })
  loadEnv({ path: ".env", override: false })
}

const integrationDescribe = process.env[RUN_FLAG] === "true" ? describe : describe.skip
let prisma: PrismaClient | undefined

function assertDisposableDevTarget() {
  if (process.env.OSSUM_DEPLOYMENT_TIER !== "development" || process.env.NODE_ENV === "production") {
    throw new Error("Contact code concurrency test refused: explicit DEV gate is not satisfied")
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("Contact code concurrency test refused: DATABASE_URL is missing")
  const database = new URL(databaseUrl)
  if (!database.hostname.includes(DEV_PROJECT_REF) && !database.username.includes(DEV_PROJECT_REF)) {
    throw new Error("Contact code concurrency test refused: database is not the approved DEV project")
  }
}

integrationDescribe("Contact company code allocation on PostgreSQL", () => {
  beforeAll(async () => {
    assertDisposableDevTarget()
    prisma = (await import("@/lib/prisma")).default
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("allocates distinct canonical codes for concurrent company links", async () => {
    if (!prisma) throw new Error("Contact code concurrency Prisma client is unavailable")
    const company = await prisma.company.findFirst({ select: { id: true } })
    if (!company) throw new Error("Contact code concurrency test needs one DEV company")

    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const contacts = await Promise.all([
      prisma.contact.create({ data: { firstName: `Concurrency A ${token}` } }),
      prisma.contact.create({ data: { firstName: `Concurrency B ${token}` } }),
    ])

    try {
      const links = await Promise.all(contacts.map((contact) => prisma!.contactCompanyLink.create({
        data: { contactId: contact.id, companyId: company.id, role: "patient", roles: ["cliente"] },
        select: { code: true },
      })))

      expect(links[0].code).toMatch(/^C-\d{4,}$/)
      expect(links[1].code).toMatch(/^C-\d{4,}$/)
      expect(links[0].code).not.toBe(links[1].code)
    } finally {
      await prisma.contactCompanyLink.deleteMany({ where: { contactId: { in: contacts.map((contact) => contact.id) } } })
      await prisma.contact.deleteMany({ where: { id: { in: contacts.map((contact) => contact.id) } } })
    }
  })

  it("rejects malformed and duplicate explicit codes", async () => {
    if (!prisma) throw new Error("Contact code constraint Prisma client is unavailable")
    const company = await prisma.company.findFirst({ select: { id: true } })
    if (!company) throw new Error("Contact code constraint test needs one DEV company")

    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const contacts = await Promise.all([
      prisma.contact.create({ data: { firstName: `Constraint A ${token}` } }),
      prisma.contact.create({ data: { firstName: `Constraint B ${token}` } }),
    ])
    const code = `C-${Date.now()}`

    try {
      await expect(prisma.contactCompanyLink.create({
        data: { contactId: contacts[0].id, companyId: company.id, code: "BAD-1", role: "patient", roles: ["cliente"] },
      })).rejects.toThrow()
      await prisma.contactCompanyLink.create({
        data: { contactId: contacts[0].id, companyId: company.id, code, role: "patient", roles: ["cliente"] },
      })
      await expect(prisma.contactCompanyLink.create({
        data: { contactId: contacts[1].id, companyId: company.id, code, role: "patient", roles: ["cliente"] },
      })).rejects.toThrow()
    } finally {
      await prisma.contactCompanyLink.deleteMany({ where: { contactId: { in: contacts.map((contact) => contact.id) } } })
      await prisma.contact.deleteMany({ where: { id: { in: contacts.map((contact) => contact.id) } } })
    }
  })

  it("preserves a structured house number when an unchanged combined address is edited", async () => {
    if (!prisma) throw new Error("Contact address round-trip Prisma client is unavailable")
    const company = await prisma.company.findFirst({ select: { id: true } })
    if (!company) throw new Error("Contact address round-trip test needs one DEV company")

    const contact = await prisma.contact.create({ data: { firstName: `Address ${Date.now()}` } })
    try {
      await prisma.contactCompanyLink.create({
        data: { contactId: contact.id, companyId: company.id, role: "patient", roles: ["cliente"] },
      })
      await prisma.contactAddress.create({
        data: { contactId: contact.id, companyId: company.id, street: "Av. Norte", number: "42", city: "Resistencia", isMain: true },
      })

      await updateContact(prisma, company.id, contact.id, {
        firstName: contact.firstName,
        mainAddress: { street: "Av. Norte 42", city: "Resistencia" },
      })

      await expect(prisma.contactAddress.findFirst({ where: { companyId: company.id, contactId: contact.id, isMain: true } })).resolves.toMatchObject({
        street: "Av. Norte",
        number: "42",
      })
    } finally {
      await prisma.contactAddress.deleteMany({ where: { contactId: contact.id } })
      await prisma.contactCompanyLink.deleteMany({ where: { contactId: contact.id } })
      await prisma.contact.delete({ where: { id: contact.id } })
    }
  })
})
