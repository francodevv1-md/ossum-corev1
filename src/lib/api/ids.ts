// Lightweight runtime guard for backend-persisted ids used by shared readers.
// Accepts cuid, uuid and long hex strings; rejects empty/short ids and visible
// numbers (e.g. "CX-0001", "1234") that come from the local store or the UI label.
//
// Allowed shapes:
//   cuid   : starts with "c", 25 lowercase alnum chars
//   uuid v4: 8-4-4-4-12 hex
//   long hex: 24+ hex chars
const CUID = /^c[a-z0-9]{24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_HEX = /^[0-9a-f]{24,}$/i;

export function isTechnicalId(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value.length < 12) return false;
  return CUID.test(value) || UUID.test(value) || LONG_HEX.test(value);
}
