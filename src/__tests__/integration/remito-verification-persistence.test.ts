import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SQL_PATH = resolve("prisma/migrations/20260811000000_remito_qr_barcode_001/migration.sql");
const sql = readFileSync(SQL_PATH, "utf8");
const DB_GATE = "OSSUM_RUN_REMITO_PERSISTENCE_DB_INTEGRATION";
const DB_ACK = "OSSUM_ACK_DISPOSABLE_REMITO_PERSISTENCE_DATABASE";
const MANAGED_DB_ACK = "OSSUM_ACK_MANAGED_DISPOSABLE_REMITO_PERSISTENCE_DATABASE";

const constructs = [
  "pk_remito_scan_locator_locator", "ck_remito_scan_locator_version", "ck_remito_scan_locator_rm1",
  "uq_remito_scan_locator_company_locator", "uq_remito_scan_locator_company_remito", "uq_remito_scan_locator_tenant_lineage", "ix_remito_scan_locator_company_issued", "fk_remito_scan_locator_company", "fk_remito_scan_locator_remito", "trg_remito_locator_guard", "trg_remito_locator_publication_deferred", "remito_rm1_is_valid",
  "ck_remito_publication_version", "ck_remito_publication_status", "ck_remito_publication_current_slot",
  "ck_remito_publication_replacement_parity", "ck_remito_publication_fingerprint_sha256", "fk_remito_publication_locator", "fk_remito_publication_replacement",
  "uq_remito_publication_company_id", "uq_remito_publication_tenant_lineage", "uq_remito_publication_version", "uq_remito_publication_current", "ix_remito_publication_status", "ix_remito_publication_published", "fk_remito_publication_company", "fk_remito_publication_remito", "trg_remito_publication_guard", "trg_remito_publication_current_deferred",
  "ck_remito_access_version", "ck_remito_access_key_version", "ck_remito_access_status",
  "ck_remito_access_current_slot", "ck_remito_access_lifecycle_parity", "ck_remito_access_token_nonce", "ck_remito_access_token_nonce_tail", "ck_remito_access_token_hash", "fk_remito_access_publication",
  "fk_remito_access_supersession", "uq_remito_access_token_hash", "uq_remito_access_company_id", "uq_remito_access_tenant_lineage", "uq_remito_access_version", "uq_remito_access_current", "ix_remito_access_status", "ix_remito_access_issued", "fk_remito_access_company", "trg_remito_access_guard", "trg_remito_access_current_deferred",
  "ck_public_rate_counters", "ck_public_rate_expiry", "ck_public_rate_source_fingerprint", "ix_public_rate_expiry", "ix_public_rate_blocked", "trg_public_rate_retention_immutable",
  "ck_remito_metric_count", "uq_remito_metric_dimensions", "ix_remito_metric_day", "fk_remito_metric_company",
];

describe("REMITO-QR-BARCODE-001 migration artifact (DB-disconnected)", () => {
  it("declares all five tables and nullable AuditEvent.entityId", () => {
    for (const table of ["RemitoScanLocator", "RemitoVerificationPublication", "RemitoVerificationAccess", "PublicVerificationRateBucket", "RemitoVerificationDailyMetric"]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql).toContain('ALTER TABLE "AuditEvent" ALTER COLUMN "entityId" DROP NOT NULL');
  });

  it.each(constructs)("contains named invariant %s", (name) => expect(sql).toContain(`"${name}"`));

  it("declares restrictive tenant FKs, deferred lineage/current checks, and denial guards", () => {
    expect(sql.match(/ON DELETE RESTRICT/g)?.length).toBeGreaterThanOrEqual(9);
    expect(sql.match(/DEFERRABLE INITIALLY DEFERRED/g)?.length).toBe(5);
    for (const proof of ["insertion must be initial current state", "current access requires current publication", "immutable and non-reusable", "deletion denied", "illegal publication mutation", "illegal access mutation", "increase by exactly one", "exactly one current publication", "invalid current access cardinality", "29 days"]) expect(sql).toContain(proof);
    expect(sql).toContain("^[A-Za-z0-9_-]{43}$");
    expect(sql).toContain("[AEIMQUYcgkosw048]$");
    expect(sql.match(/\^\[0-9a-f\]\{64\}\$/g)?.length).toBe(3);
  });

  it("distinguishes canonical 32-byte base64url tails from syntactically valid aliases", () => {
    const syntax = /^[A-Za-z0-9_-]{43}$/;
    const canonicalTail = /[AEIMQUYcgkosw048]$/;
    expect(syntax.test(`${"A".repeat(42)}A`)).toBe(true);
    expect(syntax.test(`${"A".repeat(42)}B`)).toBe(true);
    expect(canonicalTail.test(`${"A".repeat(42)}A`)).toBe(true);
    expect(canonicalTail.test(`${"A".repeat(42)}B`)).toBe(false);
  });
});

const dbDescribe = process.env[DB_GATE] === "true" ? describe : describe.skip;
dbDescribe("future isolated PostgreSQL execution contract", () => {
  let client: import("pg").Client;
  type Fixture = { locator: string; companyId: string; remitoId: string; draftRemitoId: string; publicationId: string; replacementPublicationId: string; accessId: string; nonCurrentPublicationId: string; userId: string };
  let fixture: Fixture;
  beforeAll(async () => {
    const rawUrl = process.env.OSSUM_REMITO_PERSISTENCE_TEST_DATABASE_URL;
    if (process.env[DB_GATE] !== "true" || process.env[DB_ACK] !== "I_ACKNOWLEDGE_THIS_DATABASE_IS_DISPOSABLE" || !rawUrl) throw new Error(`Explicit gate, isolated URL, and ${DB_ACK}=I_ACKNOWLEDGE_THIS_DATABASE_IS_DISPOSABLE are required`);
    const url = new URL(rawUrl);
    const managed = /supabase|neon|pooler/i.test(`${url.hostname}${url.pathname}${url.search}`);
    if (/prod(uction)?/i.test(`${url.hostname}${url.pathname}${url.search}`)) throw new Error("Refusing an obvious production database URL");
    if (managed && process.env[MANAGED_DB_ACK] !== "I_ACKNOWLEDGE_THIS_MANAGED_DATABASE_IS_DISPOSABLE") throw new Error(`${MANAGED_DB_ACK}=I_ACKNOWLEDGE_THIS_MANAGED_DATABASE_IS_DISPOSABLE is required for a managed database`);
    if (!managed && !/(localhost|127\.0\.0\.1|test|disposable|ephemeral)/i.test(`${url.hostname}${url.pathname}`)) throw new Error("Refusing a non-disposable database URL");
    const { Client } = await import("pg");
    client = new Client({ connectionString: rawUrl });
    await client.connect();
    await client.query("BEGIN");

    const id = randomUUID();
    const organizationId = `remito-persistence-org-${id}`;
    const branchId = `remito-persistence-branch-${id}`;
    const initialPublicationId = `remito-persistence-publication-initial-${id}`;
    const initialAccessId = `remito-persistence-access-initial-${id}`;
    fixture = {
      locator: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
      companyId: `remito-persistence-company-${id}`,
      remitoId: `remito-persistence-issued-${id}`,
      draftRemitoId: `remito-persistence-draft-${id}`,
      publicationId: `remito-persistence-publication-${id}`,
      replacementPublicationId: `remito-persistence-publication-${id}`,
      accessId: `remito-persistence-access-${id}`,
      nonCurrentPublicationId: initialPublicationId,
      userId: `remito-persistence-user-${id}`,
    };
    await client.query('INSERT INTO "Organization"("id","name","slug","updatedAt") VALUES($1,\'Remito persistence test\',$2,now())', [organizationId, `remito-persistence-${id}`]);
    await client.query('INSERT INTO "Company"("id","organizationId","name","taxId","updatedAt") VALUES($1,$2,\'Remito persistence test\',\'30123456789\',now())', [fixture.companyId, organizationId]);
    await client.query('INSERT INTO "User"("id","email","firstName","lastName","updatedAt") VALUES($1,$2,\'Remito\',\'Persistence\',now())', [fixture.userId, `remito-persistence-${id}@example.invalid`]);
    await client.query('INSERT INTO "Branch"("id","companyId","name","updatedAt") VALUES($1,$2,\'Test branch\',now())', [branchId, fixture.companyId]);
    await client.query('INSERT INTO "Remito"("id","companyId","branchId","issuedBranchId","origin","state","issuedAt","createdById","updatedById","updatedAt") VALUES($1,$2,$3,$3,\'manual\',\'Emitido\',now(),$4,$4,now()),($5,$2,$3,NULL,\'manual\',\'Borrador\',NULL,$4,$4,now())', [fixture.remitoId, fixture.companyId, branchId, fixture.userId, fixture.draftRemitoId]);
    await client.query('INSERT INTO "RemitoScanLocator"("locator","companyId","remitoId","issuedAt") VALUES($1,$2,$3,now())', [fixture.locator, fixture.companyId, fixture.remitoId]);
    await client.query('INSERT INTO "RemitoVerificationPublication"("id","companyId","remitoId","version","issuerDisplayNameSnapshot","issuerTaxIdSnapshot","documentTypeSnapshot","issuedDateSnapshot","remitoShortCodeSnapshot","fingerprintVersion","fingerprintSha256","publishedAt") VALUES($1,$2,$3,1,\'Remito persistence test\',\'30123456789\',\'REMITO_SALIDA\',current_date,$4,\'RF1\',repeat(\'1\',64),now())', [initialPublicationId, fixture.companyId, fixture.remitoId, fixture.locator]);
    await client.query('INSERT INTO "RemitoVerificationAccess"("id","companyId","remitoId","publicationId","version","tokenNonce","tokenKeyVersion","tokenHash","issuedAt") VALUES($1,$2,$3,$4,1,repeat(\'A\',43),1,repeat(\'2\',64),now())', [initialAccessId, fixture.companyId, fixture.remitoId, initialPublicationId]);
    await client.query('UPDATE "RemitoVerificationAccess" SET "status"=\'revoked\',"currentSlot"=NULL,"revokedAt"=now() WHERE "id"=$1', [initialAccessId]);
    await client.query('UPDATE "RemitoVerificationPublication" SET "status"=\'replaced\',"currentSlot"=NULL,"replacedAt"=now(),"replacedByPublicationId"=$2 WHERE "id"=$1', [initialPublicationId, fixture.publicationId]);
    await client.query('INSERT INTO "RemitoVerificationPublication"("id","companyId","remitoId","version","issuerDisplayNameSnapshot","issuerTaxIdSnapshot","documentTypeSnapshot","issuedDateSnapshot","remitoShortCodeSnapshot","fingerprintVersion","fingerprintSha256","publishedAt") VALUES($1,$2,$3,2,\'Remito persistence test\',\'30123456789\',\'REMITO_SALIDA\',current_date,$4,\'RF1\',repeat(\'3\',64),now())', [fixture.publicationId, fixture.companyId, fixture.remitoId, fixture.locator]);
    await client.query('INSERT INTO "RemitoVerificationAccess"("id","companyId","remitoId","publicationId","version","tokenNonce","tokenKeyVersion","tokenHash","issuedAt") VALUES($1,$2,$3,$4,1,repeat(\'E\',43),1,repeat(\'5\',64),now())', [fixture.accessId, fixture.companyId, fixture.remitoId, fixture.publicationId]);
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await client.query("SET CONSTRAINTS ALL DEFERRED");
  });
  afterAll(async () => {
    if (!client) return;
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  let savepoint = 0;
  async function isolated(run: () => Promise<void>) {
    const name = `remito_persistence_${savepoint++}`;
    await client.query(`SAVEPOINT ${name}`);
    try { await run(); } finally {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
      await client.query(`RELEASE SAVEPOINT ${name}`);
      await client.query("SET CONSTRAINTS ALL DEFERRED");
    }
  }

  async function rejected(statement: string, values: unknown[] = []) {
    await isolated(async () => {
      await expect((async () => {
        await client.query(statement, values);
        await client.query("SET CONSTRAINTS ALL IMMEDIATE");
      })()).rejects.toThrow();
    });
  }

  it("exposes every named check, FK, function, and trigger after future migration execution", async () => {
    const result = await client.query<{ name: string }>("SELECT conname AS name FROM pg_constraint UNION SELECT proname FROM pg_proc UNION SELECT tgname FROM pg_trigger WHERE NOT tgisinternal UNION SELECT indexname FROM pg_indexes WHERE schemaname=current_schema()");
    const names = new Set(result.rows.map(({ name }) => name));
    for (const name of constructs) expect(names.has(name)).toBe(true);
  });

  it("validates RM1 vectors and issued-only immutable locator with rollback", async () => {
    const vectors = await client.query<{ valid: boolean; invalid: boolean }>('SELECT "remito_rm1_is_valid"(\'RM1-04HM-ASW9-NF6Y-ZZPW-M\') valid, "remito_rm1_is_valid"(\'RM1-04HM-ASW9-NF6Y-ZZPW-0\') invalid');
    expect(vectors.rows[0]).toEqual({ valid: true, invalid: false });
    await rejected('INSERT INTO "RemitoScanLocator"("locator","companyId","remitoId","issuedAt") VALUES(\'RM1-0000-0000-0000-0000-B\',$1,$2,now())', [fixture.companyId, fixture.draftRemitoId]);
    for (const statement of ['UPDATE "RemitoScanLocator" SET "version"=2 WHERE "locator"=$1', 'DELETE FROM "RemitoScanLocator" WHERE "locator"=$1']) await rejected(statement, [fixture.locator]);
    expect((await client.query('SELECT "version" FROM "RemitoScanLocator" WHERE "locator"=$1', [fixture.locator])).rows).toEqual([{ version: 1 }]);
  });

  it("rejects tenant, uniqueness, initial lifecycle, canonical material, and counter violations", async () => {
    const cases: Array<[string, unknown[]]> = [
      ['INSERT INTO "RemitoScanLocator"("locator","companyId","remitoId","issuedAt") VALUES(\'RM1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-H\',\'wrong-tenant\',$1,now())', [fixture.remitoId]],
      ['INSERT INTO "RemitoScanLocator"("locator","companyId","remitoId","issuedAt") VALUES($1,$2,$3,now())', [fixture.locator, fixture.companyId, fixture.remitoId]],
      ['UPDATE "RemitoVerificationPublication" SET "status"=\'replaced\',"currentSlot"=NULL,"replacedAt"=now(),"replacedByPublicationId"=\'missing\' WHERE "id"=$1', [fixture.publicationId]],
      ['INSERT INTO "RemitoVerificationPublication" SELECT \"id\"||\'-terminal\',\"companyId\",\"remitoId\",\"version\"+100,\'replaced\',NULL,\"issuerDisplayNameSnapshot\",\"issuerTaxIdSnapshot\",\"documentTypeSnapshot\",\"issuedDateSnapshot\",\"remitoShortCodeSnapshot\",\"fingerprintVersion\",\"fingerprintSha256\",now(),now(),$2,now() FROM "RemitoVerificationPublication" WHERE "id"=$1', [fixture.publicationId, fixture.replacementPublicationId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-terminal\',\"companyId\",\"remitoId\",\"publicationId\",\"version\"+100,\'revoked\',NULL,\"tokenNonce\",\"tokenKeyVersion\",repeat(\'c\',64),\"issuedAt\",NULL,now(),NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-orphan\',\"companyId\",\"remitoId\",$2,1,\'current\',1,\"tokenNonce\",\"tokenKeyVersion\",repeat(\'d\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId, fixture.nonCurrentPublicationId]],
      ['INSERT INTO "RemitoVerificationPublication" SELECT \"id\"||\'-hash\',\"companyId\",\"remitoId\",\"version\"+1,\'current\',1,\"issuerDisplayNameSnapshot\",\"issuerTaxIdSnapshot\",\"documentTypeSnapshot\",\"issuedDateSnapshot\",\"remitoShortCodeSnapshot\",\"fingerprintVersion\",repeat(\'A\',64),now(),NULL,NULL,now() FROM "RemitoVerificationPublication" WHERE "id"=$1', [fixture.publicationId]],
      ['INSERT INTO "RemitoVerificationPublication" SELECT \"id\"||\'-gap\',\"companyId\",\"remitoId\",\"version\"+100,\'current\',1,\"issuerDisplayNameSnapshot\",\"issuerTaxIdSnapshot\",\"documentTypeSnapshot\",\"issuedDateSnapshot\",\"remitoShortCodeSnapshot\",\"fingerprintVersion\",\"fingerprintSha256\",now(),NULL,NULL,now() FROM "RemitoVerificationPublication" WHERE "id"=$1', [fixture.publicationId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-nonce\',\"companyId\",\"remitoId\",\"publicationId\",\"version\"+1,\'current\',1,repeat(\'+\',43),\"tokenKeyVersion\",repeat(\'e\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-alias\',\"companyId\",\"remitoId\",\"publicationId\",\"version\"+1,\'current\',1,repeat(\'A\',42)||\'B\',\"tokenKeyVersion\",repeat(\'9\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-hash\',\"companyId\",\"remitoId\",\"publicationId\",\"version\"+1,\'current\',1,\"tokenNonce\",\"tokenKeyVersion\",repeat(\'A\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId]],
      ['INSERT INTO "RemitoVerificationAccess" SELECT \"id\"||\'-gap\',\"companyId\",\"remitoId\",\"publicationId\",\"version\"+100,\'current\',1,\"tokenNonce\",\"tokenKeyVersion\",repeat(\'f\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId]],
      ['INSERT INTO "PublicVerificationRateBucket" VALUES(repeat(\'A\',64),current_date,now(),now(),0,0,NULL,now()+interval \'29 days\',now())', []],
      ['INSERT INTO "PublicVerificationRateBucket" VALUES(repeat(\'a\',64),current_date,now(),now(),0,1,NULL,now()+interval \'29 days\',now())', []],
      ['INSERT INTO "RemitoVerificationDailyMetric" VALUES(\'bad\',$1,current_date,\'public_qr\',\'valid\',0,now())', [fixture.companyId]],
    ];
    for (const entry of cases) await rejected(...entry);
  });

  it("proves lifecycle guards, monotonic/cardinality rules, retention immutability, nullable audit, and rejection rollback", async () => {
    for (const statement of [
      'DELETE FROM "RemitoVerificationPublication" WHERE "id"=$1', 'DELETE FROM "RemitoVerificationAccess" WHERE "id"=$2',
      'UPDATE "RemitoVerificationPublication" SET "version"="version"+1 WHERE "id"=$1', 'UPDATE "RemitoVerificationAccess" SET "version"="version"+1 WHERE "id"=$2',
      'UPDATE "RemitoVerificationAccess" SET "status"=\'revoked\',"currentSlot"=NULL,"revokedAt"=now() WHERE "id"=$2; UPDATE "RemitoVerificationAccess" SET "status"=\'current\',"currentSlot"=1,"revokedAt"=NULL WHERE "id"=$2',
    ]) await rejected(statement, [fixture.publicationId, fixture.accessId]);
    await isolated(async () => {
      const publicationTarget = `${fixture.publicationId}-replacement`;
      await client.query('UPDATE "RemitoVerificationAccess" SET "status"=\'revoked\',"currentSlot"=NULL,"revokedAt"=now() WHERE "id"=$1', [fixture.accessId]);
      await client.query('UPDATE "RemitoVerificationPublication" SET "status"=\'replaced\',"currentSlot"=NULL,"replacedAt"=now(),"replacedByPublicationId"=$2 WHERE "id"=$1', [fixture.publicationId, publicationTarget]);
      await client.query('INSERT INTO "RemitoVerificationPublication" SELECT $2,"companyId","remitoId","version"+1,\'current\',1,"issuerDisplayNameSnapshot","issuerTaxIdSnapshot","documentTypeSnapshot","issuedDateSnapshot","remitoShortCodeSnapshot","fingerprintVersion","fingerprintSha256",now(),NULL,NULL,now() FROM "RemitoVerificationPublication" WHERE "id"=$1', [fixture.publicationId, publicationTarget]);
      await client.query('INSERT INTO "RemitoVerificationAccess" SELECT $2,"companyId","remitoId",$3,1,\'current\',1,repeat(\'A\',43),"tokenKeyVersion",repeat(\'8\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId, `${fixture.accessId}-publication`, publicationTarget]);
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    });
    await isolated(async () => {
      const accessTarget = `${fixture.accessId}-rotation`;
      await client.query('UPDATE "RemitoVerificationAccess" SET "status"=\'replaced\',"currentSlot"=NULL,"replacedAt"=now(),"supersededByAccessId"=$2 WHERE "id"=$1', [fixture.accessId, accessTarget]);
      await client.query('INSERT INTO "RemitoVerificationAccess" SELECT $2,"companyId","remitoId","publicationId","version"+1,\'current\',1,repeat(\'A\',43),"tokenKeyVersion",repeat(\'4\',64),now(),NULL,NULL,NULL,now() FROM "RemitoVerificationAccess" WHERE "id"=$1', [fixture.accessId, accessTarget]);
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    });
    await isolated(async () => {
      await client.query('INSERT INTO "PublicVerificationRateBucket" VALUES(repeat(\'b\',64),current_date,now(),now(),0,0,NULL,now()+interval \'29 days\',now())');
      await expect(client.query('UPDATE "PublicVerificationRateBucket" SET "firstSeenAt"="firstSeenAt"+interval \'1 second\' WHERE "sourceFingerprint"=repeat(\'b\',64)')).rejects.toThrow();
    });
    await isolated(async () => { await client.query('INSERT INTO "AuditEvent"("id","companyId","userId","entityType","entityId","action","module","createdAt") VALUES($1,$2,$3,\'RemitoScanAttempt\',NULL,\'denied\',\'remitos\',now())', [`audit-${Date.now()}`, fixture.companyId, fixture.userId]); });
  });
});
