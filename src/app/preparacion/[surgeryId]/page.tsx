import { PreparationOperationalWorkspace } from "@/components/stock/PreparationOperationalWorkspace"

export default async function PreparationPage({ params }: { params: Promise<{ surgeryId: string }> }) {
  const { surgeryId } = await params
  return <PreparationOperationalWorkspace surgeryId={surgeryId} />
}
