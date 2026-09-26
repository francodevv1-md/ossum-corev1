-- Legacy correlations remain readable without a snapshot. Phase B creates only
-- correlations with a complete, server-derived allocation trace snapshot.
ALTER TABLE "cajas_reservation_correlation"
ADD COLUMN "allocation_trace_snapshot" JSONB;
