-- Tenant and duplicate integrity for additive FacturaCompra persistence.
CREATE UNIQUE INDEX "uq_factura_compra_supplier_number" ON "FacturaCompra"("companyId", "proveedorId", "number");
ALTER TABLE "FacturaCompra" ADD CONSTRAINT "FacturaCompra_proveedorId_companyId_fkey" FOREIGN KEY ("proveedorId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacturaCompra" ADD CONSTRAINT "FacturaCompra_companyId_ordenCompraId_fkey" FOREIGN KEY ("companyId", "ordenCompraId") REFERENCES "OrdenCompra"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
