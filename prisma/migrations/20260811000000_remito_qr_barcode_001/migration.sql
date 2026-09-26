-- REMITO-QR-BARCODE-001 / T05: forward artifact only. Do not execute without a later approval.
ALTER TABLE "AuditEvent" ALTER COLUMN "entityId" DROP NOT NULL;

CREATE TABLE "RemitoScanLocator" (
  "locator" VARCHAR(25) NOT NULL, "companyId" TEXT NOT NULL, "remitoId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "issuedAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_remito_scan_locator_locator" PRIMARY KEY ("locator"),
  CONSTRAINT "ck_remito_scan_locator_version" CHECK ("version" = 1)
);
CREATE UNIQUE INDEX "uq_remito_scan_locator_company_locator" ON "RemitoScanLocator"("companyId","locator");
CREATE UNIQUE INDEX "uq_remito_scan_locator_company_remito" ON "RemitoScanLocator"("companyId","remitoId");
CREATE UNIQUE INDEX "uq_remito_scan_locator_tenant_lineage" ON "RemitoScanLocator"("companyId","locator","remitoId");
CREATE INDEX "ix_remito_scan_locator_company_issued" ON "RemitoScanLocator"("companyId","issuedAt");
ALTER TABLE "RemitoScanLocator" ADD CONSTRAINT "fk_remito_scan_locator_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoScanLocator" ADD CONSTRAINT "fk_remito_scan_locator_remito" FOREIGN KEY ("companyId","remitoId") REFERENCES "Remito"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RemitoVerificationPublication" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "remitoId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'current', "currentSlot" INTEGER DEFAULT 1,
  "issuerDisplayNameSnapshot" VARCHAR(200) NOT NULL, "issuerTaxIdSnapshot" VARCHAR(32) NOT NULL,
  "documentTypeSnapshot" VARCHAR(64) NOT NULL, "issuedDateSnapshot" DATE NOT NULL,
  "remitoShortCodeSnapshot" VARCHAR(25) NOT NULL, "fingerprintVersion" VARCHAR(8) NOT NULL,
  "fingerprintSha256" CHAR(64) NOT NULL, "publishedAt" TIMESTAMPTZ(6) NOT NULL,
  "replacedAt" TIMESTAMPTZ(6), "replacedByPublicationId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_remito_verification_publication" PRIMARY KEY ("id"),
  CONSTRAINT "ck_remito_publication_version" CHECK ("version" > 0),
  CONSTRAINT "ck_remito_publication_fingerprint_sha256" CHECK ("fingerprintSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_remito_publication_status" CHECK ("status" IN ('current','replaced')),
  CONSTRAINT "ck_remito_publication_current_slot" CHECK (("status"='current' AND "currentSlot"=1) OR ("status"='replaced' AND "currentSlot" IS NULL)),
  CONSTRAINT "ck_remito_publication_replacement_parity" CHECK (("status"='current' AND "replacedAt" IS NULL AND "replacedByPublicationId" IS NULL) OR ("status"='replaced' AND "replacedAt" IS NOT NULL AND "replacedByPublicationId" IS NOT NULL))
);
CREATE UNIQUE INDEX "uq_remito_publication_company_id" ON "RemitoVerificationPublication"("companyId","id");
CREATE UNIQUE INDEX "uq_remito_publication_tenant_lineage" ON "RemitoVerificationPublication"("companyId","id","remitoId");
CREATE UNIQUE INDEX "uq_remito_publication_version" ON "RemitoVerificationPublication"("companyId","remitoId","version");
CREATE UNIQUE INDEX "uq_remito_publication_current" ON "RemitoVerificationPublication"("companyId","remitoId","currentSlot");
CREATE INDEX "ix_remito_publication_status" ON "RemitoVerificationPublication"("companyId","remitoId","status");
CREATE INDEX "ix_remito_publication_published" ON "RemitoVerificationPublication"("companyId","publishedAt");
ALTER TABLE "RemitoVerificationPublication" ADD CONSTRAINT "fk_remito_publication_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoVerificationPublication" ADD CONSTRAINT "fk_remito_publication_remito" FOREIGN KEY ("companyId","remitoId") REFERENCES "Remito"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoVerificationPublication" ADD CONSTRAINT "fk_remito_publication_locator" FOREIGN KEY ("companyId","remitoShortCodeSnapshot","remitoId") REFERENCES "RemitoScanLocator"("companyId","locator","remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoVerificationPublication" ADD CONSTRAINT "fk_remito_publication_replacement" FOREIGN KEY ("companyId","replacedByPublicationId","remitoId") REFERENCES "RemitoVerificationPublication"("companyId","id","remitoId") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "RemitoVerificationAccess" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "remitoId" TEXT NOT NULL, "publicationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'current', "currentSlot" INTEGER DEFAULT 1,
  "tokenNonce" CHAR(43) NOT NULL, "tokenKeyVersion" INTEGER NOT NULL, "tokenHash" CHAR(64) NOT NULL,
  "issuedAt" TIMESTAMPTZ(6) NOT NULL, "replacedAt" TIMESTAMPTZ(6), "revokedAt" TIMESTAMPTZ(6),
  "supersededByAccessId" TEXT, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_remito_verification_access" PRIMARY KEY ("id"),
  CONSTRAINT "ck_remito_access_version" CHECK ("version" > 0),
  CONSTRAINT "ck_remito_access_key_version" CHECK ("tokenKeyVersion" BETWEEN 1 AND 2147483647),
  CONSTRAINT "ck_remito_access_token_nonce" CHECK ("tokenNonce" ~ '^[A-Za-z0-9_-]{43}$'),
  CONSTRAINT "ck_remito_access_token_nonce_tail" CHECK ("tokenNonce" ~ '[AEIMQUYcgkosw048]$'),
  CONSTRAINT "ck_remito_access_token_hash" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_remito_access_status" CHECK ("status" IN ('current','replaced','revoked')),
  CONSTRAINT "ck_remito_access_current_slot" CHECK (("status"='current' AND "currentSlot"=1) OR ("status"<>'current' AND "currentSlot" IS NULL)),
  CONSTRAINT "ck_remito_access_lifecycle_parity" CHECK (("status"='current' AND "replacedAt" IS NULL AND "revokedAt" IS NULL AND "supersededByAccessId" IS NULL) OR ("status"='replaced' AND "replacedAt" IS NOT NULL AND "revokedAt" IS NULL AND "supersededByAccessId" IS NOT NULL) OR ("status"='revoked' AND "replacedAt" IS NULL AND "revokedAt" IS NOT NULL AND "supersededByAccessId" IS NULL))
);
CREATE UNIQUE INDEX "uq_remito_access_token_hash" ON "RemitoVerificationAccess"("tokenHash");
CREATE UNIQUE INDEX "uq_remito_access_company_id" ON "RemitoVerificationAccess"("companyId","id");
CREATE UNIQUE INDEX "uq_remito_access_tenant_lineage" ON "RemitoVerificationAccess"("companyId","id","publicationId");
CREATE UNIQUE INDEX "uq_remito_access_version" ON "RemitoVerificationAccess"("companyId","publicationId","version");
CREATE UNIQUE INDEX "uq_remito_access_current" ON "RemitoVerificationAccess"("companyId","publicationId","currentSlot");
CREATE INDEX "ix_remito_access_status" ON "RemitoVerificationAccess"("companyId","publicationId","status");
CREATE INDEX "ix_remito_access_issued" ON "RemitoVerificationAccess"("companyId","issuedAt");
ALTER TABLE "RemitoVerificationAccess" ADD CONSTRAINT "fk_remito_access_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoVerificationAccess" ADD CONSTRAINT "fk_remito_access_publication" FOREIGN KEY ("companyId","publicationId","remitoId") REFERENCES "RemitoVerificationPublication"("companyId","id","remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemitoVerificationAccess" ADD CONSTRAINT "fk_remito_access_supersession" FOREIGN KEY ("companyId","supersededByAccessId","publicationId") REFERENCES "RemitoVerificationAccess"("companyId","id","publicationId") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "PublicVerificationRateBucket" (
  "sourceFingerprint" CHAR(64) NOT NULL, "keyDate" DATE NOT NULL, "firstSeenAt" TIMESTAMPTZ(6) NOT NULL,
  "windowStartedAt" TIMESTAMPTZ(6) NOT NULL, "checks" INTEGER NOT NULL DEFAULT 0,
  "invalidChecks" INTEGER NOT NULL DEFAULT 0, "blockedUntil" TIMESTAMPTZ(6),
  "expiresAt" TIMESTAMPTZ(6) NOT NULL, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_public_verification_rate_bucket" PRIMARY KEY ("sourceFingerprint","keyDate"),
  CONSTRAINT "ck_public_rate_source_fingerprint" CHECK ("sourceFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_public_rate_counters" CHECK ("checks">=0 AND "invalidChecks">=0 AND "invalidChecks"<="checks"),
  CONSTRAINT "ck_public_rate_expiry" CHECK ("expiresAt"="firstSeenAt" + INTERVAL '29 days')
);
CREATE INDEX "ix_public_rate_expiry" ON "PublicVerificationRateBucket"("expiresAt");
CREATE INDEX "ix_public_rate_blocked" ON "PublicVerificationRateBucket"("blockedUntil");

CREATE TABLE "RemitoVerificationDailyMetric" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "day" DATE NOT NULL, "channel" VARCHAR(32) NOT NULL,
  "result" VARCHAR(16) NOT NULL, "count" INTEGER NOT NULL, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_remito_verification_daily_metric" PRIMARY KEY ("id"),
  CONSTRAINT "ck_remito_metric_count" CHECK ("count">0)
);
CREATE UNIQUE INDEX "uq_remito_metric_dimensions" ON "RemitoVerificationDailyMetric"("companyId","day","channel","result");
CREATE INDEX "ix_remito_metric_day" ON "RemitoVerificationDailyMetric"("day");
ALTER TABLE "RemitoVerificationDailyMetric" ADD CONSTRAINT "fk_remito_metric_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "remito_rm1_is_valid"(value text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; compact text; remainder integer := 9; symbol text; bit integer; v integer;
BEGIN
  IF value !~ '^RM1-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]$' THEN RETURN false; END IF;
  compact := replace(substr(value,5),'-','');
  FOR symbol IN SELECT unnest(string_to_array('1'||substr(compact,1,16),NULL)) LOOP
    v := strpos(alphabet,symbol)-1;
    FOR bit IN REVERSE 4..0 LOOP
      IF ((((remainder>>4)&1) # ((v>>bit)&1)))=1 THEN remainder := ((remainder<<1)&31) # 9; ELSE remainder := (remainder<<1)&31; END IF;
    END LOOP;
  END LOOP;
  RETURN substr(alphabet,remainder+1,1)=substr(compact,17,1);
END $$;
ALTER TABLE "RemitoScanLocator" ADD CONSTRAINT "ck_remito_scan_locator_rm1" CHECK ("remito_rm1_is_valid"("locator"));

CREATE FUNCTION "remito_locator_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'remito locator is immutable and non-reusable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "Remito" r WHERE r."companyId"=NEW."companyId" AND r."id"=NEW."remitoId" AND r."issuedAt" IS NOT NULL AND r."state"<>'Borrador') THEN RAISE EXCEPTION 'remito locator requires issued remito'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "trg_remito_locator_guard" BEFORE INSERT OR UPDATE OR DELETE ON "RemitoScanLocator" FOR EACH ROW EXECUTE FUNCTION "remito_locator_guard"();

CREATE FUNCTION "remito_publication_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_version integer; expected_version integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication deletion denied'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."status"<>'current' OR NEW."currentSlot"<>1 OR NEW."replacedAt" IS NOT NULL OR NEW."replacedByPublicationId" IS NOT NULL THEN RAISE EXCEPTION 'publication insertion must be initial current state'; END IF;
    PERFORM 1 FROM "Remito" WHERE "companyId"=NEW."companyId" AND "id"=NEW."remitoId" FOR UPDATE;
    SELECT coalesce(max("version"),0)+1 INTO expected_version FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "remitoId"=NEW."remitoId";
    IF NEW."version"<>expected_version THEN RAISE EXCEPTION 'publication version must increase by exactly one'; END IF;
  ELSE
    IF ROW(OLD."id",OLD."companyId",OLD."remitoId",OLD."version",OLD."issuerDisplayNameSnapshot",OLD."issuerTaxIdSnapshot",OLD."documentTypeSnapshot",OLD."issuedDateSnapshot",OLD."remitoShortCodeSnapshot",OLD."fingerprintVersion",OLD."fingerprintSha256",OLD."publishedAt",OLD."createdAt") IS DISTINCT FROM ROW(NEW."id",NEW."companyId",NEW."remitoId",NEW."version",NEW."issuerDisplayNameSnapshot",NEW."issuerTaxIdSnapshot",NEW."documentTypeSnapshot",NEW."issuedDateSnapshot",NEW."remitoShortCodeSnapshot",NEW."fingerprintVersion",NEW."fingerprintSha256",NEW."publishedAt",NEW."createdAt") OR OLD."status"<>'current' OR NEW."status"<>'replaced' THEN RAISE EXCEPTION 'illegal publication mutation'; END IF;
    SELECT "version" INTO target_version FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."replacedByPublicationId" AND "remitoId"=NEW."remitoId";
    IF target_version IS NOT NULL AND target_version<=NEW."version" THEN RAISE EXCEPTION 'replacement must have same lineage and higher version'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "trg_remito_publication_guard" BEFORE INSERT OR UPDATE OR DELETE ON "RemitoVerificationPublication" FOR EACH ROW EXECUTE FUNCTION "remito_publication_guard"();

CREATE FUNCTION "remito_access_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_version integer; expected_version integer; publication_status text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'access deletion denied'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."status"<>'current' OR NEW."currentSlot"<>1 OR NEW."replacedAt" IS NOT NULL OR NEW."revokedAt" IS NOT NULL OR NEW."supersededByAccessId" IS NOT NULL THEN RAISE EXCEPTION 'access insertion must be initial current state'; END IF;
    SELECT "status" INTO publication_status FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."publicationId" AND "remitoId"=NEW."remitoId" FOR UPDATE;
    IF publication_status IS DISTINCT FROM 'current' THEN RAISE EXCEPTION 'current access requires current publication'; END IF;
    SELECT coalesce(max("version"),0)+1 INTO expected_version FROM "RemitoVerificationAccess" WHERE "companyId"=NEW."companyId" AND "publicationId"=NEW."publicationId";
    IF NEW."version"<>expected_version THEN RAISE EXCEPTION 'access version must increase by exactly one'; END IF;
  ELSE
    IF ROW(OLD."id",OLD."companyId",OLD."remitoId",OLD."publicationId",OLD."version",OLD."tokenNonce",OLD."tokenKeyVersion",OLD."tokenHash",OLD."issuedAt",OLD."createdAt") IS DISTINCT FROM ROW(NEW."id",NEW."companyId",NEW."remitoId",NEW."publicationId",NEW."version",NEW."tokenNonce",NEW."tokenKeyVersion",NEW."tokenHash",NEW."issuedAt",NEW."createdAt") OR OLD."status"<>'current' OR NEW."status" NOT IN ('replaced','revoked') THEN RAISE EXCEPTION 'illegal access mutation'; END IF;
    IF NEW."status"='replaced' THEN SELECT "version" INTO target_version FROM "RemitoVerificationAccess" WHERE "companyId"=NEW."companyId" AND "id"=NEW."supersededByAccessId" AND "publicationId"=NEW."publicationId"; IF target_version IS NOT NULL AND target_version<=NEW."version" THEN RAISE EXCEPTION 'superseding access must have same lineage and higher version'; END IF; END IF;
    IF NEW."status"='current' THEN SELECT "status" INTO publication_status FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."publicationId"; IF publication_status IS DISTINCT FROM 'current' THEN RAISE EXCEPTION 'current access requires current publication'; END IF; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "trg_remito_access_guard" BEFORE INSERT OR UPDATE OR DELETE ON "RemitoVerificationAccess" FOR EACH ROW EXECUTE FUNCTION "remito_access_guard"();

CREATE FUNCTION "remito_current_guarantee"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company_id text := coalesce(NEW."companyId",OLD."companyId"); lineage_id text; current_count integer; access_count integer; latest_status text; current_publication text; orphan_current integer;
BEGIN
  IF TG_TABLE_NAME='RemitoScanLocator' THEN
    lineage_id:=coalesce(NEW."remitoId",OLD."remitoId"); SELECT count(*) INTO current_count FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current';
    IF current_count<>1 THEN RAISE EXCEPTION 'exactly one current publication required for issued locator'; END IF;
  ELSIF TG_TABLE_NAME='RemitoVerificationPublication' THEN
    lineage_id:=coalesce(NEW."remitoId",OLD."remitoId"); SELECT count(*) INTO current_count FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current';
    IF current_count<>1 THEN RAISE EXCEPTION 'exactly one current publication required'; END IF;
    SELECT "id" INTO current_publication FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current'; SELECT count(*) INTO access_count FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=current_publication AND "status"='current'; SELECT "status" INTO latest_status FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=current_publication ORDER BY "version" DESC LIMIT 1;
    IF access_count<>(CASE WHEN latest_status='revoked' THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'current publication requires exactly one current access unless revoked'; END IF;
    SELECT count(*) INTO orphan_current FROM "RemitoVerificationAccess" a JOIN "RemitoVerificationPublication" p ON p."companyId"=a."companyId" AND p."id"=a."publicationId" WHERE p."companyId"=company_id AND p."remitoId"=lineage_id AND a."status"='current' AND p."status"<>'current';
    IF orphan_current<>0 THEN RAISE EXCEPTION 'current access requires current publication'; END IF;
  ELSE
    lineage_id:=coalesce(NEW."publicationId",OLD."publicationId"); SELECT count(*) INTO current_count FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=lineage_id AND "status"='current'; SELECT "status" INTO latest_status FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=lineage_id ORDER BY "version" DESC LIMIT 1;
    IF current_count<>(CASE WHEN latest_status='revoked' THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'invalid current access cardinality'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "trg_remito_locator_publication_deferred" AFTER INSERT ON "RemitoScanLocator" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "remito_current_guarantee"();
CREATE CONSTRAINT TRIGGER "trg_remito_publication_current_deferred" AFTER INSERT OR UPDATE OR DELETE ON "RemitoVerificationPublication" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "remito_current_guarantee"();
CREATE CONSTRAINT TRIGGER "trg_remito_access_current_deferred" AFTER INSERT OR UPDATE OR DELETE ON "RemitoVerificationAccess" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "remito_current_guarantee"();

CREATE FUNCTION "public_rate_first_seen_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."firstSeenAt" IS DISTINCT FROM NEW."firstSeenAt" OR OLD."expiresAt" IS DISTINCT FROM NEW."expiresAt" THEN RAISE EXCEPTION 'rate retention anchors are immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER "trg_public_rate_retention_immutable" BEFORE UPDATE ON "PublicVerificationRateBucket" FOR EACH ROW EXECUTE FUNCTION "public_rate_first_seen_immutable"();
