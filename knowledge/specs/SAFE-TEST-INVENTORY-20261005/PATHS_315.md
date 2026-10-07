# PATHS_315 — canonical per-file classification index

Snapshot: HEAD 2138552 (ux/antigravity-redesign), 2026-10-05.
Generated from disk by Get-ChildItem of E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\__tests__\.
Categories: ALLOW = VERIFIED OFFLINE (allowlist, see RUNTIME_CLOSURE.md); MOCKED-OFFLINE = VERIFIED OFFLINE (mocked, outside allowlist); DB-EXT = DB/EXTERNAL; UNV = UNVERIFIED.

Source of category assignment: see INVENTORY.md §1.4, §2–§4. The allowlist (ALLOW) and the DB-EXTERNAL list (DB-EXT) are anchored in the per-file evidence in those sections. The `emitos-022.test.ts` file is UNV (both describe.skip; no closure walk). The `surgeries-create-api.test.ts` file is MOCKED-OFFLINE (mocks @/lib/prisma). Round 2 (2026-10-05, MiniMax) reclassified 3 of the 4 previously-UNV `integration/*` files to ALLOW with per-file `RUNTIME_CLOSURE.md` rows; the 4th (`mail-stage1-api.test.ts`) is held UNV by the round-2 conservative decision — see `INVENTORY.md` §1.4 round-2 redistribution and §4 for the evidence note. Everything else is UNV.

## unit/ (202)

- ALLOW: 6
- UNV (includes remitos-022): 195 + 1 = 196

| # | Path | Category |
| ---: | --- | --- |
| 1 | src/__tests__/unit/adjustment-document.service.test.ts | UNV |
| 2 | src/__tests__/unit/argentina-geography.test.ts | UNV |
| 3 | src/__tests__/unit/article-api-route.test.ts | UNV |
| 4 | src/__tests__/unit/article-company-commercial-profile.test.ts | UNV |
| 5 | src/__tests__/unit/article-master-classification.test.ts | UNV |
| 6 | src/__tests__/unit/article-price-lists-history.test.ts | UNV |
| 7 | src/__tests__/unit/article-selector-modal-017o.test.tsx | UNV |
| 8 | src/__tests__/unit/authorization-producer-consumer.test.ts | UNV |
| 9 | src/__tests__/unit/automations.test.ts | UNV |
| 10 | src/__tests__/unit/availability-capability-grant.service.test.ts | UNV |
| 11 | src/__tests__/unit/availability-dev-bootstrap.cli.test.ts | UNV |
| 12 | src/__tests__/unit/availability-dev-bootstrap.service.test.ts | UNV |
| 13 | src/__tests__/unit/availability-readiness-classifier.test.ts | UNV |
| 14 | src/__tests__/unit/availability-request.service.test.ts | UNV |
| 15 | src/__tests__/unit/availability-request.validator.test.ts | UNV |
| 16 | src/__tests__/unit/availability-request-client.test.ts | UNV |
| 17 | src/__tests__/unit/availability-request-permission.test.ts | UNV |
| 18 | src/__tests__/unit/availability-request-route.test.ts | UNV |
| 19 | src/__tests__/unit/backend-active-surgeries-adapter.test.ts | UNV |
| 20 | src/__tests__/unit/billing-payments-api-client.test.ts | UNV |
| 21 | src/__tests__/unit/billing-payments-hooks.test.tsx | UNV |
| 22 | src/__tests__/unit/cajas-dispatch-owner.test.ts | UNV |
| 23 | src/__tests__/unit/cajas-nested-trace.test.ts | UNV |
| 24 | src/__tests__/unit/cajas-preparation-contract.test.ts | UNV |
| 25 | src/__tests__/unit/cajas-preparation-recovery.test.ts | UNV |
| 26 | src/__tests__/unit/cajas-prep-correctness.test.ts | UNV |
| 27 | src/__tests__/unit/cajas-slice1-formula.test.ts | UNV |
| 28 | src/__tests__/unit/cajas-slice3-assignment.test.ts | UNV |
| 29 | src/__tests__/unit/cajas-transaction-shape.test.ts | UNV |
| 30 | src/__tests__/unit/cajas-ui-intent-wiring.test.ts | UNV |
| 31 | src/__tests__/unit/catalogo-articulos-017l.test.ts | UNV |
| 32 | src/__tests__/unit/circuit-progress.test.ts | UNV |
| 33 | src/__tests__/unit/cirugia-creation.test.ts | UNV |
| 34 | src/__tests__/unit/cirugias-date-columns.test.ts | ALLOW |
| 35 | src/__tests__/unit/cirugias-estado-prep-separation.test.ts | UNV |
| 36 | src/__tests__/unit/cirugias-optabs.test.ts | ALLOW |
| 37 | src/__tests__/unit/clasificacion-selector-modal-025a3.test.tsx | UNV |
| 38 | src/__tests__/unit/cobros.utils.test.ts | UNV |
| 39 | src/__tests__/unit/collections-dashboard.utils.test.ts | UNV |
| 40 | src/__tests__/unit/company-operational-assignee.service.test.ts | UNV |
| 41 | src/__tests__/unit/company-operational-assignee-route.test.ts | UNV |
| 42 | src/__tests__/unit/comparativa.utils.test.ts | UNV |
| 43 | src/__tests__/unit/compras-document-ai.test.ts | UNV |
| 44 | src/__tests__/unit/compras-document-extractor.test.ts | UNV |
| 45 | src/__tests__/unit/compras-movimientos.service.test.ts | ALLOW |
| 46 | src/__tests__/unit/compras-movimientos.test.ts | UNV |
| 47 | src/__tests__/unit/compras-reposicion.test.ts | UNV |
| 48 | src/__tests__/unit/consumo-service.test.ts | UNV |
| 49 | src/__tests__/unit/contact-adapter.test.ts | UNV |
| 50 | src/__tests__/unit/contact-backend-authority-service.test.ts | UNV |
| 51 | src/__tests__/unit/contact-backend-authority-validator-adapter.test.ts | UNV |
| 52 | src/__tests__/unit/contact-code.test.ts | UNV |
| 53 | src/__tests__/unit/contactos-code-020.test.ts | UNV |
| 54 | src/__tests__/unit/contactos-integration-020.test.ts | UNV |
| 55 | src/__tests__/unit/contactos-store-020.test.ts | UNV |
| 56 | src/__tests__/unit/coordination-dev-bootstrap.service.test.ts | UNV |
| 57 | src/__tests__/unit/coordination-ezequiel-auth-inspector.service.test.ts | UNV |
| 58 | src/__tests__/unit/coordination-ezequiel-auth-provisioning.service.test.ts | UNV |
| 59 | src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts | UNV |
| 60 | src/__tests__/unit/coordination-filtering.test.ts | UNV |
| 61 | src/__tests__/unit/coordination-permission.test.ts | UNV |
| 62 | src/__tests__/unit/coordination-preview-capability.test.ts | UNV |
| 63 | src/__tests__/unit/coordination-ui-state.test.ts | UNV |
| 64 | src/__tests__/unit/coordination-view.service.test.ts | UNV |
| 65 | src/__tests__/unit/coordination-view-route.test.ts | UNV |
| 66 | src/__tests__/unit/coordinator-queue.helpers.test.ts | UNV |
| 67 | src/__tests__/unit/cx-operation-presets.test.ts | UNV |
| 68 | src/__tests__/unit/cx-operations-derived.test.ts | UNV |
| 69 | src/__tests__/unit/decimal-money.test.ts | UNV |
| 70 | src/__tests__/unit/descuento-por-item-017k.test.ts | UNV |
| 71 | src/__tests__/unit/dev-legacy-mock-surgery-cleanup.service.test.ts | UNV |
| 72 | src/__tests__/unit/devolucion-route.test.ts | UNV |
| 73 | src/__tests__/unit/devolucion-service.test.ts | UNV |
| 74 | src/__tests__/unit/dev-surgery-cleanup.service.test.ts | UNV |
| 75 | src/__tests__/unit/dev-surgery-delete-by-id.service.test.ts | UNV |
| 76 | src/__tests__/unit/districorr-staff-ten-case-import.test.ts | UNV |
| 77 | src/__tests__/unit/districorr-two-institution-map.test.ts | UNV |
| 78 | src/__tests__/unit/documentation-route.test.ts | UNV |
| 79 | src/__tests__/unit/documentation-service.test.ts | UNV |
| 80 | src/__tests__/unit/documentation-validator.test.ts | UNV |
| 81 | src/__tests__/unit/erp-billing-payments.test.ts | UNV |
| 82 | src/__tests__/unit/erp-circuit-services.test.ts | UNV |
| 83 | src/__tests__/unit/erp-migration-smoke.test.ts | UNV |
| 84 | src/__tests__/unit/erp-notifications-policy.test.ts | UNV |
| 85 | src/__tests__/unit/erp-purchases-stock-domain.test.ts | UNV |
| 86 | src/__tests__/unit/erp-rbac-tenant-isolation.test.ts | UNV |
| 87 | src/__tests__/unit/erp-smoke-api-endpoints.test.ts | UNV |
| 88 | src/__tests__/unit/expediente-header.model.test.ts | UNV |
| 89 | src/__tests__/unit/expediente-macro-timeline.test.ts | UNV |
| 90 | src/__tests__/unit/expediente-navigation.test.ts | UNV |
| 91 | src/__tests__/unit/facturacion.utils.test.ts | UNV |
| 92 | src/__tests__/unit/factura-compra-service.test.ts | UNV |
| 93 | src/__tests__/unit/factura-compra-validators.test.ts | UNV |
| 94 | src/__tests__/unit/fiscal.service.test.ts | UNV |
| 95 | src/__tests__/unit/fiscal-evidence-read.route.test.ts | UNV |
| 96 | src/__tests__/unit/fiscal-evidence-read.service.test.ts | UNV |
| 97 | src/__tests__/unit/fiscal-issuance.service.test.ts | UNV |
| 98 | src/__tests__/unit/fiscal-routes.test.ts | UNV |
| 99 | src/__tests__/unit/fiscal-tusfacturas.service.test.ts | UNV |
| 100 | src/__tests__/unit/fiscal-tusfacturas-hardening.test.ts | UNV |
| 101 | src/__tests__/unit/formatContextualDate.test.ts | UNV |
| 102 | src/__tests__/unit/gmail-mail-provider.test.ts | UNV |
| 103 | src/__tests__/unit/internal-notifications.service.test.ts | UNV |
| 104 | src/__tests__/unit/invoice-create-route.test.ts | UNV |
| 105 | src/__tests__/unit/invoice-service.test.ts | ALLOW |
| 106 | src/__tests__/unit/iva-presupuesto.test.ts | UNV |
| 107 | src/__tests__/unit/leyenda-presupuesto-017m.test.ts | UNV |
| 108 | src/__tests__/unit/liquidation-billing-gate.test.ts | UNV |
| 109 | src/__tests__/unit/logistica-canonical-quantities.test.ts | UNV |
| 110 | src/__tests__/unit/logistics-delivery-seguimiento.test.ts | UNV |
| 111 | src/__tests__/unit/logistics-operations-read.test.ts | UNV |
| 112 | src/__tests__/unit/mail-stage1.test.ts | UNV |
| 113 | src/__tests__/unit/mail-stage1-authorization-import.test.ts | UNV |
| 114 | src/__tests__/unit/mail-stage1-orphan-link-report.test.ts | UNV |
| 115 | src/__tests__/unit/mail-summary.test.ts | UNV |
| 116 | src/__tests__/unit/material-availability.service.test.ts | UNV |
| 117 | src/__tests__/unit/material-availability-route.test.ts | UNV |
| 118 | src/__tests__/unit/mentions-utils.test.ts | UNV |
| 119 | src/__tests__/unit/notifications-policy-security.test.ts | UNV |
| 120 | src/__tests__/unit/notifications-scope-race.test.tsx | UNV |
| 121 | src/__tests__/unit/operational-document-download-route.test.ts | UNV |
| 122 | src/__tests__/unit/operational-document-upload.service.test.ts | UNV |
| 123 | src/__tests__/unit/operational-document-upload-route.test.ts | UNV |
| 124 | src/__tests__/unit/operational-document-upload-validator.test.ts | UNV |
| 125 | src/__tests__/unit/orden-compra-api-error.test.ts | UNV |
| 126 | src/__tests__/unit/orden-compra-service.test.ts | UNV |
| 127 | src/__tests__/unit/orden-compra-stock-receipt.test.ts | UNV |
| 128 | src/__tests__/unit/orden-compra-stock-receipt-route.test.ts | UNV |
| 129 | src/__tests__/unit/orden-compra-tracked-receipt.test.ts | UNV |
| 130 | src/__tests__/unit/orden-compra-validators.test.ts | UNV |
| 131 | src/__tests__/unit/payment-service.test.ts | UNV |
| 132 | src/__tests__/unit/pdf-barcode.test.ts | UNV |
| 133 | src/__tests__/unit/pending-invoice-sources-hook.test.tsx | UNV |
| 134 | src/__tests__/unit/pending-invoices-page.test.tsx | UNV |
| 135 | src/__tests__/unit/personal-calendar.service.test.ts | UNV |
| 136 | src/__tests__/unit/personal-calendar.validator.test.ts | UNV |
| 137 | src/__tests__/unit/personal-calendar-routes.test.ts | UNV |
| 138 | src/__tests__/unit/personal-coordinator-resolver.test.ts | UNV |
| 139 | src/__tests__/unit/post-creation-actions.test.ts | UNV |
| 140 | src/__tests__/unit/presupuesto-api-routes.test.ts | UNV |
| 141 | src/__tests__/unit/presupuesto-concurrency.test.ts | UNV |
| 142 | src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts | UNV |
| 143 | src/__tests__/unit/presupuesto-layout-025a4.test.ts | UNV |
| 144 | src/__tests__/unit/presupuesto-mvp-closure.test.ts | UNV |
| 145 | src/__tests__/unit/presupuesto-qa-017p.test.ts | UNV |
| 146 | src/__tests__/unit/presupuesto-service.test.ts | UNV |
| 147 | src/__tests__/unit/presupuesto-templates.test.ts | UNV |
| 148 | src/__tests__/unit/presupuesto-workspace-017f.test.ts | UNV |
| 149 | src/__tests__/unit/purchases-integrity.test.ts | UNV |
| 150 | src/__tests__/unit/purchases-rbac-security.test.ts | UNV |
| 151 | src/__tests__/unit/rbac-security.test.ts | UNV |
| 152 | src/__tests__/unit/receipt-api-routes.test.ts | UNV |
| 153 | src/__tests__/unit/receipt-service.test.ts | UNV |
| 154 | src/__tests__/unit/receipt-validator.test.ts | UNV |
| 155 | src/__tests__/unit/remito-devolucion-route.test.ts | UNV |
| 156 | src/__tests__/unit/remito-dev-preset.service.test.ts | UNV |
| 157 | src/__tests__/unit/remito-dev-preset-route.test.ts | UNV |
| 158 | src/__tests__/unit/remito-route.test.ts | UNV |
| 159 | src/__tests__/unit/remitos-022.test.ts | UNV (describe.skip) |
| 160 | src/__tests__/unit/remito-service.test.ts | UNV |
| 161 | src/__tests__/unit/remito-workspace-draft-recovery.test.ts | UNV |
| 162 | src/__tests__/unit/resumenCobranza.utils.test.ts | UNV |
| 163 | src/__tests__/unit/rules.canAutorizarFV.test.ts | UNV |
| 164 | src/__tests__/unit/seguimiento-adapter.test.ts | UNV |
| 165 | src/__tests__/unit/seguimiento-event-guard.test.ts | UNV |
| 166 | src/__tests__/unit/seguimiento-event-route.test.ts | UNV |
| 167 | src/__tests__/unit/seguimiento-service.test.ts | UNV |
| 168 | src/__tests__/unit/seguimiento-validator.test.ts | UNV |
| 169 | src/__tests__/unit/stock-accessibility-responsive.test.tsx | UNV |
| 170 | src/__tests__/unit/stock-ledger-facets.test.ts | UNV |
| 171 | src/__tests__/unit/stock-movement-origin-projection.test.ts | ALLOW |
| 172 | src/__tests__/unit/stock-new-article-honesty.test.tsx | UNV |
| 173 | src/__tests__/unit/stock-page-actions.test.tsx | UNV |
| 174 | src/__tests__/unit/stock-page-pagination.test.tsx | UNV |
| 175 | src/__tests__/unit/stock-performance.test.tsx | UNV |
| 176 | src/__tests__/unit/stock-physical-unit.test.ts | UNV |
| 177 | src/__tests__/unit/supplier-remittance-store-migration.test.ts | UNV |
| 178 | src/__tests__/unit/surgeries-intake-authorization.test.ts | UNV |
| 179 | src/__tests__/unit/surgery.service-archive.test.ts | UNV |
| 180 | src/__tests__/unit/surgery.service-coordinator-read.test.ts | ALLOW |
| 181 | src/__tests__/unit/surgery.service-delete-preview.test.ts | UNV |
| 182 | src/__tests__/unit/surgery.service-visible-number.test.ts | UNV |
| 183 | src/__tests__/unit/surgery-coordinator-read-model.test.ts | UNV |
| 184 | src/__tests__/unit/surgery-execution.service.test.ts | UNV |
| 185 | src/__tests__/unit/surgery-management.service.test.ts | UNV |
| 186 | src/__tests__/unit/surgery-management-route.test.ts | UNV |
| 187 | src/__tests__/unit/surgery-preparation.service.test.ts | UNV |
| 188 | src/__tests__/unit/surgery-preparation-client.test.ts | UNV |
| 189 | src/__tests__/unit/surgery-preparation-route.test.ts | UNV |
| 190 | src/__tests__/unit/surgery-visible-number-backfill.service.test.ts | UNV |
| 191 | src/__tests__/unit/trace-service.test.ts | UNV |
| 192 | src/__tests__/unit/tusfacturas-webhook.test.ts | UNV |
| 193 | src/__tests__/unit/useBackendActiveSurgeries.test.tsx | UNV |
| 194 | src/__tests__/unit/useCirugiaActions-contact-payload.test.ts | UNV |
| 195 | src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx | UNV |
| 196 | src/__tests__/unit/useCoordinationView.test.tsx | UNV |
| 197 | src/__tests__/unit/useFiscalEvidence.test.tsx | UNV |
| 198 | src/__tests__/unit/useInvoiceForm.test.ts | UNV |
| 199 | src/__tests__/unit/useOrdenesCompra-receipt-reconciliation.test.tsx | UNV |
| 200 | src/__tests__/unit/useTemporalNavigation.test.ts | UNV |
| 201 | src/__tests__/unit/vat-commercial.test.ts | UNV |
| 202 | src/__tests__/unit/wizard-validation.test.ts | UNV |

## components/ (97)

- ALLOW: 2
- UNV: 95

| # | Path | Category |
| ---: | --- | --- |
| 1 | src/__tests__/components/AiResultsPanel.test.tsx | UNV |
| 2 | src/__tests__/components/AiUploadZone.test.tsx | UNV |
| 3 | src/__tests__/components/ArticleSearchInput.test.tsx | UNV |
| 4 | src/__tests__/components/AttachConversationModal.test.tsx | UNV |
| 5 | src/__tests__/components/AuthProvider.test.tsx | UNV |
| 6 | src/__tests__/components/AvailabilityRequestActionDialog.test.tsx | UNV |
| 7 | src/__tests__/components/BaseFacturacionSelector.test.tsx | UNV |
| 8 | src/__tests__/components/CajasPreparation.http.test.tsx | UNV |
| 9 | src/__tests__/components/ChangeStateDialog.test.tsx | UNV |
| 10 | src/__tests__/components/ChangeStateDialogEvidence.test.tsx | UNV |
| 11 | src/__tests__/components/CircuitProgressCell.test.tsx | UNV |
| 12 | src/__tests__/components/CirugiasDataGrid.test.tsx | UNV |
| 13 | src/__tests__/components/CirugiasEmptyState.test.tsx | UNV |
| 14 | src/__tests__/components/CirugiasTable.test.tsx | UNV |
| 15 | src/__tests__/components/CobroFormDialog.backend.test.tsx | UNV |
| 16 | src/__tests__/components/CobrosPage.backend.test.tsx | UNV |
| 17 | src/__tests__/components/CollectionsDashboard.test.tsx | UNV |
| 18 | src/__tests__/components/ComercialTabAutorizar.test.tsx | UNV |
| 19 | src/__tests__/components/ComercialTabContent.test.tsx | UNV |
| 20 | src/__tests__/components/ComparativaOperativaV0.test.tsx | UNV |
| 21 | src/__tests__/components/ComprobantesAsociados.http.test.tsx | UNV |
| 22 | src/__tests__/components/ConfiguracionPageHonest.test.tsx | ALLOW |
| 23 | src/__tests__/components/ConsumoPanel.backend-id.test.tsx | UNV |
| 24 | src/__tests__/components/ContactoFormDialog.test.tsx | UNV |
| 25 | src/__tests__/components/ContactosCrud.backend.test.tsx | UNV |
| 26 | src/__tests__/components/ContactsBackendAuthorityUI.test.tsx | UNV |
| 27 | src/__tests__/components/CoordinadoresPage.test.tsx | UNV |
| 28 | src/__tests__/components/CoordinationAdvancedFilters.test.tsx | UNV |
| 29 | src/__tests__/components/CoordinationGlobalAccessBoundary.test.tsx | UNV |
| 30 | src/__tests__/components/CoordinationMetricFilters.test.tsx | UNV |
| 31 | src/__tests__/components/CoordinationPreviewBoundary.test.tsx | UNV |
| 32 | src/__tests__/components/CoordinationStateSurface.test.tsx | UNV |
| 33 | src/__tests__/components/CoordinatorActionConfirmDialog.test.tsx | UNV |
| 34 | src/__tests__/components/CoordinatorInboxView.test.tsx | UNV |
| 35 | src/__tests__/components/CxAttentionMarker.test.tsx | UNV |
| 36 | src/__tests__/components/CxOperationPresets.test.tsx | UNV |
| 37 | src/__tests__/components/CxOperationsDerivedSummary.test.tsx | UNV |
| 38 | src/__tests__/components/DefineDateModal.test.tsx | UNV |
| 39 | src/__tests__/components/DeleteSurgeryDialog.test.tsx | UNV |
| 40 | src/__tests__/components/DevolucionesPanel.test.tsx | UNV |
| 41 | src/__tests__/components/DiferenciasPopup.test.tsx | UNV |
| 42 | src/__tests__/components/DocumentacionPage.backend.test.tsx | UNV |
| 43 | src/__tests__/components/DocumentacionPanel.backend.test.tsx | UNV |
| 44 | src/__tests__/components/DocumentoAjustePDF.test.tsx | UNV |
| 45 | src/__tests__/components/DocumentosAjuste.test.tsx | UNV |
| 46 | src/__tests__/components/EditMaterialsModal.test.tsx | UNV |
| 47 | src/__tests__/components/ExpedienteFullView.test.tsx | UNV |
| 48 | src/__tests__/components/ExpedienteHeader.test.tsx | UNV |
| 49 | src/__tests__/components/ExpedienteMacroTimeline.test.tsx | UNV |
| 50 | src/__tests__/components/FacturacionPage.backend.test.tsx | UNV |
| 51 | src/__tests__/components/FacturacionPage.filters.test.tsx | UNV |
| 52 | src/__tests__/components/FacturacionPage.fiscal-evidence.test.tsx | UNV |
| 53 | src/__tests__/components/FiscalEvidenceDialog.test.tsx | UNV |
| 54 | src/__tests__/components/ImageViewerDialog.test.tsx | UNV |
| 55 | src/__tests__/components/ImportEvidenceFromMailModal.test.tsx | UNV |
| 56 | src/__tests__/components/InfoTooltip.test.tsx | UNV |
| 57 | src/__tests__/components/InvoiceItemsTable.test.tsx | UNV |
| 58 | src/__tests__/components/InvoiceWorkspace.test.tsx | UNV |
| 59 | src/__tests__/components/KeyValue.test.tsx | UNV |
| 60 | src/__tests__/components/LogisticaCajasEmission.http.test.tsx | UNV |
| 61 | src/__tests__/components/LogisticsGlobalInbox.test.tsx | UNV |
| 62 | src/__tests__/components/MaterialAutorizadoDetails.test.tsx | UNV |
| 63 | src/__tests__/components/MentionComposer.test.tsx | UNV |
| 64 | src/__tests__/components/MissingCountText.test.tsx | UNV |
| 65 | src/__tests__/components/MissingFieldsBar.test.tsx | UNV |
| 66 | src/__tests__/components/MobileCirugiaCard.test.tsx | UNV |
| 67 | src/__tests__/components/NewSurgeryDialog.test.tsx | UNV |
| 68 | src/__tests__/components/NotasComerciales.test.tsx | UNV |
| 69 | src/__tests__/components/NotificationMenu.test.tsx | UNV |
| 70 | src/__tests__/components/NotificationsInbox.test.tsx | UNV |
| 71 | src/__tests__/components/NovedadesTabContent.test.tsx | UNV |
| 72 | src/__tests__/components/OperationalRemitoWorkspace.test.tsx | UNV |
| 73 | src/__tests__/components/OrdenCompraEmitAction.test.tsx | UNV |
| 74 | src/__tests__/components/PresupuestoConnectedForm.test.tsx | UNV |
| 75 | src/__tests__/components/ProveedoresPage.backend.test.tsx | UNV |
| 76 | src/__tests__/components/ReceiptOperationalWorkspace.test.tsx | UNV |
| 77 | src/__tests__/components/ReceiveOrdenCompraDialog.test.tsx | UNV |
| 78 | src/__tests__/components/ReferenciasAdministrativasEditor.test.tsx | UNV |
| 79 | src/__tests__/components/RemitoCajasEmission.http.test.tsx | UNV |
| 80 | src/__tests__/components/RemitoDraftDialog.test.tsx | UNV |
| 81 | src/__tests__/components/RemitosPage.test.tsx | UNV |
| 82 | src/__tests__/components/ResumenEconomico.test.tsx | UNV |
| 83 | src/__tests__/components/RolesPageRedirect.test.tsx | ALLOW |
| 84 | src/__tests__/components/StockArticleSheet.actions.test.tsx | UNV |
| 85 | src/__tests__/components/StockArticleSheet.boxes.test.tsx | UNV |
| 86 | src/__tests__/components/StockArticleSheet.history.test.tsx | UNV |
| 87 | src/__tests__/components/StockArticleSheet.image.test.tsx | UNV |
| 88 | src/__tests__/components/StockArticleSheet.master-data.test.tsx | UNV |
| 89 | src/__tests__/components/StockArticleSheet.traceability.test.tsx | UNV |
| 90 | src/__tests__/components/StockArticleSheet.vat.test.tsx | UNV |
| 91 | src/__tests__/components/SurgeryContextTray.test.tsx | UNV |
| 92 | src/__tests__/components/SurgeryPalette.test.tsx | UNV |
| 93 | src/__tests__/components/SurgeryStateSelect.test.tsx | UNV |
| 94 | src/__tests__/components/TraceHardening.test.tsx | UNV |
| 95 | src/__tests__/components/TrackedReceiveOrdenCompraDialog.test.tsx | UNV |
| 96 | src/__tests__/components/UsuariosRolesView.test.tsx | UNV |
| 97 | src/__tests__/components/ViewCustomizationDialog.test.tsx | UNV |

## integration/ (16)

- ALLOW: 3 (round 2)
- DB-EXT: 11
- MOCKED-OFFLINE: 1
- UNV: 1

| # | Path | Category |
| ---: | --- | --- |
| 1 | src/__tests__/integration/cajas-preparation-postgres.test.ts | DB-EXT |
| 2 | src/__tests__/integration/consumos-api.test.ts | DB-EXT |
| 3 | src/__tests__/integration/contacts-backend-authority-migration-artifact.test.ts | ALLOW (round 2) |
| 4 | src/__tests__/integration/contacts-code-concurrency-postgres.test.ts | DB-EXT |
| 5 | src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts | ALLOW (round 2) |
| 6 | src/__tests__/integration/coordination-shipping-persistence-artifact.test.ts | ALLOW (round 2) |
| 7 | src/__tests__/integration/devoluciones-api.test.ts | DB-EXT |
| 8 | src/__tests__/integration/documentation-transactions.test.ts | DB-EXT |
| 9 | src/__tests__/integration/invoices-payments-api.test.ts | DB-EXT |
| 10 | src/__tests__/integration/mail-stage1-api.test.ts | UNV (round 2 conservative) |
| 11 | src/__tests__/integration/personal-calendar-postgres.test.ts | DB-EXT |
| 12 | src/__tests__/integration/presupuesto-revision-postgres.test.ts | DB-EXT |
| 13 | src/__tests__/integration/presupuestos-api.test.ts | DB-EXT |
| 14 | src/__tests__/integration/remitos-api.test.ts | DB-EXT |
| 15 | src/__tests__/integration/surgeries-create-api.test.ts | MOCKED-OFFLINE |
| 16 | src/__tests__/integration/surgery-visible-number-uniqueness-migration.test.ts | DB-EXT |

## Totals

- ALLOW: 11 (8 original + 3 round 2)
- MOCKED-OFFLINE: 1
- DB-EXT: 11
- UNV: 292 (295 original − 3 round 2 reclassified)
- **Sum**: 315
