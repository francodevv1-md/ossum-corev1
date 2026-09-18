import { ReceiptListView } from "@/components/recibos/receipt-list-view"
import type { ReceiptFlowContext } from "@/lib/digital-receipts/ui"

type DigitalReceiptsPageProps = { searchParams?: Promise<ReceiptFlowContext> }

export default function DigitalReceiptsPage({ searchParams }: DigitalReceiptsPageProps) {
  return <ResolvedDigitalReceiptsPage searchParams={searchParams} />
}

async function ResolvedDigitalReceiptsPage({ searchParams }: DigitalReceiptsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  return <ReceiptListView context={resolvedSearchParams} />
}
