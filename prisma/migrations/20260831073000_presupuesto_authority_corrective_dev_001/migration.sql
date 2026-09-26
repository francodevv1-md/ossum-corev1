-- PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001 corrective roll-forward
-- Preconditions are inventoried read-only before apply. This migration performs no data repair.

CREATE UNIQUE INDEX "uq_branch_company_id" ON "Branch"("companyId", "id");
CREATE UNIQUE INDEX "uq_presupuesto_family_surgery_lineage" ON "presupuesto_family"("companyId", "id", "surgeryId");
CREATE UNIQUE INDEX "uq_presupuesto_family_id" ON "presupuesto"("familyId", "id");

ALTER TABLE "presupuesto" DROP CONSTRAINT "presupuesto_surgeryId_fkey";
ALTER TABLE "presupuesto" DROP CONSTRAINT "fk_presupuesto_branch";
ALTER TABLE "presupuesto" DROP CONSTRAINT "fk_presupuesto_client";
ALTER TABLE "presupuesto" DROP CONSTRAINT "fk_presupuesto_payer";
ALTER TABLE "presupuesto" DROP CONSTRAINT "presupuesto_parentPresupuestoId_fkey";
ALTER TABLE "presupuesto" DROP CONSTRAINT "fk_presupuesto_source";

ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_surgery_tenant"
  FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_branch_tenant"
  FOREIGN KEY ("companyId", "branchId") REFERENCES "Branch"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_client_tenant"
  FOREIGN KEY ("clientContactId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_payer_tenant"
  FOREIGN KEY ("payerContactId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_parent_family"
  FOREIGN KEY ("familyId", "parentPresupuestoId") REFERENCES "presupuesto"("familyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_source_family"
  FOREIGN KEY ("familyId", "sourcePresupuestoId") REFERENCES "presupuesto"("familyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_family_surgery_lineage"
  FOREIGN KEY ("companyId", "familyId", "surgeryId") REFERENCES "presupuesto_family"("companyId", "id", "surgeryId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "check_presupuesto_family_surgery_lineage"() RETURNS trigger AS $$
DECLARE family_surgery_id TEXT;
BEGIN
  SELECT "surgeryId" INTO family_surgery_id
  FROM "presupuesto_family"
  WHERE "companyId" = NEW."companyId" AND "id" = NEW."familyId";

  IF NOT FOUND OR family_surgery_id IS DISTINCT FROM NEW."surgeryId" THEN
    RAISE EXCEPTION 'Presupuesto surgery must match its family surgery' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_presupuesto_family_surgery_lineage"
BEFORE INSERT OR UPDATE OF "companyId", "familyId", "surgeryId" ON "presupuesto"
FOR EACH ROW EXECUTE FUNCTION "check_presupuesto_family_surgery_lineage"();
