import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cajas maintenance persistence artifact", () => {
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
  const migration = readFileSync(resolve("prisma/migrations/20260827010000_cajas_maintenance_control_v1/migration.sql"), "utf8");
  const operationalMigration = readFileSync(resolve("prisma/migrations/20260813000000_remito_stock_atomic_dispatch_persistence_001/migration.sql"), "utf8");

  it("is additive, tenant-scoped, and keeps the optional Article at company eligibility", () => {
    expect(schema).toContain("model CajasMaintenanceCase {");
    expect(schema).toContain("model CajasMaintenanceTransition {");
    expect(schema).toMatch(/articleId\s+String\?\s+@map\("article_id"\)/);
    expect(schema).toMatch(/articleEligibility\s+StockArticleEligibility\?\s+@relation\("CajasMaintenanceArticle"/);
    expect(migration).toContain('CONSTRAINT "fk_cmc_unit" FOREIGN KEY ("company_id", "box_identified_unit_id")');
    expect(migration).toContain('CONSTRAINT "fk_cmc_article" FOREIGN KEY ("company_id", "article_id")');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
  });

  it("enforces only the approved state graph, optimistic version, immutable cases, and append-only history", () => {
    expect(migration).toContain('CONSTRAINT "ck_cmc_version_description"');
    expect(migration).toContain('CONSTRAINT "ck_cmt_sequence_note_edge"');
    expect(migration).toContain("(\"sequence\" = 1 AND \"from_status\" IS NULL AND \"to_status\" = 'open')");
    expect(migration).toContain("(\"from_status\" = 'open' AND \"to_status\" IN ('sent', 'cancelled'))");
    expect(migration).toContain("(\"from_status\" = 'sent' AND \"to_status\" = 'returned_pending_review')");
    expect(migration).toContain("(\"from_status\" = 'returned_pending_review' AND \"to_status\" = 'closed')");
    expect(migration).toContain('CREATE TRIGGER "trg_cmc_guard"');
    expect(migration).toContain('NEW."version" <> OLD."version" + 1');
    expect(migration).toContain('CREATE TRIGGER "trg_cmt_append_only"');
    expect(migration).toContain('CREATE CONSTRAINT TRIGGER "ctrg_cmc_transition_consistency"');
    expect(migration).toContain('CREATE CONSTRAINT TRIGGER "ctrg_cmt_case_consistency"');
    expect(migration.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(2);
  });

  it("rejects fabricated case origins, gaps, and disconnected transition chains", () => {
    expect(migration).toContain("IF TG_OP = 'INSERT' THEN");
    expect(migration).toContain(`NEW."status" <> 'open' OR NEW."version" <> 1`);
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "public"."cajas_maintenance_case"');
    expect(migration).toContain('"sequence" = 1 AND "from_status" IS NULL AND "to_status" = \'open\'');
    expect(migration).toContain('"sequence" > 1');
    expect(migration).toContain('AND "from_status" IS NOT NULL');
    expect(migration).toContain('"sequence" = NEW."sequence" - 1');
    expect(migration).toContain('previous_status IS DISTINCT FROM NEW."from_status"');
    expect(migration).toContain('CREATE TRIGGER "trg_cmt_insert_guard"');
  });

  it("keeps the opening description immutable", () => {
    expect(migration).toContain('OLD."description" IS DISTINCT FROM NEW."description"');
  });

  it("binds each transition uniquely to command acceptance, audit, actor, and server timestamps", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "uq_cmt_command"');
    expect(migration).toContain('CREATE UNIQUE INDEX "uq_cmt_audit"');
    expect(migration).toContain('CONSTRAINT "fk_cmt_command"');
    expect(migration).toContain('CONSTRAINT "fk_cmt_audit"');
    expect(migration).toContain('CONSTRAINT "fk_cmt_actor"');
    expect(migration).toContain('"accepted_at" TIMESTAMPTZ(6) NOT NULL');
    expect(migration).toContain('accepted_command."resultEntityId" IS DISTINCT FROM NEW."case_id"');
    expect(migration).toContain(`accepted_command."domain" IS DISTINCT FROM 'cajas'`);
    expect(migration).toContain(`accepted_command."resultEntityType" IS DISTINCT FROM 'CajasMaintenanceCase'`);
    expect(migration).toContain('accepted_command."acceptedById" IS DISTINCT FROM NEW."accepted_by_id"');
    expect(migration).toContain('accepted_command."acceptedAt" IS DISTINCT FROM NEW."accepted_at"');
    expect(migration).toContain('accepted_command."auditEventId" IS DISTINCT FROM NEW."audit_event_id"');
    expect(migration).toContain('audit_event."userId" IS DISTINCT FROM NEW."accepted_by_id"');
    expect(migration).toContain('audit_event."entityId" IS DISTINCT FROM NEW."case_id"');
    expect(migration).toContain(`audit_event."entityType" IS DISTINCT FROM 'CajasMaintenanceCase'`);
    expect(migration).toContain(`audit_event."module" IS DISTINCT FROM 'cajas'`);
    expect(migration).toContain('audit_event."createdAt" IS DISTINCT FROM NEW."accepted_at"');
    expect(migration).toContain('case_opened_at IS DISTINCT FROM NEW."accepted_at"');
    expect(migration).toContain('case_opened_by_id IS DISTINCT FROM NEW."accepted_by_id"');
    expect(migration).toContain('WHERE "companyId" = NEW."company_id" AND "id" = NEW."command_acceptance_id"');
    expect(migration).toContain('WHERE "companyId" = NEW."company_id" AND "id" = NEW."audit_event_id"');
    expect(migration).toContain(`expected_checkpoint := CASE WHEN NEW."sequence" = 1 THEN 'maintenance-case-create' ELSE 'maintenance-case-transition' END`);
    expect(migration).toContain(`expected_action := CASE WHEN NEW."sequence" = 1 THEN 'maintenance_case_opened' ELSE 'maintenance_case_transitioned' END`);
    expect(migration).toContain('CREATE TRIGGER "trg_cmt_audit_evidence_guard"');
    expect(migration).toContain('WHERE "company_id" = OLD."companyId" AND "audit_event_id" = OLD."id"');
    expect(operationalMigration).toContain('CREATE TRIGGER "trg_operational_acceptance_append_only"');
  });
});
