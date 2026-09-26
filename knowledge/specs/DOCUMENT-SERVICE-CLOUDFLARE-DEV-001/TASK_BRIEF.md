# DOCUMENT-SERVICE-CLOUDFLARE-DEV-001

## Objective

Create the isolated DEV foundation for OSSUM COR document processing using a private R2 bucket, R2 event notifications, Cloudflare Queues, a queue-only Worker, Azure Document Intelligence, and a dead-letter queue.

## Scope

- New code only under `workers/document-service/`.
- Reuse `ossum-cor-documents-dev`.
- Consume `ossum-document-processing-dev` with `ossum-document-processing-dlq-dev`.
- Store Azure extraction results back in private R2.
- Keep Azure behind `DocumentReaderProvider`.
- Select `prebuilt-invoice` for invoices and purchase orders; use `prebuilt-layout` otherwise.

## Exclusions

- No deploy, R2 event rule, Cloudflare secret mutation, production resource, Prisma/schema change, persistence, UI, or Workers AI binding/normalization in this slice.
- No automatic write into OSSUM domain modules.

## Validation

- Unit tests for model selection, event filtering, and output keys.
- TypeScript check.
- Wrangler dry-run only.
