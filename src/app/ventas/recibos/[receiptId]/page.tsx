import { ReceiptDetailView } from "@/components/recibos/receipt-detail-view"
import type { ReceiptFlowContext } from "@/lib/digital-receipts/ui"

export default function DigitalReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiptId: string }>
  searchParams?: Promise<ReceiptFlowContext>
}) {
  return <ResolvedDigitalReceiptDetailPage params={params} searchParams={searchParams} />
}

async function ResolvedDigitalReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiptId: string }>
  searchParams?: Promise<ReceiptFlowContext>
}) {
  const { receiptId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  return <ReceiptDetailView receiptId={receiptId} context={resolvedSearchParams} />
}
