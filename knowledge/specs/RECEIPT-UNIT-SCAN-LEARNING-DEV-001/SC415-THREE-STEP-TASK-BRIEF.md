# SC415 Three-Step Reception DEV

## Objective

Reduce `/recepciones` to Cargar remito → Escanear productos → Confirmar recepción, with all scan sources using the existing receipt scan resolver.

## Scope

- Route `/recepciones` directly to `ReceiptOperationalWorkspace`.
- Automatically create the receipt draft after OCR extraction; remove the visible OCR review and `Iniciar recepción` step.
- Keep a compact manual fallback that creates a draft without expected lines.
- Keep scanner HID, camera and manual entry on the same input/resolver and restore focus after every completed request.
- Preserve existing guided trace capture, differences, and confirm-only stock mutation.
- Remove WebP from the accepted document types because the configured Azure extractor does not accept it.

## Exclusions

- No Prisma/schema/migration/API/Auth/dependency changes.
- No provider-specific parsing rules.
- Do not modify `ComprasOcrWorkspace` or the existing receipt service/scan routes.

## Validation

- Focused component tests including automatic OCR-to-scan transition, HID Enter scan, manual fallback, trace capture and confirm behavior.
- Focused lint and independent review.
