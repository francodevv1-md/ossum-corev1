import { ZodError } from "zod";
import { ApiError, badRequest, internalError } from "./errors";

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
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Validation error";
    apiError = badRequest(message, "validation_failed");
  } else {
    apiError = internalError();
  }

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
