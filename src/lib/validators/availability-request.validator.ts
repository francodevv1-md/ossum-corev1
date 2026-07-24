import { z } from "zod";

import { badRequest } from "../api/errors";

const AVAILABILITY_ID_MAX_LENGTH = 200;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7E]{16,128}$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const availabilityIdSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .max(AVAILABILITY_ID_MAX_LENGTH, "ID is too long");

export const availabilityIdempotencyKeySchema = z
  .string()
  .regex(
    IDEMPOTENCY_KEY_PATTERN,
    "Idempotency-Key must contain 16 to 128 visible ASCII characters"
  );

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day >= 1 && day <= daysInMonth[month - 1];
}

export const availabilityDateOnlySchema = z
  .string()
  .regex(DATE_ONLY_PATTERN, "Date must use YYYY-MM-DD")
  .refine(isValidDateOnly, "Date must be a valid Gregorian calendar date");

const availabilityReasonSchema = z
  .string()
  .trim()
  .min(3, "Reason must contain at least 3 characters")
  .max(500, "Reason must contain at most 500 characters");

export const createAvailabilityRequestBodySchema = z.strictObject({});

export const completeAvailabilityRequestBodySchema = z.strictObject({
  date: availabilityDateOnlySchema,
});

export const correctMaterialAvailabilityBodySchema = z.strictObject({
  date: availabilityDateOnlySchema,
  expectedCurrentDate: availabilityDateOnlySchema,
  reason: availabilityReasonSchema,
});

export const materialAvailabilityReadQuerySchema = z.strictObject({});

export const setAvailabilityPivotBodySchema = z.strictObject({
  userId: availabilityIdSchema,
  expectedVersion: z.int().positive("expectedVersion must be a positive safe integer"),
  reason: availabilityReasonSchema,
});

export type CreateAvailabilityRequestBody = z.infer<
  typeof createAvailabilityRequestBodySchema
>;
export type CompleteAvailabilityRequestBody = z.infer<
  typeof completeAvailabilityRequestBodySchema
>;
export type CorrectMaterialAvailabilityBody = z.infer<
  typeof correctMaterialAvailabilityBodySchema
>;
export type MaterialAvailabilityReadQuery = z.infer<
  typeof materialAvailabilityReadQuerySchema
>;
export type SetAvailabilityPivotBody = z.infer<
  typeof setAvailabilityPivotBodySchema
>;

function parseAvailabilityInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  code: string
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest(
      result.error.issues[0]?.message ?? "Invalid availability request input",
      code
    );
  }

  return result.data;
}

export function validateAvailabilityId(value: unknown): string {
  return parseAvailabilityInput(
    availabilityIdSchema,
    value,
    "availability_invalid_id"
  );
}

export function validateAvailabilityIdempotencyKey(value: unknown): string {
  return parseAvailabilityInput(
    availabilityIdempotencyKeySchema,
    value,
    "availability_invalid_idempotency_key"
  );
}

export function validateCreateAvailabilityRequestBody(
  input: unknown
): CreateAvailabilityRequestBody {
  return parseAvailabilityInput(
    createAvailabilityRequestBodySchema,
    input,
    "availability_invalid_create_body"
  );
}

export function validateCompleteAvailabilityRequestBody(
  input: unknown
): CompleteAvailabilityRequestBody {
  return parseAvailabilityInput(
    completeAvailabilityRequestBodySchema,
    input,
    "availability_invalid_completion_body"
  );
}

export function validateCorrectMaterialAvailabilityBody(
  input: unknown
): CorrectMaterialAvailabilityBody {
  return parseAvailabilityInput(
    correctMaterialAvailabilityBodySchema,
    input,
    "availability_invalid_correction_body"
  );
}

export function validateMaterialAvailabilityReadQuery(
  input: unknown
): MaterialAvailabilityReadQuery {
  return parseAvailabilityInput(
    materialAvailabilityReadQuerySchema,
    input,
    "availability_invalid_read_query"
  );
}

export function validateSetAvailabilityPivotBody(
  input: unknown
): SetAvailabilityPivotBody {
  return parseAvailabilityInput(
    setAvailabilityPivotBodySchema,
    input,
    "availability_invalid_pivot_body"
  );
}
