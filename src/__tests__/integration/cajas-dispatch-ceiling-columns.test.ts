import { expect, it } from "vitest"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

const replacements = [
  ['"control"."articleId"', '"control"."article_id"'],
  ['"control"."stockPositionId"', '"control"."stock_position_id"'],
  ['"control"."stockUnit"', '"control"."stock_unit"'],
  ['"control"."scaleSnapshot"', '"control"."scale_snapshot"'],
  ['"source"."articleId"', '"source"."article_id"'],
  ['"source"."stockPositionId"', '"source"."stock_position_id"'],
  ['"source"."stockUnit"', '"source"."stock_unit"'],
  ['"source"."scaleSnapshot"', '"source"."scale_snapshot"'],
] as const

it("keeps all eight Cajas dispatch ceiling column replacements complete", async () => {
  const { default: prisma } = await import("@/lib/prisma")
  const [{ definition }] = await prisma.$queryRawUnsafe<Array<{ definition: string }>>(
    "SELECT pg_get_functiondef('public.fn_cajas_dispatch_ceiling()'::regprocedure) AS definition"
  )

  for (const [oldReference, newReference] of replacements) {
    expect(definition.split(oldReference)).toHaveLength(1)
    expect(definition.split(newReference)).toHaveLength(2)
  }
})
