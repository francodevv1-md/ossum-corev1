# OSSUM COR Interface System

OSSUM COR is an operational ERP. Its interface must optimize scanning, comparison, traceability, and repeated daily actions under time pressure.

## Canonical references

Use these implemented surfaces as the visual source of truth, in order:

1. `src/app/stock/page.tsx` — Artículos/Stock workspace, filters, dense tables, row states, master-data dialogs.
2. `src/app/remitos/page.tsx` — document workspace, inspectors, state surfaces, responsive operational controls.
3. Purchase document surfaces — workflow language and document-specific interactions where they agree with the first two references.

Shadcn components are implementation primitives. Their default composition is not the product's visual authority.

## Visual language

- Use `--ossum-navy` for data headers and primary hierarchy, `--ossum-action` for the main action and selected state, and the existing `--ossum-surface*` and `--ossum-line*` tokens for structure.
- Prefer one continuous full-height workspace: compact white header, compact toolbar/tabs, optional summary strip, and internally scrollable content.
- Avoid decorative hero cards, nested cards, oversized titles, and repeated shadows in operational modules.
- Use borders or elevation, not both. Dense operational surfaces normally use borders.
- Keep identifiers and machine-readable codes in monospace; do not use monospace decoratively.

## Tables and lists

- Data-heavy desktop views use semantic tables with sticky navy headers, white text, compact rows, clear numeric alignment, and visible hover/focus states.
- Keep state, identifiers, and the primary row action scannable without opening the record.
- Mobile may use a compact list when it materially improves readability; preserve the same information hierarchy and touch targets.
- Empty, loading, error, denied, refreshing, and filtered-empty states must be explicit and offer recovery when possible.

## Windows, dialogs, sheets, and modals

Every new focused overlay follows the same product grammar, regardless of the Shadcn primitive used:

- constrained viewport height with an independently scrollable body;
- bordered header, body, and footer regions;
- compact title and explanatory copy;
- fields grouped by operational meaning, not by component type;
- secondary action first and one clear primary action last;
- destructive actions visually distinct and never implied by the primary color;
- keyboard focus, labels, disabled/loading/error states, and mobile-safe actions;
- no modal when an inline action or dedicated page is clearer and does not require protected focus.

## Density and responsiveness

- Desktop controls normally use 32px height and 11–12px supporting text; preserve at least 44px touch targets on mobile where interaction requires it.
- Keep toolbars wrapping safely and data regions horizontally scrollable instead of compressing labels beyond recognition.
- Do not communicate status by color alone.
