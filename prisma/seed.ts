// OSSUM COR — Seed DEV mínimo multiempresa
// Ejecutar con: npx prisma db seed
// Idempotente: se puede ejecutar más de una vez sin duplicar datos.
// Prisma 7: usa driver adapter @prisma/adapter-pg

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Use DIRECT_URL for seed (session pooler, not transaction pooler)
const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── CUIDs deterministas para idempotencia ──────────────────────────
// Prefijos legibles + padding para formato CUID
function cuid(prefix: string, suffix: string): string {
  const padded = `${prefix}dev${suffix.padEnd(19, "0")}`;
  return padded.length >= 25 ? padded : padded.padEnd(25, "0");
}

const IDS = {
  org: cuid("org", "ossum1"),
  company: cuid("co", "districorr1"),
  branch: cuid("br", "casaCentral1"),
  user: cuid("us", "admin1"),
  userAccess: cuid("ua", "adminDistricorr1"),
  patient: cuid("ct", "patient1"),
  doctor: cuid("ct", "doctor1"),
  institution: cuid("ct", "institution1"),
  payer: cuid("ct", "payer1"),
  patientLink: cuid("cl", "patientDistricorr1"),
  doctorLink: cuid("cl", "doctorDistricorr1"),
  institutionLink: cuid("cl", "institutionDistricorr1"),
  payerLink: cuid("cl", "payerDistricorr1"),
  contactGroup: cuid("cg", "traumatologia1"),
  patientGroupMember: cuid("gm", "patientTraum1"),
  patientAddress: cuid("ad", "patient1"),
  surgery: cuid("sg", "surgery1"),
  auditEvent: cuid("ae", "seed1"),
} as const;

async function main() {
  console.log("🌱 Starting OSSUM COR DEV seed...");

  // ─── 1. Organization ────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "ossum-dev" },
    update: {},
    create: {
      id: IDS.org,
      name: "OSSUM DEV Organization",
      slug: "ossum-dev",
      taxId: "20-12345678-9",
      isActive: true,
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ─── 2. Company ─────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: IDS.company },
    update: {},
    create: {
      id: IDS.company,
      organizationId: org.id,
      name: "Districorr DEV",
      taxId: "30-87654321-0",
      isActive: true,
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  // ─── 3. Branch ───────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: IDS.branch },
    update: {},
    create: {
      id: IDS.branch,
      companyId: company.id,
      name: "Casa Central DEV",
      address: "Av. Siempre Viva 742, CABA",
      phone: "+54 11 1234-5678",
      isActive: true,
    },
  });
  console.log(`  ✓ Branch: ${branch.name}`);

  // ─── 4. User admin ──────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "admin.dev@ossum.local" },
    update: {},
    create: {
      id: IDS.user,
      supabaseAuthId: null,
      email: "admin.dev@ossum.local",
      firstName: "Admin",
      lastName: "DEV",
      phone: "+54 11 9999-9999",
      isActive: true,
    },
  });
  console.log(`  ✓ User: ${user.email}`);

  // ─── 5. UserCompanyAccess ───────────────────────────────────────────
  const userAccess = await prisma.userCompanyAccess.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: IDS.userAccess,
      userId: user.id,
      companyId: company.id,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`  ✓ UserCompanyAccess: admin → ${company.name}`);

  // ─── 6. Contacts ────────────────────────────────────────────────────
  const patient = await prisma.contact.upsert({
    where: { id: IDS.patient },
    update: {},
    create: {
      id: IDS.patient,
      firstName: "Juan",
      lastName: "Pérez",
      isCompany: false,
      email: "juan.perez.dev@ossum.local",
      phone: "+54 11 1111-1111",
      documentType: "DNI",
      documentNumber: "12345678",
      contactType: "patient",
      isActive: true,
    },
  });
  console.log(`  ✓ Contact (patient): ${patient.firstName} ${patient.lastName}`);

  const doctor = await prisma.contact.upsert({
    where: { id: IDS.doctor },
    update: {},
    create: {
      id: IDS.doctor,
      firstName: "Dra.",
      lastName: "García",
      isCompany: false,
      email: "dra.garcia.dev@ossum.local",
      phone: "+54 11 2222-2222",
      documentType: "DNI",
      documentNumber: "23456789",
      contactType: "doctor",
      isActive: true,
    },
  });
  console.log(`  ✓ Contact (doctor): ${doctor.firstName} ${doctor.lastName}`);

  const institution = await prisma.contact.upsert({
    where: { id: IDS.institution },
    update: {},
    create: {
      id: IDS.institution,
      legalName: "Hospital DEV",
      isCompany: true,
      email: "hospital.dev@ossum.local",
      phone: "+54 11 3333-3333",
      documentType: "CUIT",
      documentNumber: "30-99999999-1",
      contactType: "institution",
      isActive: true,
    },
  });
  console.log(`  ✓ Contact (institution): ${institution.legalName}`);

  const payer = await prisma.contact.upsert({
    where: { id: IDS.payer },
    update: {},
    create: {
      id: IDS.payer,
      legalName: "Obra Social DEV",
      isCompany: true,
      email: "obra.social.dev@ossum.local",
      phone: "+54 11 4444-4444",
      documentType: "CUIT",
      documentNumber: "30-88888888-2",
      contactType: "payer",
      isActive: true,
    },
  });
  console.log(`  ✓ Contact (payer): ${payer.legalName}`);

  // ─── 7. ContactCompanyLinks ─────────────────────────────────────────
  const patientLink = await prisma.contactCompanyLink.upsert({
    where: {
      contactId_companyId: {
        contactId: patient.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: IDS.patientLink,
      contactId: patient.id,
      companyId: company.id,
      role: "patient",
      isActive: true,
    },
  });
  console.log(`  ✓ ContactCompanyLink: patient → ${company.name}`);

  const doctorLink = await prisma.contactCompanyLink.upsert({
    where: {
      contactId_companyId: {
        contactId: doctor.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: IDS.doctorLink,
      contactId: doctor.id,
      companyId: company.id,
      role: "doctor",
      isActive: true,
    },
  });
  console.log(`  ✓ ContactCompanyLink: doctor → ${company.name}`);

  const institutionLink = await prisma.contactCompanyLink.upsert({
    where: {
      contactId_companyId: {
        contactId: institution.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: IDS.institutionLink,
      contactId: institution.id,
      companyId: company.id,
      role: "institution",
      isActive: true,
    },
  });
  console.log(`  ✓ ContactCompanyLink: institution → ${company.name}`);

  const payerLink = await prisma.contactCompanyLink.upsert({
    where: {
      contactId_companyId: {
        contactId: payer.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: IDS.payerLink,
      contactId: payer.id,
      companyId: company.id,
      role: "payer",
      isActive: true,
    },
  });
  console.log(`  ✓ ContactCompanyLink: payer → ${company.name}`);

  // ─── 8. ContactGroup ────────────────────────────────────────────────
  const contactGroup = await prisma.contactGroup.upsert({
    where: { id: IDS.contactGroup },
    update: {},
    create: {
      id: IDS.contactGroup,
      companyId: company.id,
      name: "Traumatología General DEV",
      description: "Grupo de contactos de traumatología para DEV",
      isActive: true,
    },
  });
  console.log(`  ✓ ContactGroup: ${contactGroup.name}`);

  // ─── 9. ContactGroupMembership ──────────────────────────────────────
  const patientGroupMember = await prisma.contactGroupMembership.upsert({
    where: {
      groupId_contactId: {
        groupId: contactGroup.id,
        contactId: patient.id,
      },
    },
    update: {},
    create: {
      id: IDS.patientGroupMember,
      groupId: contactGroup.id,
      contactId: patient.id,
    },
  });
  console.log(`  ✓ ContactGroupMembership: patient → ${contactGroup.name}`);

  // ─── 10. ContactAddress ─────────────────────────────────────────────
  const patientAddress = await prisma.contactAddress.upsert({
    where: { id: IDS.patientAddress },
    update: {},
    create: {
      id: IDS.patientAddress,
      contactId: patient.id,
      street: "Av. Siempre Viva",
      number: "742",
      city: "CABA",
      state: "Buenos Aires",
      zipCode: "C1427",
      country: "AR",
      isMain: true,
      addressType: "home",
    },
  });
  console.log(`  ✓ ContactAddress: patient home address`);

  // ─── 11. Surgery demo ───────────────────────────────────────────────
  const surgery = await prisma.surgery.upsert({
    where: { id: IDS.surgery },
    update: {
      branchId: branch.id,
      visibleNumber: "CX-DEV-2026-0001",
      patientId: patient.id,
      doctorId: doctor.id,
      institutionId: institution.id,
      payerContactId: payer.id,
      classification: "traumatología general",
      description: "Cirugía demo DEV — traumatología general",
      priority: "normal",
      cxStatus: "pending",
      surgeryDate: new Date("2026-06-15T10:00:00Z"),
      source: "seed",
      notes: "Cirugía demo DEV — traumatología general",
    },
    create: {
      id: IDS.surgery,
      companyId: company.id,
      branchId: branch.id,
      visibleNumber: "CX-DEV-2026-0001",
      patientId: patient.id,
      doctorId: doctor.id,
      institutionId: institution.id,
      payerContactId: payer.id,
      classification: "traumatología general",
      description: "Cirugía demo DEV — traumatología general",
      priority: "normal",
      cxStatus: "pending",
      surgeryDate: new Date("2026-06-15T10:00:00Z"),
      source: "seed",
      notes: "Cirugía demo DEV — traumatología general",
    },
  });
  console.log(`  ✓ Surgery: ${surgery.id.substring(0, 12)}... (cxStatus: ${surgery.cxStatus})`);

  // ─── 12. AuditEvent ─────────────────────────────────────────────────
  const auditEvent = await prisma.auditEvent.upsert({
    where: { id: IDS.auditEvent },
    update: {
      detail: "Cirugía demo creada por seed DEV",
      newValue: {
        visibleNumber: "CX-DEV-2026-0001",
        patientId: patient.id,
        doctorId: doctor.id,
        institutionId: institution.id,
        payerContactId: payer.id,
        classification: "traumatología general",
        description: "Cirugía demo DEV — traumatología general",
        priority: "normal",
        cxStatus: "pending",
        prepStatus: null,
        surgeryDate: "2026-06-15T10:00:00Z",
        source: "seed",
      },
      metadata: {
        seed: true,
        environment: "dev",
        version: "init",
      },
    },
    create: {
      id: IDS.auditEvent,
      companyId: company.id,
      userId: user.id,
      entityType: "Surgery",
      entityId: surgery.id,
      action: "seed.created",
      detail: "Cirugía demo creada por seed DEV",
      newValue: {
        visibleNumber: "CX-DEV-2026-0001",
        patientId: patient.id,
        doctorId: doctor.id,
        institutionId: institution.id,
        payerContactId: payer.id,
        classification: "traumatología general",
        description: "Cirugía demo DEV — traumatología general",
        priority: "normal",
        cxStatus: "pending",
        prepStatus: null,
        surgeryDate: "2026-06-15T10:00:00Z",
        source: "seed",
      },
      module: "backend_foundation",
      metadata: {
        seed: true,
        environment: "dev",
        version: "init",
      },
    },
  });
  console.log(`  ✓ AuditEvent: ${auditEvent.action} (${auditEvent.module})`);

  console.log("\n✅ DEV seed completed successfully!");
  console.log(`   Organization: ${org.name} (${org.slug})`);
  console.log(`   Company: ${company.name}`);
  console.log(`   Branch: ${branch.name}`);
  console.log(`   User: ${user.email} (role: admin)`);
  console.log(`   Contacts: 4 (patient, doctor, institution, payer)`);
  console.log(`   Surgery: 1 (pending)`);
  console.log(`   AuditEvent: 1`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
