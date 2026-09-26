"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ReceiptOperationalWorkspace } from "@/components/compras/ReceiptOperationalWorkspace";
export default function RecepcionesPage() { const { activeCompany } = useAuth(); return activeCompany ? <ReceiptOperationalWorkspace companyId={activeCompany.id} /> : <p className="p-5 text-sm text-muted-foreground">Seleccioná una empresa para operar recepciones.</p>; }
