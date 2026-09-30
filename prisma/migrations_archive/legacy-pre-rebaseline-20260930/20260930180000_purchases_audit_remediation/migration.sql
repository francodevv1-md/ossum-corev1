-- DropForeignKey
ALTER TABLE "necesidad_compra" DROP CONSTRAINT IF EXISTS "necesidad_compra_company_id_surgery_id_fkey";
ALTER TABLE "necesidad_compra" DROP CONSTRAINT IF EXISTS "necesidad_compra_company_id_orden_compra_id_fkey";

-- AddForeignKey
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_company_id_surgery_id_fkey" FOREIGN KEY ("company_id", "surgery_id") REFERENCES "surgery"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "necesidad_compra" ADD CONSTRAINT "necesidad_compra_company_id_orden_compra_id_fkey" FOREIGN KEY ("company_id", "orden_compra_id") REFERENCES "orden_compra"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_orden_pago_imputacion_unique" ON "orden_pago_imputacion"("company_id", "orden_pago_id", "factura_compra_id");
