# C14 WCB-06 valid candidate preservation

This repository artifact preserves the narrow valid-candidate delta required by GGA #7221 without replacing the active schema candidate or unrelated tenant worktree edits.

```diff
model StockReservationEvidence {
  @@unique([companyId, id], map: "uq_sre_company_id")
  @@unique([companyId, reservationId, id], map: "uq_sre_company_reservation_id")
  @@unique([reservationId, sequence], map: "uq_sre_reservation_seq")
- @@unique([companyId, commandAcceptanceId], map: "uq_sre_command")
+ @@unique([companyId, commandAcceptanceId, reservationId], map: "uq_sre_command_reservation")
  @@index([companyId, acceptedAt], map: "ix_sre_company_time")
}
```

The forward migration artifact is `prisma/migrations/20260921020000_stock_reservation_evidence_command_reservation_unique/migration.sql`. It is intentionally unexecuted. The source worktree, its existing tenant-isolation changes, C13 history, and prior migrations remain authoritative and untouched by this preservation record.
