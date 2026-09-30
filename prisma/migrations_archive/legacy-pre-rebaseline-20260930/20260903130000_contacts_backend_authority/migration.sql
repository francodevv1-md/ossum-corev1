-- Contact remains a global identity. Company-specific profile data lives on
-- ContactCompanyLink and is backfilled before constraints are enforced.

ALTER TABLE "Contact"
  ADD COLUMN "tradeName" TEXT,
  ADD COLUMN "notes" TEXT;

ALTER TABLE "ContactCompanyLink"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "isPayer" BOOLEAN,
  ADD COLUMN "vatCondition" TEXT,
  ADD COLUMN "paymentTerms" TEXT,
  ADD COLUMN "defaultPriceList" TEXT,
  ADD COLUMN "usualDiscount" DECIMAL(9,4),
  ADD COLUMN "doctorLicense" TEXT,
  ADD COLUMN "specialty" TEXT,
  ADD COLUMN "deliveryNotes" TEXT;

-- Preserve the legacy role verbatim and derive the broad multi-role profile.
UPDATE "ContactCompanyLink"
SET "roles" = ARRAY[
  CASE
    WHEN LOWER("role") IN ('proveedor', 'supplier', 'instrumentador') THEN 'proveedor'
    WHEN LOWER("role") IN ('interno', 'admin', 'operator', 'coordinador', 'vendedor') THEN 'interno'
    ELSE 'cliente'
  END
]
WHERE "role" IS NOT NULL AND CARDINALITY("roles") = 0;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt", "id") AS sequence
  FROM "ContactCompanyLink"
)
UPDATE "ContactCompanyLink" link
SET "code" = 'C-' || LPAD(ranked.sequence::TEXT, GREATEST(4, LENGTH(ranked.sequence::TEXT)), '0')
FROM ranked
WHERE link."id" = ranked."id" AND link."code" IS NULL;

ALTER TABLE "ContactCompanyLink"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "code" SET DEFAULT '';

-- Legacy/direct Prisma creators may omit code. Allocate it in the database so
-- every write path shares one company-scoped, concurrency-safe sequence.
CREATE OR REPLACE FUNCTION "allocate_contact_company_code"()
RETURNS TRIGGER AS $$
DECLARE
  next_value NUMERIC;
BEGIN
  IF NEW."code" IS NULL OR BTRIM(NEW."code") = '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."companyId", 0));
    SELECT COALESCE(MAX(SUBSTRING("code" FROM 3)::NUMERIC), 0) + 1
      INTO next_value
      FROM "ContactCompanyLink"
      WHERE "companyId" = NEW."companyId" AND "code" ~ '^C-[0-9]{4,}$';
    NEW."code" := 'C-' || LPAD(next_value::TEXT, GREATEST(4, LENGTH(next_value::TEXT)), '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_allocate_contact_company_code"
BEFORE INSERT ON "ContactCompanyLink"
FOR EACH ROW EXECUTE FUNCTION "allocate_contact_company_code"();

ALTER TABLE "ContactCompanyLink"
  ADD CONSTRAINT "ck_contact_company_code_format" CHECK ("code" ~ '^C-[0-9]{4,}$');

CREATE UNIQUE INDEX "uq_contact_company_code"
  ON "ContactCompanyLink"("companyId", "code");
CREATE INDEX "ix_contact_company_active_created"
  ON "ContactCompanyLink"("companyId", "isActive", "createdAt");

ALTER TABLE "ContactGroup"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "role" TEXT;

-- Existing custom groups remain available under a deterministic company key.
UPDATE "ContactGroup"
SET
  "slug" = 'legacy-' || SUBSTRING(MD5("id") FROM 1 FOR 16),
  "role" = 'cliente'
WHERE "slug" IS NULL;

WITH definitions(slug, name, role) AS (VALUES
  ('medicos', 'Médicos', 'cliente'),
  ('pacientes', 'Pacientes', 'cliente'),
  ('instituciones', 'Instituciones', 'cliente'),
  ('obras_sociales', 'Obras Sociales', 'cliente'),
  ('art', 'ART', 'cliente'),
  ('particulares', 'Particulares', 'cliente'),
  ('prepagas', 'Prepagas', 'cliente'),
  ('otros_clientes', 'Otros clientes', 'cliente'),
  ('instrumentadores', 'Instrumentadores', 'proveedor'),
  ('prov_implantes', 'Proveedores de implantes', 'proveedor'),
  ('prov_insumos', 'Proveedores de insumos quirúrgicos', 'proveedor'),
  ('prov_descartables', 'Proveedores de descartables', 'proveedor'),
  ('servicios_tecnicos', 'Servicios técnicos', 'proveedor'),
  ('otros_proveedores', 'Otros proveedores', 'proveedor'),
  ('coordinadores', 'Coordinadores', 'interno'),
  ('vendedores', 'Vendedores', 'interno'),
  ('deposito', 'Depósito', 'interno'),
  ('administracion', 'Administración', 'interno'),
  ('logistica', 'Logística', 'interno'),
  ('direccion', 'Dirección', 'interno'),
  ('otros_internos', 'Otros internos', 'interno')
)
INSERT INTO "ContactGroup" (
  "id", "companyId", "slug", "role", "name", "isActive", "createdAt", "updatedAt"
)
SELECT
  'contact-group-' || MD5(company."id" || ':' || definitions.slug),
  company."id",
  definitions.slug,
  definitions.role,
  definitions.name,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Company" company
CROSS JOIN definitions
ON CONFLICT DO NOTHING;

ALTER TABLE "ContactGroup"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "role" SET NOT NULL;

CREATE UNIQUE INDEX "uq_contact_group_company_slug"
  ON "ContactGroup"("companyId", "slug");

-- Keep every address row; only demote duplicate main flags before enforcing one.
WITH ranked_main AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "contactId" ORDER BY "createdAt", "id") AS rank
  FROM "ContactAddress"
  WHERE "isMain" = true
)
UPDATE "ContactAddress" address
SET "isMain" = false
FROM ranked_main
WHERE address."id" = ranked_main."id" AND ranked_main.rank > 1;

CREATE UNIQUE INDEX "uq_contact_address_one_main"
  ON "ContactAddress"("contactId") WHERE "isMain" = true;
CREATE INDEX "ix_contact_address_main"
  ON "ContactAddress"("contactId", "isMain");
