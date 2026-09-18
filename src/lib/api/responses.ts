// OSSUM COR — Minimal Web API response helpers.

import { ApiError, internalError } from "./errors";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export function ok<T>(data: T) {
  return jsonResponse({ data }, { status: 200 });
}

export function created<T>(data: T) {
  return jsonResponse({ data }, { status: 201 });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function errorResponse(error: unknown) {
  const apiError = error instanceof ApiError ? error : internalError();

  return jsonResponse(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
      },
    },
    { status: apiError.status }
  );
}
