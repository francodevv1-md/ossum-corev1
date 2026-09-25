import { auditGeography, geographyFromAddress, markerEligibility } from "@/lib/services/logistics-geography"
import { getLogisticsVehicleProjection } from "@/lib/services/logistics-vehicle-gps.server"

type Db = any

export async function getLogisticsMapProjection(db: Db, companyId: string, limit: number) {
  const surgeries = await db.surgery.findMany({
    where: { companyId, archivedAt: null }, orderBy: [{ surgeryDate: "asc" }, { scheduledDate: "asc" }, { id: "asc" }], take: limit,
    select: { id: true, visibleNumber: true, institution: { select: { id: true, legalName: true, tradeName: true, addresses: { where: { isMain: true }, take: 1 } } } },
  })
  const rows = surgeries.map((surgery) => {
    const address = surgery.institution?.addresses[0]
    const geo = geographyFromAddress(address)
    return { surgery: { id: surgery.id, reference: surgery.visibleNumber }, institution: surgery.institution ? { id: surgery.institution.id, name: surgery.institution.legalName ?? surgery.institution.tradeName ?? "Institución sin nombre" } : null, geo, eligibility: markerEligibility(geo) }
  })
  const audit = auditGeography(surgeries.map((surgery) => surgery.institution?.addresses[0]))
  const vehicleProjection = await getLogisticsVehicleProjection(db, companyId)
  return { generatedAt: new Date().toISOString(), source: "persisted_contact_address" as const, markers: rows.filter((row) => row.eligibility.eligible).map(({ eligibility: _, ...row }) => row), excluded: audit.total - audit.eligible, audit, ...vehicleProjection }
}
