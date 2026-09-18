// OSSUM COR — Minimal reusable API errors.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message = "Bad request", code = "bad_request") {
  return new ApiError(400, code, message);
}

export function unauthorized(message = "Unauthorized", code = "unauthorized") {
  return new ApiError(401, code, message);
}

export function forbidden(message = "Forbidden", code = "forbidden") {
  return new ApiError(403, code, message);
}

export function notFound(message = "Not found", code = "not_found") {
  return new ApiError(404, code, message);
}

export function conflict(message = "Conflict", code = "conflict") {
  return new ApiError(409, code, message);
}

export function internalError(message = "Internal server error", code = "internal_error") {
  return new ApiError(500, code, message);
}
