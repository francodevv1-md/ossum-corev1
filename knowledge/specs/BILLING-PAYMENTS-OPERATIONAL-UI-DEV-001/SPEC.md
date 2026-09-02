# Operational billing and payments V1

## Invoices
- Load company-scoped backend Invoices.
- Create a manual one-line draft with description, positive amount, optional surgery link and metadata-only internal reference.
- Emit explicitly in a separate action; backend assigns `visibleNumber`.
- Present `Borrador`, `Emitida`, `Parcialmente_cobrada`, `Cobrada`, and `Anulada` without inventing overdue/customer state.

## Payments
- Register only a payment bound to one emitted/partially-paid Invoice using its real `invoiceId` FK.
- Default amount to the backend balance and reject non-positive or over-balance input client-side while API remains authoritative.
- List backend Payments and their imputations.
- Cancel only `Registrado` Payments through the existing endpoint; refresh Invoice and Payment projections afterward.

## Honest boundaries
- All documents are operational and non-fiscal.
- No unallocated payments or later imputation.
- No authoritative customer/payer/account-current UI until identity snapshot policy exists.
