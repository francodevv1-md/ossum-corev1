import prisma from "../../src/lib/prisma"

const API = "https://apis.datos.gob.ar/georef/api/v2.0/direcciones"
const text = (value: string | null | undefined) => value?.trim() || null

async function main() {
  const surgeries = await prisma.surgery.findMany({ where: { archivedAt: null, institutionId: { not: null } }, select: { id: true, visibleNumber: true, institution: { select: { legalName: true, tradeName: true, addresses: { where: { isMain: true }, take: 1 } } } } })
  const addresses = [...new Map(surgeries.flatMap((surgery) => surgery.institution?.addresses ?? []).map((address) => [address.id, address])).values()]
  const rows = [] as Array<Record<string, unknown>>
  for (const address of addresses) {
    const street = text(address.street), number = text(address.number), city = text(address.city), province = text(address.state)
    const legacy = [street, number, city, province].filter(Boolean).join(", ") || "Sin dirección"
    if (!street || !number || !city || !province) { rows.push({ addressId: address.id, legacy, classification: "incompleto", reason: "Falta calle, altura, localidad o provincia" }); continue }
    const url = new URL(API); url.searchParams.set("direccion", `${street} ${number}`); url.searchParams.set("provincia", province); url.searchParams.set("localidad", city); url.searchParams.set("max", "10")
    const response = await fetch(url, { headers: { accept: "application/json" } })
    if (!response.ok) { rows.push({ addressId: address.id, legacy, classification: "sin_resultado", reason: `Georef HTTP ${response.status}` }); continue }
    const body = await response.json() as { direcciones?: Array<any> }
    const candidates = body.direcciones ?? []
    if (!candidates.length) { rows.push({ addressId: address.id, legacy, classification: "sin_resultado" }); continue }
    const exact = candidates.filter((candidate) => String(candidate.nombre ?? "").toLocaleLowerCase() === `${street} ${number}`.toLocaleLowerCase() && candidate.localidad?.nombre === city && candidate.provincia?.nombre === province)
    const selected = exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : null
    rows.push({ addressId: address.id, legacy, classification: exact.length === 1 ? "exacto" : selected ? "candidato_unico" : "ambiguo", candidates: candidates.length, proposal: selected ? { normalized: selected.nombre ?? null, province: selected.provincia ?? null, locality: selected.localidad ?? null, coordinates: selected.ubicacion ?? null, coordinateType: "address", crs: "EPSG:4326", source: "Georef Argentina" } : null })
  }
  const coverage = Object.fromEntries(["exacto", "candidato_unico", "ambiguo", "incompleto", "conflicto", "sin_resultado"].map((status) => [status, rows.filter((row) => row.classification === status).length]))
  const byAddressId = new Map(rows.map((row) => [row.addressId, row]))
  const surgeryAddresses = surgeries.map((surgery) => { const address = surgery.institution?.addresses[0]; return { surgeryId: surgery.id, reference: surgery.visibleNumber, institution: surgery.institution?.legalName ?? surgery.institution?.tradeName ?? null, addressId: address?.id ?? null, legacy: address ? [address.street, address.number, address.city, address.state].filter(Boolean).join(", ") : null, classification: address ? byAddressId.get(address.id)?.classification ?? "sin_resultado" : "sin_resultado" } })
  console.log(JSON.stringify({ mode: "read_only", source: "Georef Argentina", surgeries: surgeries.length, addresses: addresses.length, coverage, surgeryAddresses, problemCases: rows.filter((row) => row.classification !== "exacto"), rows }, null, 2))
}

main().finally(() => prisma.$disconnect())
