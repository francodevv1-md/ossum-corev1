// OSSUM COR — Minimal API query parsing helpers.

import { badRequest } from "./errors";

export function getStringParam(
  searchParams: URLSearchParams,
  name: string
): string | undefined {
  const value = searchParams.get(name);
  return value === null || value.trim().length === 0 ? undefined : value;
}

export function getNumberParam(
  searchParams: URLSearchParams,
  name: string
): number | undefined {
  const value = getStringParam(searchParams, name);
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${name} must be a valid number`);
  }

  return parsed;
}

export function getBooleanParam(
  searchParams: URLSearchParams,
  name: string
): boolean | undefined {
  const value = getStringParam(searchParams, name);
  if (value === undefined) return undefined;

  if (value === "true") return true;
  if (value === "false") return false;

  throw badRequest(`${name} must be true or false`);
}

export function getDateParam(
  searchParams: URLSearchParams,
  name: string
): Date | undefined {
  const value = getStringParam(searchParams, name);
  if (value === undefined) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${name} must be a valid date`);
  }

  return date;
}
