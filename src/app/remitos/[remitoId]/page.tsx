import { RemitoFullView } from "@/components/remitos/RemitoFullView"

export default async function RemitoPage({ params }: { params: Promise<{ remitoId: string }> }) {
  const { remitoId } = await params
  return <RemitoFullView remitoId={remitoId} />
}
