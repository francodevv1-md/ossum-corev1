import { RemitoScanWorkspace } from "@/components/remitos/RemitoScanWorkspace"

export default async function RemitoScanResultPage({ params }: { params: Promise<{ remitoShortCode: string }> }) {
  const { remitoShortCode } = await params
  return <RemitoScanWorkspace initialLocator={remitoShortCode} />
}
