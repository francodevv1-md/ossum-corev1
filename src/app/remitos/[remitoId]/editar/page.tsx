import { OperationalRemitoWorkspace } from "@/components/remitos/OperationalRemitoWorkspace"

export default async function EditarRemitoPage({ params }: { params: Promise<{ remitoId: string }> }) {
  const { remitoId } = await params
  return <OperationalRemitoWorkspace remitoId={remitoId} />
}
