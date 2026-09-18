import { ReceiptCreateFlow } from "@/components/recibos/receipt-create-flow"
import type { ReceiptFlowContext } from "@/lib/digital-receipts/ui"

type NewDigitalReceiptPageProps = {
  searchParams?: Promise<ReceiptFlowContext>
}

export default function NewDigitalReceiptPage({ searchParams }: NewDigitalReceiptPageProps) {
  return <ResolvedNewDigitalReceiptPage searchParams={searchParams} />
}

async function ResolvedNewDigitalReceiptPage({ searchParams }: NewDigitalReceiptPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  return <ReceiptCreateFlow context={resolvedSearchParams} />
}
