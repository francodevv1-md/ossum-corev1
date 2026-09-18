# SPEC — Contacto Código Auto (Contador Per-Company) — Phase 1

> Track B — Phase 1: prototype, Zustand-backed, no schema changes.
> Proposal name: `CONTACTO-CODIGO-AUTO-P1`
> Status: SPEC ready for implementation. Franco-approved locked decisions applied.
> Environment: DEV/TEST only.

---

## 1. Overview

Phase 1 introduces an automatic, per-company sequential contact code (`C-0001`..`C-N`) with manual override and legacy code reformatting, implemented entirely in the prototype Zustand layer with no Prisma/DB changes. It replaces the current mock counter (`src/lib/idGenerators.ts`, base 9000) and the fake `buildCodigoContacto(id)=id.slice(0,6)` in the adapter, and wires auto-suggestion + validation + normalization into the contact form. Phase 2 (DB-backed `SequenceCounter` table, schema, Prisma migration) is explicitly out of scope.

## 2. Scope (Phase 1 only)

### In scope
- New pure helper module `src/lib/contact-code.ts` (format / parse / validate / normalize).
- Store additions in `src/lib/store.ts`: `getNextContactoCodigo`, `isCodigoContactoDisponible` signature extension, one-time legacy reformat action.
- Adapter changes in `src/lib/api/contact-adapter.ts`: real `codigo` source + payload inclusion.
- Form changes in `src/components/contactos/ContactoFormDialog.tsx`: auto-suggestion, read-only/edit toggle, validation, normalization, placeholder/label.
- JSDoc comment update in `src/types/index.ts` (no type shape change).
- Unit tests: `contact-code.test.ts`, `contactos-code-020.test.ts`.

### Out of scope (Phase 2 — do NOT touch in Phase 1)
- `prisma/schema.prisma`, migrations, new Prisma models.
- `SequenceCounter` table, DB provider changes, `src/lib/db.ts`.
- Multi-tenant real isolation at DB level (Phase 1 accepts `companyId` param and ignores it — forward-compat stub).
- Admin correction flow for already-assigned codes (immutable in Phase 1).
- Backfill of real Prisma `Contact.codigo` column.
- Any change to remitos/auditoría snapshots that reference old codes.

### Hard constraints (from AGENTS.md)
- §11: NO `schema.prisma` edit, NO migrations, NO new dependencies.
- §10: minimal additive changes only to `src/lib/store.ts` and JSDoc-only to `src/types/index.ts`.
- Forbidden files: `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/businessRules.ts`, `src/lib/cirugias.*`, `src/hooks/useCirugia*.ts`, `src/components/cirugias/*`.

## 3. User stories

- **US-1**: Como operador, al abrir "Nuevo Contacto", el campo Código viene auto-sugerido con el próximo secuencial de mi empresa (`C-0001`, `C-0002`…), read-only por defecto, para que no tenga que inventar un código.
- **US-2**: Como operador, puedo clickear el lápiz (toggle) sobre el código sugerido, escribir manualmente (ej: `C-0042`, `42`, `0042`), y al salir del campo se normaliza a `C-0042`; si viola formato o está repetido en mi empresa, se bloquea el guardado con mensaje claro.
- **US-3**: Como operador/admin, al Editar un contacto existente, el código siempre se muestra read-only (inmutable en Phase 1) — no hay toggle de edición en modo edición.
- **US-4**: Como admin, al activar Phase 1 (acción explícita del store), todos los contactos con códigos legacy no-conformes (ej: `8527`, `8712`) se reformatean a `C-0001`..`C-N` ordenados por `createdAt` asc, descartando cualquier código manual nuevo hasta reseedear.
- **US-5**: Como Franco, la secuencia por empresa es independiente: empresa A puede estar en `C-0007` y empresa B en `C-0003`, sin interferencia. En Phase 1, "empresa" = `activeCompany?.id` pasado al store (aceptado y usado solo si el store lo almacena por empresa; ver §6).

## 4. Functional requirements

- **FR-1 (Canonical format)**: The canonical stored format is `C-\d{4,}` (prefix `C-`, a dash, then a zero-padded number with minimum width 4 that auto-grows to 5+ digits when `n >= 10000`, e.g. `C-10000`). Regex: `^C-\d{4,}$`.
- **FR-2 (Input acceptance)**: The form input accepts `^(C-?)?\d{1,}$` case-insensitive (so `1`, `0001`, `C-1`, `C-0001`, `c-0001`, `C0001` are all accepted while typing).
- **FR-3 (Normalization on blur)**: On blur, the input value is normalized via `normalizeContactCode(input)`. If parseable → `C-{n padded to MIN_WIDTH}`. If unparseable → returns `null` and the field shows a format error.
- **FR-4 (Auto-suggest on create)**: In create mode (no `contacto` prop), on mount the form sets `codigoContacto = getNextContactoCodigo(activeCompany?.id)`. The field renders read-only with a pencil toggle.
- **FR-5 (Next = max+1)**: `getNextContactoCodigo` scans the `contactos` array, extracts the numeric suffix of every code matching `^C-\d{4,}$`, and returns `formatContactCode(max + 1)`. If no conforming codes exist, returns the constant `C-0001`.
- **FR-6 (No reuse of holes)**: Counter only derives from `max`; it never fills holes left by deleted MIDDLE contactos. Deleting a middle contacto does NOT free its code (next stays `max+1` of the remaining set). **Phase 1 edge case**: deleting the ONLY contacto leaves an empty array, which per FR-5 yields `C-0001` — i.e. the empty-array reset is a Phase 1 limitation (no persistent high-water-mark or deleted-code log). Full non-reuse across empty states is Phase 2 (DB-backed `SequenceCounter`).
- **FR-7 (Per-company isolation, Phase 1 stub)**: `getNextContactoCodigo(companyId?)` and `isCodigoContactoDisponible(codigo, companyId?)` accept an optional `companyId`. In Phase 1, the store filters contactos ONLY by conforming codes (it does not have a real companyId field on Contacto); the param is accepted for forward-compat and MUST match the signature expected by Phase 2. Phase 1 dev environment is single-tenant by data, so behavior equals "global" — but the API surface carries `companyId?`.
- **FR-8 (Manual override toggle)**: In create mode, user can toggle the code field to editable. Typing a value, on blur, normalizes and validates. If the normalized code is unavailable (FR-9) or malformed, save is blocked.
- **FR-9 (Uniqueness per company)**: `isCodigoContactoDisponible(codigo, companyId?)` returns `true` iff no existing contacto has the same `codigoContacto` (exact string match against the canonical normalized form). In Phase 1 the comparison is global over the Zustand array; `companyId` is accepted and ignored (stub).
- **FR-10 (Validation rules in form)**:
  - Empty code → error "El código es obligatorio".
  - Non-conforming after normalize → error "Formato inválido (usar C-0001)".
  - Duplicate via `isCodigoContactoDisponible` → error "El código ya existe".
  - On edit (existing contacto), code is immutable: skip uniqueness check (since unchanged); the field is read-only with no toggle.
- **FR-11 (Legacy reformat)**: An explicit store action `reformatLegacyContactoCodigos()` rewrites every contacto whose `codigoContacto` does NOT match `^C-\d{4,}$` to `C-{seq}` where `seq` accounts for already-conforming codes' max + 1, ordered ascending by `createdAt` (ties broken by current `id`). After reformat, `getNextContactoCodigo` reflects the new max. This is a one-time, idempotent operation (second run is a no-op because all codes are already conforming). It runs on explicit invocation (NOT automatically on store init in Phase 1 — keeps tests predictable; activation is opt-in). For Phase 1 dev ordering, see §6.
- **FR-12 (Adapter — read real code)**: `buildCodigoContacto` is removed. In `mapApiContactToContacto`, `codigoContacto` derives from `api.codigo` if present (forward-compat Phase 2), else from a deterministic transient fallback: `C-T${(id hash or id suffix)}` with a `// TODO(P2): replace with DB-backed counter` marker. The fallback is labeled transient (prefix `C-T`) so it cannot be mistaken for a real counter code and never conflicts with `^C-\d{4,}$`.
- **FR-13 (Adapter — payload includes code)**: `mapContactoToApiPayload` adds `payload.codigo = formData.codigoContacto` when `formData.codigoContacto` is present and non-empty (after trim). This is a forward-compat field: Phase 1 API may ignore it, but we send it.
- **FR-14 (Edit immutability)**: In edit mode, `handleSave` MUST NOT send `codigo` in PATCH payload, and MUST NOT pass `codigoContacto` through `updateContacto` (drops the `codigoContacto: codigoContacto.trim()` lines currently in the edit branch). Edit branch removes `codigoContacto` from the update object entirely.

## 5. Helper API specification — `src/lib/contact-code.ts` (NEW file)

Pure module, no React/Zustand import. Exact code:

```ts
// src/lib/contact-code.ts
// Contacto code format helpers — Phase 1 (Zustand prototype).
// Forward-compat: signatures are stable for Phase 2 (DB-backed counter).

export const CONTACT_CODE_PREFIX = "C-" as const
export const CONTACT_CODE_MIN_WIDTH = 4 as const
/** Canonical stored/recognized contact code. Matches C-0001, C-9999, C-10000… */
export const CONTACT_CODE_REGEX = /^C-\d{4,}$/

/** Input acceptance, case-insensitive (typing tolerance). */
export const CONTACT_CODE_INPUT_REGEX = /^(C-?)?\d{1,}$/i

/**
 * Format a positive integer n as a canonical contact code C-00..0n
 * (MIN_WIDTH zero-pad, auto-grow to 5 digits when n >= 10000).
 */
export function formatContactCode(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`formatContactCode: n must be a positive integer (got ${n})`)
  }
  return `${CONTACT_CODE_PREFIX}${String(n).padStart(CONTACT_CODE_MIN_WIDTH, "0")}`
}

/**
 * Parse a canonical code into its integer suffix.
 * Returns null if code is not strictly canonical (no input tolerance here).
 */
export function parseContactCode(code: string): number | null {
  if (typeof code !== "string") return null
  const m = code.match(CONTACT_CODE_REGEX)
  if (!m) return null
  return Number(code.slice(CONTACT_CODE_PREFIX.length))
}

/** True iff code is exactly the canonical stored form. */
export function isValidContactCodeFormat(code: string): boolean {
  return typeof code === "string" && CONTACT_CODE_REGEX.test(code)
}

/**
 * Normalize a loose user input into the canonical form, or null if unparseable.
 * Accepts case-insensitive prefix, optional dash, and any digit run: 
 *   "1" → "C-0001", "0001" → "C-0001", "C-1" → "C-0001", "c-0001" → "C-0001".
 *   "C-10000" → "C-10000" (auto-grow, no truncation).
 *   "" / "abc" / "C-abc" / "C-" / "12a" → null.
 */
export function normalizeContactCode(input: string): string | null {
  if (typeof input !== "string") return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!CONTACT_CODE_INPUT_REGEX.test(trimmed)) return null
  const digits = trimmed.replace(/^(C-?)/i, "")
  const n = Number(digits)
  if (!Number.isInteger(n) || n < 1) return null
  return formatContactCode(n)
}
```

Notes:
- The 4-digit minimum width applies only to the zero-pad; values `>= 10000` are emitted at full width (no truncation, no `slice`).
- `parseContactCode` is strictly canonical — used by the store counter to guarantee no false positives from transient fallback codes (`C-T…`).

## 6. Store changes specification — `src/lib/store.ts` (§10, minimal additive)

### 6.1 Interface additions (around existing CONTACTOS GETTERS block, line ~217)

```ts
// ADD to interface (next to isCodigoContactoDisponible):
getNextContactoCodigo: (companyId?: string) => string
reformatLegacyContactoCodigos: () => void
```

### 6.2 Modify `isCodigoContactoDisponible` signature

```ts
// BEFORE:
isCodigoContactoDisponible: (codigo: string) => boolean
// AFTER:
isCodigoContactoDisponible: (codigo: string, companyId?: string) => boolean
```

Implementation:
```ts
isCodigoContactoDisponible: (codigo, _companyId) => {
  // Phase 1: global over contactos; companyId accepted-and-ignored (forward-compat P2).
  void _companyId
  return !get().contactos.some((c) => c.codigoContacto === codigo)
},
```

> IMPORTANT backward-compat: existing test `isCodigoContactoDisponible("8527")` returns `false` because mock-contactos contains `codigoContacto: "8527"`. After Phase 1 activation (reformatLegacyContactoCodigos), mock codes are rewritten to `C-0001..C-N` so `"8527"` becomes available again. Tests in `contactos-store-020.test.ts` that rely on `8527` are updated in `contactos-code-020.test.ts` (the new test file). Existing store-020 tests must keep passing UNCHANGED because Phase 1 reformat is opt-in (not run on store init).

### 6.3 New action `getNextContactoCodigo`

```ts
import { parseContactCode, formatContactCode, CONTACT_CODE_REGEX } from "@/lib/contact-code"

// Inside the store object (CONTACTOS GETTERS block, near getContactoByCodigo):
getNextContactoCodigo: (_companyId) => {
  // Phase 1: companyId accepted and ignored (no per-company field on Contacto proto).
  void _companyId
  const contactos = get().contactos
  let max = 0
  for (const c of contactos) {
    if (typeof c.codigoContacto !== "string") continue
    if (!CONTACT_CODE_REGEX.test(c.codigoContacto)) continue
    const n = parseContactCode(c.codigoContacto)
    if (n !== null && n > max) max = n
  }
  return formatContactCode(max + 1)
},
```

- Returns the constant `C-0001` when array is empty or no codes match the canonical regex.
- Never reuses holes; only derives `max+1`.

### 6.4 Action `reformatLegacyContactoCodigos` (one-time, idempotent, opt-in)

```ts
import { CONTACT_CODE_REGEX, formatContactCode } from "@/lib/contact-code"

reformatLegacyContactoCodigos: () => {
  const contactos = get().contactos
  // Compute the starting counter = (max existing conforming n) + 1.
  let nextSeq = 1
  for (const c of contactos) {
    if (typeof c.codigoContacto === "string" && CONTACT_CODE_REGEX.test(c.codigoContacto)) {
      const n = parseContactCode(c.codigoContacto)
      if (n !== null && n >= nextSeq) nextSeq = n + 1
    }
  }
  // Order legacy (non-conforming) contactos by createdAt asc, falls back to id asc.
  const legacy = contactos
    .filter((c) => typeof c.codigoContacto !== "string" || !CONTACT_CODE_REGEX.test(c.codigoContacto))
    .sort((a, b) => {
      const ta = a.createdAt ?? ""
      const tb = b.createdAt ?? ""
      if (ta !== tb) return ta < tb ? -1 : 1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
  if (legacy.length === 0) return // idempotent: no-op
  // Build a code map (preserve the assignment order across the array).
  const updates = new Map<string, string>()
  for (const c of legacy) {
    updates.set(c.id, formatContactCode(nextSeq++))
  }
  set((s) => ({
    contactos: s.contactos.map((c) =>
      updates.has(c.id)
        ? { ...c, codigoContacto: updates.get(c.id)!, updatedAt: nowDate() }
        : c
    ),
  }))
},
```

Notes:
- Existing conforming codes keep their values; only legacy codes get the next sequence numbers. This is the "Migration: YES" locked decision.
- `updatedAt` is bumped to make the reformat observable in audit (Phase 1 dev only; no audit table).
- Idempotency: running twice is a no-op because all codes will already conform.
- Activation: the implementer wires this into a single explicit call site (NOT auto-run on store init) so existing tests stay stable. Wire-up could be added to a dev-only settings button or run manually in dev console; spec leaves the exact trigger URL out of Phase 1 code path. Tests invoke it directly.

### 6.5 No changes to `createContacto`, `getContactoByCodigo`, `searchContactos` (`searchContactos` already searches `codigoContacto` as a string, so searching `C-0001` works unmodified).

## 7. Adapter changes specification — `src/lib/api/contact-adapter.ts` (NOT §10)

### 7.1 Remove `buildCodigoContacto`
Delete the function (lines 18–20). Nothing else imports it.

### 7.2 New code source in `mapApiContactToContacto`
Replace line 66 (`codigoContacto: buildCodigoContacto(id),`) with:

```ts
codigoContacto: resolveContactoCodigo(apiContact),
```

And add a private helper (module-level, above `mapApiContactToContacto`):

```ts
import { formatContactCode } from "@/lib/contact-code"

/**
 * Resolve a Contacto code from the API response.
 * Phase 2 will populate api.codigo from the DB-backed SequenceCounter.
 * Phase 1 fallback: a deterministic transient label that CANNOT collide
 *   with the canonical C-\d{4,} regex (uses "C-T" prefix), and is
 *   clearly flagged as transient for migration.
 */
function resolveContactoCodigo(api: Record<string, unknown>): string {
  // TODO(P2): replace fallback with DB-backed api.codigo once Phase 2 lands.
  const real = typeof api.codigo === "string" ? api.codigo.trim() : ""
  if (real) return real
  // Transient fallback: deterministic but obviously non-canonical.
  const id = (api.id as string) ?? ""
  const suffix = id.replace(/[^A-Za-z0-9]/g, "").slice(-4) || "0000"
  return `C-T${suffix}` // intentionally fails ^C-\d{4,}$ — won't pollute counter
}
```

### 7.3 Add `codigo` to `mapContactoToApiPayload`
After the existing role block (before `return payload`, line ~157), insert:

```ts
// Forward-compat P2: send the contact code so the API can persist it.
const codigo = formData.codigoContacto?.trim()
if (codigo) {
  payload.codigo = codigo
}
```

### 7.4 Update module-level JSDoc (lines 97–106)
Update the "Fields NOT mapped" list in the docblock: remove `codigoContacto` from that list (it is now mapped).

## 8. Form changes specification — `src/components/contactos/ContactoFormDialog.tsx`

### 8.1 Imports
Add to the existing import block:
```ts
import {
  CONTACT_CODE_REGEX,
  isValidContactCodeFormat,
  normalizeContactCode,
} from "@/lib/contact-code"
import { Pencil } from "lucide-react"   // add Pencil to existing lucide import on line 29
```

### 8.2 New state (after `codigoError` declaration, line 138)
```ts
const [codigoEditable, setCodigoEditable] = useState(false)
```

### 8.3 Initial value of `codigoContacto` (line 107) — auto-suggest in create mode
Replace:
```ts
const [codigoContacto, setCodigoContacto] = useState(contacto?.codigoContacto ?? "")
```
with:
```ts
const [codigoContacto, setCodigoContacto] = useState(
  contacto?.codigoContacto ?? store.getNextContactoCodigo(activeCompany?.id)
)
```
- In edit mode (`contacto` present): uses the existing code (immutable).
- In create mode: pre-filled with next sequential from the store.

### 8.4 Toggle button rendering (replace the Código field block, lines 397–405)
```tsx
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <Label className="text-xs">Código *</Label>
    {!isEditing && (
      <button
        type="button"
        onClick={() => {
          setCodigoEditable((v) => !v)
          setCodigoError("")
        }}
        className="text-muted-foreground hover:text-primary"
        aria-label={codigoEditable ? "Bloquear código sugerido" : "Editar código manualmente"}
        title={codigoEditable ? "Bloquear" : "Editar manualmente"}
      >
        <Pencil className="size-3.5" />
      </button>
    )}
  </div>
  <Input
    className="h-8 text-sm"
    value={codigoContacto}
    readOnly={!isEditing && !codigoEditable}
    onChange={(e) => { setCodigoContacto(e.target.value); setCodigoError("") }}
    onBlur={() => handleCodigoBlur()}
    placeholder="Ej: C-0001"
  />
  <p className="text-[10px] text-muted-foreground">
    {isEditing
      ? "Inmutable (solo lectura)"
      : codigoEditable
        ? "Ingresa el código, se normaliza al salir (ej: 42 → C-0042)"
        : "Sugerido automáticamente"}
  </p>
  {codigoError && <p className="text-[10px] text-red-600">{codigoError}</p>}
</div>
```

### 8.5 New blur handler (add near other handlers, before `validate`)
```ts
const handleCodigoBlur = () => {
  if (isEditing) return // immutable, nothing to normalize
  const trimmed = codigoContacto.trim()
  if (!trimmed) {
    setCodigoContacto("")
    return
  }
  const normalized = normalizeContactCode(trimmed)
  setCodigoContacto(normalized ?? trimmed) // keep raw value visible if invalid so user sees input
}
```

### 8.6 Rewrite `validate` (lines 163–189) — pure format + uniqueness
```ts
const validate = (): boolean => {
  let valid = true

  if (!nombre.trim()) {
    setNombreError("El nombre es obligatorio")
    valid = false
  } else {
    setNombreError("")
  }

  // ── Code validation (Phase 1) ──
  if (isEditing) {
    // Immutable: skip all code checks (display-only).
    setCodigoError("")
  } else if (!codigoContacto.trim()) {
    setCodigoError("El código es obligatorio")
    valid = false
  } else if (!isValidContactCodeFormat(codigoContacto.trim())) {
    setCodigoError("Formato inválido (usar C-0001)")
    valid = false
  } else if (!store.isCodigoContactoDisponible(codigoContacto.trim(), activeCompany?.id)) {
    setCodigoError("El código ya existe")
    valid = false
  } else {
    setCodigoError("")
  }

  return valid
}
```

### 8.7 Edit branch: drop `codigoContacto` from updates (FR-14)
In `handleSave`, on the `isEditing && contacto` branch (both the try block line ~258 and the fallback catch block line ~328), REMOVE the `codigoContacto: codigoContacto.trim(),` line from the `store.updateContacto` object. The PATCH payload comes from `mapContactoToApiPayload(formData)` and `formData` does NOT include `codigoContacto` in the edit branch either (it already doesn't — `formData` line 227 omits `codigoContacto`), so the only source of leakage is the `updateContacto` calls. Remove those two lines.

In create branch, keep passing `codigoContacto: codigoContacto.trim()` to `store.createContacto` (must persist the canonical code).

### 8.8 Title (optional cosmetic, line 384) — keep `contacto?.codigoContacto` readout (unchanged works).

## 9. File plan

| File path | Action | §10? | Change summary |
|---|---|---|---|
| `src/lib/contact-code.ts` | CREATE | No | Pure helpers: format/parse/validate/normalize + constants. ~50 lines. |
| `src/lib/store.ts` | MODIFY (additive) | YES | Add `getNextContactoCodigo`, `reformatLegacyContactoCodigos`; extend `isCodigoContactoDisponible` signature with optional `companyId`. Import helpers. ~35 lines added. No edits to existing CRUD logic. |
| `src/types/index.ts` | MODIFY (JSDoc only) | YES | Update JSDoc on `Contacto.codigoContacto` (line ~845) from `ej: 8527, 8712` to `ej: C-0001, C-0042 (Phase 1 canonical form)`. No type shape change. |
| `src/lib/api/contact-adapter.ts` | MODIFY | No | Remove `buildCodigoContacto`; add `resolveContactoCodigo` (reads `api.codigo` or transient `C-T###` fallback with TODO(P2)); add `codigo` to `mapContactoToApiPayload`; update module JSDoc. |
| `src/components/contactos/ContactoFormDialog.tsx` | MODIFY | No | Auto-suggest on create-mount, read-only default + `Pencil` toggle, onBlur normalize, format+uniqueness validation, placeholder `Ej: C-0001`, hint line; drop `codigoContacto` from edit-branch `updateContacto` calls. |
| `src/__tests__/unit/contact-code.test.ts` | CREATE | No | Pure helper unit tests (see §10). |
| `src/__tests__/unit/contactos-code-020.test.ts` | CREATE | No | Store `getNextContactoCodigo`, `reformatLegacyContactoCodigos`, `isCodigoContactoDisponible(codigo, companyId?)` (see §10). |

Forbidden / untouched in Phase 1: `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/idGenerators.ts` (kept as-is; still used for non-contacto IDs), `src/lib/businessRules.ts`, all cirugías files, `useCirugia*` hooks, `src/components/cirugias/*`.

## 10. Test plan

### 10.1 `src/__tests__/unit/contact-code.test.ts`

```
read all cases from the proposal: formatContactCode(n), parseContactCode(code),
isValidContactCodeFormat(code), normalizeContactCode(input).
```

Exact cases (each as an `it`):

**formatContactCode(n)**:
- `formatContactCode(1)` → `"C-0001"`
- `formatContactCode(42)` → `"C-0042"`
- `formatContactCode(9999)` → `"C-9999"`
- `formatContactCode(10000)` → `"C-10000"` (auto-grow, no truncation)
- `formatContactCode(123456)` → `"C-123456"`
- `formatContactCode(0)` → throws `RangeError`
- `formatContactCode(-1)` → throws `RangeError`
- `formatContactCode(1.5)` → throws `RangeError` (not integer)
- `formatContactCode(NaN)` → throws `RangeError`

**parseContactCode(code)**:
- `parseContactCode("C-0001")` → `1`
- `parseContactCode("C-0042")` → `42`
- `parseContactCode("C-10000")` → `10000`
- `parseContactCode("C-0000")` → `0` (canonical regex allows `C-0000`? NO — `^C-\d{4,}$` does match `C-0000`. Implementer note: `parseContactCode` returns `0` for `C-0000`; FR-1 says suffix is positive n. Document edge: `formatContactCode(0)` throws, so `C-0000` is parseable but never produced by the counter. Test asserts `parseContactCode("C-0000") === 0`.)
- `parseContactCode("C0001")` → `null` (no dash)
- `parseContactCode("c-0001")` → `null` (case-sensitive, canonical only)
- `parseContactCode("0001")` → `null` (no prefix)
- `parseContactCode("C-T0001")` → `null` (transient fallback rejected)
- `parseContactCode("")` → `null`
- `parseContactCode("C-1")` → `null` (must be ≥4 digits in canonical form)
- `parseContactCode("C-abc")` → `null`

**isValidContactCodeFormat(code)**:
- `isValidContactCodeFormat("C-0001")` → `true`
- `isValidContactCodeFormat("C-10000")` → `true`
- `isValidContactCodeFormat("c-0001")` → `false` (case-sensitive)
- `isValidContactCodeFormat("C0001")` → `false` (no dash)
- `isValidContactCodeFormat("0001")` → `false`
- `isValidContactCodeFormat("8527")` → `false` (legacy)
- `isValidContactCodeFormat("C-T0001")` → `false` (transient)
- `isValidContactCodeFormat("")` → `false`
- `isValidContactCodeFormat("C-0000")` → `true` (passes regex; USA: never produced by counter)

**normalizeContactCode(input)**:
- `normalizeContactCode("1")` → `"C-0001"`
- `normalizeContactCode("42")` → `"C-0042"`
- `normalizeContactCode("0001")` → `"C-0001"`
- `normalizeContactCode("C-1")` → `"C-0001"`
- `normalizeContactCode("C-0001")` → `"C-0001"`
- `normalizeContactCode("c-0001")` → `"C-0001"`
- `normalizeContactCode("C0001")` → `"C-0001"`
- `normalizeContactCode("C-10000")` → `"C-10000"` (auto-grow)
- `normalizeContactCode("  C-0042  ")` → `"C-0042"` (trims whitespace)
- `normalizeContactCode("")` → `null`
- `normalizeContactCode("   ")` → `null` (only whitespace)
- `normalizeContactCode("abc")` → `null`
- `normalizeContactCode("C-abc")` → `null`
- `normalizeContactCode("C-")` → `null`
- `normalizeContactCode("12a")` → `null`
- `normalizeContactCode("0")` → `null` (zero is not a valid n)
- `normalizeContactCode("-1")` → `null` (regex rejects; the `-` only allowed after `C`)

### 10.2 `src/__tests__/unit/contactos-code-020.test.ts`

Setup pattern: import `useOrtoTrackStore`, use `getStore()` helper like `contactos-store-020.test.ts`. Use a fresh store with `setState({ contactos: [] })` at the start of each code-test describe block, then seed explicitly.

Test cases:

**getNextContactoCodigo**:
- `empty contactos array` → `"C-0001"` (forward-compat seed).
- `single conforming C-0003` → `"C-0004"`.
- `sequential C-0001, C-0002, C-0003` → `"C-0004"`.
- `mixed legacy (8527, 8712) without conforming` → `"C-0001"` (legacy ignored).
- `mixed C-0005 + legacy 8527` → `"C-0006"` (max is 5).
- `C-9999 only` → `"C-10000"` (auto-grow to 5 digits).
- `C-10000 + C-10005` → `"C-10006"`.
- `transient fallback C-T0001 + C-T0002` → `"C-0001"` (transient codes do not pollute counter).
- `duplicated conforming codes C-0001, C-0001` (instrumental edge) → `"C-0002"`.
- `companyId param accepted but ignored`: `getNextContactoCodigo("comp-A")` and `getNextContactoCodigo("comp-B")` over the same array return the same value (Phase 1 stub does not partition).
- `no reuse of holes (middle delete)`: contactos `C-0001, C-0002, C-0003`; delete `C-0002`; `getNextContactoCodigo()` → still `"C-0004"` (hole not filled).
- `empty-array reset (Phase 1 limitation)`: create only `C-0001`, delete it (array now empty); `getNextContactoCodigo()` → `"C-0001"` per FR-5 (no persistent high-water-mark in Phase 1; full non-reuse is Phase 2).

**isCodigoContactoDisponible(codigo, companyId?)**:
- `C-0042` not in array → `true`.
- `C-0001` present in array → `false`.
- `legacy "8527"` present in array (un-reformatted) → `false` (matches stored `8527`).
- `companyId` is accepted and ignored: `isCodigoContactoDisponible("C-0001", "comp-A")` and without companyId return identical values.
- Backward-compat: `isCodigoContactoDisponible("8527")` returns `false` BEFORE reformatLegacy (mock has 8527); after reformat, the same string becomes `true`.

**reformatLegacyContactoCodigos**:
- Setup: `contactos = [{id:"A",codigoContacto:"8527",createdAt:"2025-01-01"},{id:"B",codigoContacto:"8712",createdAt:"2025-02-01"},{id:"C",codigoContacto:"C-0001",createdAt:"2024-12-01"}]`.
- After `reformatLegacyContactoCodigos()`:
  - C keeps `C-0001` (was conforming).
  - A becomes `C-0002` (oldest legacy, createdAt asc).
  - B becomes `C-0003`.
- Run again (idempotent): no state change; array unchanged.
- Counter reacts: `getNextContactoCodigo()` → `"C-0004"`.
- Legacy ignored by counter until reformatted: before reformat, with the same seed, `getNextContactoCodigo()` → `"C-0002"` (max conforming = 1); AFTER reformat → `"C-0004"`.
- Tie-breaking on `createdAt`: two contactos with identical `createdAt` get assigned by `id` ascending (test with ids `"X"/"Y"` same createdAt → X gets lower seq).
- Full legacy reformat (no conforming codes at all): 3 legacy entries with distinct createdAt → reformatted to `C-0001`, `C-0002`, `C-0003` in createdAt asc order; `getNextContactoCodigo()` → `"C-0004"`.

## 11. Acceptance criteria (Phase 1)

1. `src/lib/contact-code.ts` exists and exports `CONTACT_CODE_PREFIX`, `CONTACT_CODE_MIN_WIDTH`, `CONTACT_CODE_REGEX`, `formatContactCode`, `parseContactCode`, `isValidContactCodeFormat`, `normalizeContactCode`. Verified by `contact-code.test.ts` passing 100% of the §10.1 cases.
2. `store.getNextContactoCodigo([companyId])` returns `C-0001` for an empty array, `C-0042` for max `41`, and auto-grows to `C-10000`+ when max is `9999`. Verified by `contactos-code-020.test.ts`.
3. `store.getNextContactoCodigo` does not fill holes after a MIDDLE delete (non-decreasing over the remaining set). Verified by a middle-delete test. (Phase 1 limitation: deleting the only contacto resets to `C-0001` per FR-5; full non-reuse across empty states is Phase 2.)
4. `store.isCodigoContactoDisponible(codigo[, companyId])` keeps returning the same result as today (backward-compatible) when called without `companyId`. Verified by existing `contactos-store-020.test.ts` passing UNCHANGED.
5. `store.reformatLegacyContactoCodigos()` rewrites all non-conforming `codigoContacto` to `C-NNNN` ordered by `createdAt` asc (id asc on ties), preserving conforming codes, and is idempotent. Verified by `contactos-code-020.test.ts`.
6. `mapApiContactToContacto` never again produces `id.slice(0,6)`; either uses `api.codigo` when present or emits a transient `C-T####` fallback that fails `^C-\d{4,}$`. Verified by an adapter test (see §10 expansion if needed) OR manual smoke: an API contact with `codigo: "C-0042"` maps to `codigoContacto: "C-0042"`; an API contact without `codigo` maps to a `C-T####` value.
7. `mapContactoToApiPayload` includes `payload.codigo` when `formData.codigoContacto` is set and trimmed non-empty; omits it otherwise.
8. In `ContactoFormDialog` create mode, opening the dialog pre-fills `codigoContacto` with the next sequential; the field is read-only with a `Pencil` toggle that enables manual editing.
9. In edit mode, the field is read-only with NO toggle, and `handleSave`'s edit-branch `store.updateContacto` calls do NOT include `codigoContacto`.
10. Manual entry normalizes on blur: `42` → `C-0042`; invalid `abc` → kept raw with visible error after submit attempt.
11. Validation blocks save on: empty code, non-canonical-after-normalize code, duplicate code (by exact string match). Saves otherwise.
12. `tsc --noEmit` clean. `vitest run src/__tests__/unit/contact-code.test.ts src/__tests__/unit/contactos-code-020.test.ts src/__tests__/unit/contactos-store-020.test.ts` passes 100%.
13. No new dependencies added. No edits to `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/businessRules.ts`, `src/lib/idGenerators.ts` (kept unchanged), cirugías files.

## 12. Risks

- **R-1 — Mock-data pollution**: `contactos-store-020.test.ts` asserts `getContactoByCodigo("8527")` returns "OSDE Binario". If `reformatLegacyContactoCodigos` is auto-run on store init, that test breaks. Mitigation: reformat is OPT-IN; existing tests stay green. The new test file `contactos-code-020.test.ts` uses isolated `setState` to seed its own arrays.
- **R-2 — Per-company isolation is fake in Phase 1**: `companyId` is accepted but ignored. Risk of false confidence that the system is multi-tenant-safe. Mitigation: spec clearly labels it as forward-compat stub; Phase 2 replaces with real DB partitioning.
- **R-3 — Transient fallback `C-T####` collides visually**: A dev might mistake a transient code for a real one if a future format check loosens the regex. Mitigation: comments in adapter + helpers reject `C-T####` strictly; test asserts the fallback fails `^C-\d{4,}$` and never influences the counter.
- **R-4 — Edit immutability leakage in fallback**: The form's `updateContacto` edit branch currently sends `codigoContacto`. If the implementer forgets to drop both copies (try + catch fallback), edit will silently keep an immutable-looking-but-editable value. Mitigation: acceptance criterion 9 explicit; review must check both call sites.
- **R-5 — `parseContactCode("C-0000")` returns 0**: A malformed-but-canonical-regex code can be parsed to `0`. The counter never produces `0` (`formatContactCode(0)` throws), so `C-0000` cannot enter the array via the counter — but legacy data or manual entry could produce it if validation were bypassed. Mitigation: validation `isValidContactCodeFormat` accepts `C-0000` per regex, but the form's `validate` step uses `isValidContactCodeFormat` only, so an operator could in principle type `C-0000`. Phase 1 accepts this (dev/test only); Phase 2 should tighten validation to reject `n < 1`. Documented, not blocking.
- **R-6 — Adapter `api.codigo` sent but ignored in Phase 1**: The Phase 1 API endpoint does not yet persist `codigo`. Sending it is harmless (forward-compat) but a strict API contract could reject unknown fields. Mitigation: confirm with backend route (`/api/companies/[id]/contacts`) ignores unknown fields, or guard the payload addition behind a feature flag. (Recommend: send unconditionally; Next API Routes typically ignore unknown fields. Reviewer to verify before merge.)
- **R-7 — Ordering ambiguity on reformat**: If two legacy contactos share identical `createdAt` AND sequential `id`s, the assigned order is deterministic but not meaningful. Phase 1 dev data has distinct `createdAt` strings so this risk is theoretical. Mitigation: documented tie-break rule; reviewer can spot-check.
- **R-8 — No `createdAt` on some mocked or legacy contacts**: `sort` handles `undefined` `createdAt` by coercing to `""` (which sorts first). Verified safe but flagged.

---

## Handoff

### Done
- SPEC drafted for Contacto Código Auto Phase 1 (Zustand-backed, no schema).
- Grounded against actual repo: store.ts, contact-adapter.ts, ContactoFormDialog.tsx, types/index.ts, mock-contactos.ts, idGenerators.ts, existing store-020 tests.

### Changed
- (No code changes — SPEC phase only.) Created `knowledge/specs/CONTACTO-CODIGO-AUTO-P1/SPEC.md`.

### Files
- `knowledge/specs/CONTACTO-CODIGO-AUTO-P1/SPEC.md` — this spec.
- (Referenced, not modified): `src/lib/store.ts`, `src/lib/api/contact-adapter.ts`, `src/components/contactos/ContactoFormDialog.tsx`, `src/types/index.ts`, `src/__tests__/unit/contactos-store-020.test.ts`.

### Validations
- Spec sections 5–8 contain exact code to paste (helpers, store actions, adapter, form).
- §10 test plan enumerates every assertion case.
- §11 acceptance criteria numbered and individually testable.
- §12 risks enumerated with mitigations.

### Risks
- Implementation must NOT auto-run legacy reformat on store init (R-1).
- Edit-branch `updateContacto` calls must drop `codigoContacto` in BOTH try + catch paths (R-4).
- `companyId` per-company isolation is fake in Phase 1 (R-2) — Phase 2 follow-up required.
- Reviewer must confirm API endpoint ignores unknown `codigo` field in payload (R-6).

### Next
- Hand off to sdd-tasks phase to produce `TASKS.md` against this spec, OR directly to implementer (Backend/Frontend agent pair, single owner per file per §10) with a task brief using the AGENTS.md multiagent template.