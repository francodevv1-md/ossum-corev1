export type AvailabilityRequestView = {
  id: string;
  companyId: string;
  surgery: { id: string; visibleNumber: string | null };
  status: "OPEN" | "COMPLETED";
  requestedAt: string;
  requester: { id: string; displayName: string };
  creatorResolution: "identified_eligible" | "not_identified_or_eligible";
  recipientReasonsForActor: Array<"creator" | "pivot">;
  canComplete: boolean;
  submittedDate: string | null;
  completedAt: string | null;
  completedBy: { id: string; displayName: string } | null;
};

export type AvailabilityRequestClientErrorKind =
  | "validation"
  | "authentication"
  | "blocked"
  | "not_found"
  | "conflict"
  | "network"
  | "unexpected";

export class AvailabilityRequestClientError extends Error {
  constructor(
    readonly kind: AvailabilityRequestClientErrorKind,
    readonly status: number | null,
    readonly code: string
  ) {
    super("Availability request operation failed");
    this.name = "AvailabilityRequestClientError";
  }
}

export type AvailabilityRequestClientOptions = {
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
};

type ApiEnvelope = {
  data?: AvailabilityRequestView;
  error?: { code?: unknown };
};

const ERROR_KIND_BY_STATUS: Record<number, AvailabilityRequestClientErrorKind> = {
  400: "validation",
  401: "authentication",
  403: "blocked",
  404: "not_found",
  409: "conflict",
};

function requestPath(companyId: string, requestId: string): string {
  return `/api/companies/${encodeURIComponent(companyId)}/availability-requests/${encodeURIComponent(requestId)}`;
}

async function readEnvelope(response: Response): Promise<ApiEnvelope | null> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" ? (body as ApiEnvelope) : null;
  } catch {
    return null;
  }
}

async function execute(
  url: string,
  init: RequestInit,
  fetchImpl: typeof globalThis.fetch
): Promise<AvailabilityRequestView> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new AvailabilityRequestClientError("network", null, "availability_network_error");
  }

  const envelope = await readEnvelope(response);
  if (!response.ok) {
    const kind = ERROR_KIND_BY_STATUS[response.status] ?? "unexpected";
    const rawCode = envelope?.error?.code;
    const code = typeof rawCode === "string" && rawCode.length <= 100
      ? rawCode
      : `availability_${kind}`;
    throw new AvailabilityRequestClientError(kind, response.status, code);
  }
  if (!envelope?.data || typeof envelope.data !== "object") {
    throw new AvailabilityRequestClientError("unexpected", response.status, "availability_invalid_response");
  }
  return envelope.data;
}

export function getAvailabilityRequest(
  companyId: string,
  requestId: string,
  options: AvailabilityRequestClientOptions = {}
): Promise<AvailabilityRequestView> {
  return execute(
    requestPath(companyId, requestId),
    { method: "GET", signal: options.signal },
    options.fetch ?? globalThis.fetch
  );
}

export function completeAvailabilityRequest(
  companyId: string,
  requestId: string,
  date: string,
  idempotencyKey: string,
  options: AvailabilityRequestClientOptions = {}
): Promise<AvailabilityRequestView> {
  return execute(
    `${requestPath(companyId, requestId)}/complete`,
    {
      method: "POST",
      signal: options.signal,
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ date }),
    },
    options.fetch ?? globalThis.fetch
  );
}
