// OSSUM COR — Redacted logger for fiscal lookups.
//
// Adapter that emits structured log events for CUIT lookups while
// enforcing ADR-027H §2 (redaction): it MUST NEVER receive nor log
// `apikey`, `apitoken`, `usertoken`, raw request/response bodies, the
// full CUIT, or any other PII. The wrapper (`cuit-lookup.service`) is
// responsible for projecting only the safe subset onto this surface.
//
// A custom logger sink can be injected via `__setLoggerSink` so unit
// tests can capture emissions without touching `console`. The default
// implementation writes a single structured object to `console.info`.
//
// All log calls are wrapped in try/catch: a logging failure must never
// break the lookup flow.

export interface RedactedLogEvent {
  provider: "stub" | "tusfacturas";
  responseCode: string;
  errorCode?: string;
  requestId: string;
  actorUserId: string;
  companyId: string;
  durationMs: number;
  maskedCuit: string;
}

export type RedactedLogSink = (event: RedactedLogEvent) => void;

let sink: RedactedLogSink = (event) => {
  // Default sink: a single structured object. Avoids string interpolation
  // so PII can never leak through accidental template literals.
  // eslint-disable-next-line no-console
  console.info("[cuit-lookup]", event);
};

// Test seams.
let lastLogCall: RedactedLogEvent | null = null;

export function __setLoggerSink(fn: RedactedLogSink | null): void {
  sink = fn ?? ((event) => {
    // eslint-disable-next-line no-console
    console.info("[cuit-lookup]", event);
  });
}

export function __resetLoggerSink(): void {
  sink = (event) => {
    // eslint-disable-next-line no-console
    console.info("[cuit-lookup]", event);
  };
  lastLogCall = null;
}

export function __getLastLogCall(): RedactedLogEvent | null {
  return lastLogCall;
}

/**
 * Mask a CUIT for safe logging: first 4 digits + "******" + last 2
 * digits of the normalized 11-digit CUIT. If the CUIT is not exactly
 * 11 digits, returns "***invalid***" so we never log a partial CUIT.
 */
export function __maskCuit(cuit: string): string {
  if (typeof cuit !== "string" || cuit.length !== 11 || !/^\d{11}$/.test(cuit)) {
    return "***invalid***";
  }
  return `${cuit.slice(0, 4)}******${cuit.slice(-2)}`;
}

/**
 * Emit a redacted log event. Wrapped in try/catch so a logging failure
 * can never break the lookup flow. The default sink writes to
 * `console.info`; the test sink is set via `__setLoggerSink`.
 */
export function logLookupEvent(event: RedactedLogEvent): void {
  lastLogCall = event;
  try {
    sink(event);
  } catch {
    // swallow; logging is best-effort
  }
}
