import { z } from "zod";
import { Prisma } from "@prisma/client";

// Preserve exact strings and reject values PostgreSQL would round or overflow.
export const decimal18_4 = z.union([z.number(), z.string()])
  .transform((value) => String(value).trim())
  .refine((value) => {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return false;
    try {
      const decimal = new Prisma.Decimal(value);
      // Decimal silently underflows extreme exponents; nonzero input must not become zero.
      if (decimal.isZero() && /[1-9]/.test(value.split(/[eE]/)[0])) return false;
      return decimal.isFinite() && decimal.decimalPlaces() <= 4 && decimal.abs().lt("100000000000000");
    } catch {
      return false;
    }
  }, "value must fit a finite base-10 Decimal(18,4) without rounding");

export const positiveQuantity = decimal18_4.pipe(z.string().refine(
  (value) => new Prisma.Decimal(value).gt(0), "quantity must be a positive number"
));
