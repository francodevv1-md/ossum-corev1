-- CreateEnum
CREATE TYPE "NecesidadCompraState" AS ENUM ('Pendiente', 'En_OC', 'Enviada', 'Recibida', 'Cancelada');

-- CreateEnum
CREATE TYPE "OrdenPagoState" AS ENUM ('Emitida', 'Anulada');

-- CreateTable
CREATE TABLE "necesidad_compra" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "article_id" TEXT,
    "is_articulo_z" BOOLEAN NOT NULL DEFAULT false,
    "descripcion_libre" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "origin_reference" TEXT,
    "suggested_supplier_id" TEXT,
    "suggested_supplier_name" TEXT,
    "surgery_id" TEXT,
    "observaciones" TEXT,
    "state" "NecesidadCompraState" NOT NULL DEFAULT 'Pendiente',
    "orden_compra_id" TEXT,
    "idempotency_key" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "necesidad_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_pago" (
    "id" TEXT NOT NULL,
    "visible_number" INTEGER,
    "company_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "proveedor_name" TEXT NOT NULL,
    "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "method" TEXT,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "OrdenPagoState" NOT NULL DEFAULT 'Emitida',
    "observaciones" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orden_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_pago_imputacion" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "orden_pago_id" TEXT NOT NULL,
    "factura_compra_id" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_pago_imputacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_necesidad_compra_company_id" ON "necesidad_compra"("company_id", "id");
CREATE UNIQUE INDEX "uq_necesidad_compra_idempotency" ON "necesidad_compra"("company_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX "ix_necesidad_compra_company_state" ON "necesidad_compra"("company_id", "state");
CREATE INDEX "ix_necesidad_compra_company_origin" ON "necesidad_compra"("company_id", "origin");
CREATE INDEX "ix_necesidad_compra_company_created" ON "necesidad_compra"("company_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_orden_pago_company_id" ON "orden_pago"("company_id", "id");
CREATE INDEX "ix_orden_pago_company_state" ON "orden_pago"("company_id", "state");
CREATE INDEX "ix_orden_pago_company_proveedor" ON "orden_pago"("company_id", "proveedor_id");
CREATE INDEX "ix_orden_pago_company_date" ON "orden_pago"("company_id", "payment_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_orden_pago_imputacion_company_id" ON "orden_pago_imputacion"("company_id", "id");
CREATE INDEX "ix_orden_pago_imputacion_op" ON "orden_pago_imputacion"("company_id", "orden_pago_id");
CREATE INDEX "ix_orden_pago_imputacion_fc" ON "orden_pago_imputacion"("company_id", "factura_compra_id");

-- AddForeignKey
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_company_id_surgery_id_fkey" FOREIGN KEY ("company_id", "surgery_id") REFERENCES "surgery"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_company_id_orden_compra_id_fkey" FOREIGN KEY ("company_id", "orden_compra_id") REFERENCES "orden_compra"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_pago" ADD CONSTRAINT "orden_pago_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orden_pago" ADD CONSTRAINT "orden_pago_proveedor_id_company_id_fkey" FOREIGN KEY ("proveedor_id", "company_id") REFERENCES "contact_company_link"("contact_id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orden_pago" ADD CONSTRAINT "orden_pago_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orden_pago" ADD CONSTRAINT "orden_pago_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_pago_imputacion" ADD CONSTRAINT "orden_pago_imputacion_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orden_pago_imputacion" ADD CONSTRAINT "orden_pago_imputacion_company_id_orden_pago_id_fkey" FOREIGN KEY ("company_id", "orden_pago_id") REFERENCES "orden_pago"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orden_pago_imputacion" ADD CONSTRAINT "orden_pago_imputacion_company_id_factura_compra_id_fkey" FOREIGN KEY ("company_id", "factura_compra_id") REFERENCES "factura_compra"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
