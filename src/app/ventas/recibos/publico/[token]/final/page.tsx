import { notFound } from "next/navigation"

import { ReceiptFinalState } from "@/components/recibos/receipt-public-signing"
import {
  isDigitalReceiptDomainError,
  publicDigitalReceiptService,
  type ReceiptFlowContext,
} from "@/lib/digital-receipts"

export default async function DigitalReceiptPublicFinalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams?: Promise<ReceiptFlowContext>
}) {
  try {
    const { token } = await params
    const receipt = await publicDigitalReceiptService.getPublicDigitalReceiptByToken(token, { markOpened: false })
    const resolvedSearchParams = searchParams ? await searchParams : undefined
    return <ReceiptFinalState receipt={receipt} context={resolvedSearchParams} />
  } catch (error) {
    if (isDigitalReceiptDomainError(error)) {
      notFound()
    }

    throw error
  }
}
