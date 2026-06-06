/**
 * useCirugiasFilters.ts
 * Hook para manejar toda la lógica de filtros del módulo Cirugías.
 * Extraído del componente monolítico original.
 * CHATZAI-025: Added search chips support with AND/OR logic.
 * CHATZAI-025-4C: Enhanced date filters + new advanced filter fields.
 */

import { useState, useMemo, useCallback } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Surgery } from "@/types"
import type { FilterChip, SearchChip, DateFilter } from "@/lib/cirugias.types"
import { FACTURACION_OPTIONS } from "@/lib/cirugias.constants"
import { getFacturacionStatus } from "@/lib/cirugias.utils"
import { normalizeAccents } from "@/lib/utils"

export function useCirugiasFilters() {
  const store = useOrtoTrackStore()

  // ── Filter state ──
  const [search, setSearch] = useState("")
  const [stateFilters, setStateFilters] = useState<string[]>([])
  const [classFilters, setClassFilters] = useState<string[]>([])
  const [clientFilters, setClientFilters] = useState<string[]>([])
  const [institutionFilters, setInstitutionFilters] = useState<string[]>([])
  const [prepFilters, setPrepFilters] = useState<string[]>([])
  const [docFilters, setDocFilters] = useState<string[]>([])
  const [factFilters, setFactFilters] = useState<string[]>([])
  const [coordinadorFilters, setCoordinadorFilters] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [kpiFilter, setKpiFilter] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ── New filters ──
  const [urgenteFilter, setUrgenteFilter] = useState<boolean | null>(null)
  const [provinciaFilters, setProvinciaFilters] = useState<string[]>([])
  const [vendedorFilters, setVendedorFilters] = useState<string[]>([])

  // ── Search-in extended fields ──
  const [searchInMedico, setSearchInMedico] = useState(false)
  const [searchInInstitucion, setSearchInInstitucion] = useState(false)
  const [searchInCliente, setSearchInCliente] = useState(false)
  const [searchInPR, setSearchInPR] = useState(false)
  const [searchInExpediente, setSearchInExpediente] = useState(false)
  const [searchInNR, setSearchInNR] = useState(false)
  const [searchInFV, setSearchInFV] = useState(false)

  // ── CHATZAI-025: Smart search chips ──
  const [searchChips, setSearchChips] = useState<SearchChip[]>([])

  // ── CHATZAI-025-4C: Enhanced date filters ──
  const [dateFilters, setDateFilters] = useState<DateFilter[]>([])

  // ── CHATZAI-025-4C: New advanced filter fields ──
  const [expedienteNumFilter, setExpedienteNumFilter] = useState("")
  const [nrNumFilter, setNrNumFilter] = useState("")
  const [fvNumFilter, setFvNumFilter] = useState("")
  const [numeroAutorizacionFilter, setNumeroAutorizacionFilter] = useState("")
  const [instrumentadorFilter, setInstrumentadorFilter] = useState("")
  const [localidadFilter, setLocalidadFilter] = useState("")
  const [fechaAutorizacionFrom, setFechaAutorizacionFrom] = useState("")
  const [fechaAutorizacionTo, setFechaAutorizacionTo] = useState("")
  const [fechaFacturaFrom, setFechaFacturaFrom] = useState("")
  const [fechaFacturaTo, setFechaFacturaTo] = useState("")
  const [sinFechaCx, setSinFechaCx] = useState(false)
  const [conPrFilter, setConPrFilter] = useState<"con" | "sin" | null>(null)
  const [conConsumoFilter, setConConsumoFilter] = useState<"con" | "sin" | null>(null)
  const [conFacturaFilter, setConFacturaFilter] = useState<"con" | "sin" | null>(null)

  // ── Computed: facturacion status helper ──
  const facturacionStatus = useCallback((s: Surgery): string => {
    const resumen = store.getResumenCobranzaBySurgeryId(s.id)
    return getFacturacionStatus(s, store.getDocStatus, resumen)
  }, [store])

  // ── CHATZAI-025: Match surgery against a single search chip ──
  const matchesSearchChip = useCallback((surgery: Surgery, chip: SearchChip): boolean => {
    switch (chip.field) {
      case "medico": {
        // Match by contacto ID (via surgeonContactId) or by surgeon name
        if (surgery.surgeonContactId === chip.value) return true
        const contacto = store.getContactoById(chip.value)
        if (contacto) {
          const nombre = contacto.nombreFantasia || contacto.nombre
          const q = normalizeAccents(nombre)
          if (normalizeAccents(surgery.surgeon || "").includes(q)) return true
        }
        return false
      }
      case "paciente": {
        if (surgery.patientContactId === chip.value) return true
        const contacto = store.getContactoById(chip.value)
        if (contacto) {
          const nombre = contacto.nombreFantasia || contacto.nombre
          const q = normalizeAccents(nombre)
          if (normalizeAccents(surgery.patient || "").includes(q)) return true
        }
        return false
      }
      case "cliente": {
        if (surgery.clientContactId === chip.value) return true
        const contacto = store.getContactoById(chip.value)
        if (contacto) {
          const nombre = contacto.nombreFantasia || contacto.nombre
          const q = normalizeAccents(nombre)
          if (normalizeAccents(surgery.client || "").includes(q)) return true
        }
        return false
      }
      case "institucion": {
        if (surgery.institutionContactId === chip.value) return true
        const contacto = store.getContactoById(chip.value)
        if (contacto) {
          const nombre = contacto.nombreFantasia || contacto.nombre
          const q = normalizeAccents(nombre)
          if (normalizeAccents(surgery.institution || "").includes(q)) return true
        }
        return false
      }
      case "general": {
        // General search: search across all text fields (accent-insensitive)
        const q = normalizeAccents(chip.value)
        return (
          normalizeAccents(surgery.patient || "").includes(q) ||
          normalizeAccents(surgery.surgeon || "").includes(q) ||
          normalizeAccents(surgery.institution || "").includes(q) ||
          normalizeAccents(surgery.client || "").includes(q) ||
          normalizeAccents(surgery.prNumber || "").includes(q) ||
          normalizeAccents(surgery.expedienteNumber || "").includes(q) ||
          normalizeAccents(surgery.id).includes(q)
        )
      }
      default:
        return false
    }
  }, [store])

  // ── CHATZAI-025: Apply search chips filtering (AND across fields, OR within same field) ──
  const applySearchChips = useCallback((data: Surgery[], chips: SearchChip[]): Surgery[] => {
    if (chips.length === 0) return data

    // Group chips by field
    const chipsByField = new Map<string, SearchChip[]>()
    for (const chip of chips) {
      const existing = chipsByField.get(chip.field) || []
      existing.push(chip)
      chipsByField.set(chip.field, existing)
    }

    return data.filter((surgery) => {
      // AND logic: all field groups must match
      for (const [_field, fieldChips] of chipsByField) {
        // OR logic within same field: any chip in this group must match
        const anyMatch = fieldChips.some((chip) => matchesSearchChip(surgery, chip))
        if (!anyMatch) return false
      }
      return true
    })
  }, [matchesSearchChip])

  // ── CHATZAI-025-4C: Get the date value for a given date filter type from a surgery ──
  const getSurgeryDateForType = useCallback((surgery: Surgery, type: DateFilter["type"]): string => {
    switch (type) {
      case "fecha_cirugia":
        return surgery.date
      case "fecha_probable":
        return surgery.probableDate || ""
      case "fecha_material":
        return surgery.fechaEnvioMaterial || ""
      case "fecha_envio": {
        // Fecha de envío comes from LogisticsDetail
        const logistics = store.getLogisticsBySurgeryId?.(surgery.id)
        return logistics?.fechaEnvioMateriales || ""
      }
      default:
        return ""
    }
  }, [store])

  // ── Filtered & sorted data (sort handled separately) ──
  const filterData = useCallback((data: Surgery[]): Surgery[] => {
    let filtered = data

    // CHATZAI-025: Search chips take precedence over simple search
    // If search chips exist, use them for filtering
    if (searchChips.length > 0) {
      filtered = applySearchChips(filtered, searchChips)
    } else if (search) {
      // Legacy simple search — always searches patient; extended fields via "Buscar también en" (accent-insensitive)
      const q = normalizeAccents(search)
      filtered = filtered.filter((s) => {
        const prId = store.getPresupuestosBySurgeryId(s.id)[0]?.id || ""
        const nrId = store.getRemitosBySurgeryId(s.id)[0]?.id || ""
        const fvNum = s.facturaNumber || store.getComprobantesBySurgeryId(s.id).find(c => c.type === "FV")?.number || ""

        let match = normalizeAccents(s.patient || "").includes(q)
        if (!match && searchInMedico) match = normalizeAccents(s.surgeon || "").includes(q)
        if (!match && searchInInstitucion) match = normalizeAccents(s.institution || "").includes(q)
        if (!match && searchInCliente) match = normalizeAccents(s.client || "").includes(q)
        if (!match && searchInPR) match = normalizeAccents(s.prNumber || "").includes(q) || normalizeAccents(prId).includes(q)
        if (!match && searchInExpediente) match = normalizeAccents(s.expedienteNumber || "").includes(q)
        if (!match && searchInNR) match = normalizeAccents(nrId).includes(q)
        if (!match && searchInFV) match = normalizeAccents(fvNum).includes(q)
        return match
      })
    }

    // KPI filter
    if (kpiFilter) {
      if (kpiFilter === "docIncompleta") {
        filtered = filtered.filter((s) => store.getDocStatus(s.id) === "Incompleta")
      } else if (kpiFilter === "pendFacturar") {
        filtered = filtered.filter((s) => !s.facturado && s.state === "Realizada")
      } else {
        filtered = filtered.filter((s) => s.state === kpiFilter)
      }
    }

    // Dropdown filters
    if (stateFilters.length > 0) filtered = filtered.filter((s) => stateFilters.includes(s.state))
    if (classFilters.length > 0) filtered = filtered.filter((s) => classFilters.includes(s.classification))
    if (clientFilters.length > 0) filtered = filtered.filter((s) => clientFilters.includes(s.client))
    if (institutionFilters.length > 0) filtered = filtered.filter((s) => institutionFilters.includes(s.institution))
    if (prepFilters.length > 0) filtered = filtered.filter((s) => prepFilters.includes(s.preparationState))
    if (docFilters.length > 0) {
      filtered = filtered.filter((s) => {
        const dc = store.getDocumentChecklistBySurgeryId(s.id)
        return dc ? docFilters.includes(dc.status) : docFilters.includes("Incompleta")
      })
    }
    if (factFilters.length > 0) {
      filtered = filtered.filter((s) => {
        const fStatus = facturacionStatus(s)
        return factFilters.some(f => {
          if (f === "sin_facturar") return fStatus === "Sin facturar"
          if (f === "autorizada_fv") return fStatus === "Autorizada para facturar"
          if (f === "facturada") return fStatus === "Facturada"
          if (f === "pendiente_cobro") return fStatus === "Pendiente de cobro"
          if (f === "vencida") return fStatus === "Vencida"
          return false
        })
      })
    }
    if (coordinadorFilters.length > 0) {
      filtered = filtered.filter((s) => coordinadorFilters.includes(s.coordinadorCx || "Sin asignar"))
    }
    if (urgenteFilter !== null) {
      filtered = filtered.filter((s) => s.urgente === urgenteFilter)
    }
    if (provinciaFilters.length > 0) {
      filtered = filtered.filter((s) => provinciaFilters.includes(s.provincia || ""))
    }
    if (vendedorFilters.length > 0) {
      filtered = filtered.filter((s) => vendedorFilters.includes(s.vendedor || "Sin asignar"))
    }

    // Legacy simple date filter (kept for backward compat)
    // CHATZAI-025A-fix: Skip legacy dateFrom/dateTo if enhanced dateFilters are active
    // to avoid double-filtering on the same date field
    if (dateFilters.length === 0) {
      if (dateFrom) filtered = filtered.filter((s) => s.date >= dateFrom)
      if (dateTo) filtered = filtered.filter((s) => s.date <= dateTo)
    }

    // ── CHATZAI-025-4C: Enhanced date filters ──
    // Each date filter is AND logic; one range per type in V1
    if (dateFilters.length > 0) {
      filtered = filtered.filter((s) => {
        return dateFilters.every((df) => {
          const surgeryDate = getSurgeryDateForType(s, df.type)
          // If the surgery has no value for this date type, skip (doesn't match range filter)
          if (!surgeryDate) return false
          if (df.from && surgeryDate < df.from) return false
          if (df.to && surgeryDate > df.to) return false
          return true
        })
      })
    }

    // ── CHATZAI-025-4C: New advanced filter fields ──
    if (expedienteNumFilter) {
      const q = expedienteNumFilter.toLowerCase()
      filtered = filtered.filter((s) => (s.expedienteNumber || "").toLowerCase().includes(q))
    }
    if (nrNumFilter) {
      const q = nrNumFilter.toLowerCase()
      filtered = filtered.filter((s) => {
        const nrId = store.getRemitosBySurgeryId(s.id)[0]?.id || ""
        return nrId.toLowerCase().includes(q)
      })
    }
    if (fvNumFilter) {
      const q = fvNumFilter.toLowerCase()
      filtered = filtered.filter((s) => {
        const fvNum = s.facturaNumber || store.getComprobantesBySurgeryId(s.id).find(c => c.type === "FV")?.number || ""
        return fvNum.toLowerCase().includes(q)
      })
    }
    if (numeroAutorizacionFilter) {
      const q = numeroAutorizacionFilter.toLowerCase()
      filtered = filtered.filter((s) => {
        // Match against autorizacion number stored in referenciasAdministrativas
        const authMatch = s.referenciasAdministrativas?.some(r =>
          r.tipo === "Autorización" && r.valor.toLowerCase().includes(q)
        )
        return !!authMatch
      })
    }
    if (instrumentadorFilter) {
      const q = instrumentadorFilter.toLowerCase()
      filtered = filtered.filter((s) => (s.instrumentador || "").toLowerCase().includes(q))
    }
    if (localidadFilter) {
      const q = localidadFilter.toLowerCase()
      filtered = filtered.filter((s) => (s.localidad || "").toLowerCase().includes(q))
    }
    if (fechaAutorizacionFrom) {
      filtered = filtered.filter((s) => s.fechaAutorizacion && s.fechaAutorizacion >= fechaAutorizacionFrom)
    }
    if (fechaAutorizacionTo) {
      filtered = filtered.filter((s) => s.fechaAutorizacion && s.fechaAutorizacion <= fechaAutorizacionTo)
    }
    if (fechaFacturaFrom) {
      filtered = filtered.filter((s) => s.fechaFactura && s.fechaFactura >= fechaFacturaFrom)
    }
    if (fechaFacturaTo) {
      filtered = filtered.filter((s) => s.fechaFactura && s.fechaFactura <= fechaFacturaTo)
    }
    if (sinFechaCx) {
      filtered = filtered.filter((s) => !s.date || s.date === "")
    }
    if (conPrFilter === "con") {
      filtered = filtered.filter((s) => !!s.prNumber || store.getPresupuestosBySurgeryId(s.id).length > 0)
    } else if (conPrFilter === "sin") {
      filtered = filtered.filter((s) => !s.prNumber && store.getPresupuestosBySurgeryId(s.id).length === 0)
    }
    if (conConsumoFilter === "con") {
      filtered = filtered.filter((s) => !!store.getConsumoBySurgeryId(s.id))
    } else if (conConsumoFilter === "sin") {
      filtered = filtered.filter((s) => !store.getConsumoBySurgeryId(s.id))
    }
    if (conFacturaFilter === "con") {
      filtered = filtered.filter((s) => s.facturado || !!store.getComprobantesBySurgeryId(s.id).find(c => c.type === "FV"))
    } else if (conFacturaFilter === "sin") {
      filtered = filtered.filter((s) => !s.facturado && !store.getComprobantesBySurgeryId(s.id).find(c => c.type === "FV"))
    }

    return filtered
  }, [search, searchChips, kpiFilter, stateFilters, classFilters, clientFilters, institutionFilters, prepFilters, docFilters, factFilters, coordinadorFilters, urgenteFilter, provinciaFilters, vendedorFilters, dateFrom, dateTo, dateFilters, expedienteNumFilter, nrNumFilter, fvNumFilter, numeroAutorizacionFilter, instrumentadorFilter, localidadFilter, fechaAutorizacionFrom, fechaAutorizacionTo, fechaFacturaFrom, fechaFacturaTo, sinFechaCx, conPrFilter, conConsumoFilter, conFacturaFilter, facturacionStatus, store, searchInMedico, searchInInstitucion, searchInCliente, searchInPR, searchInExpediente, searchInNR, searchInFV, applySearchChips, getSurgeryDateForType])

  // ── Active filter chips ──
  const activeFilterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = []
    if (search) chips.push({ key: "search", label: `Paciente: "${search}"`, onClear: () => setSearch("") })
    if (kpiFilter) chips.push({ key: "kpi", label: `KPI: ${kpiFilter === "docIncompleta" ? "Doc. incompleta" : kpiFilter === "pendFacturar" ? "Pend. facturar" : kpiFilter}`, onClear: () => setKpiFilter(null) })
    stateFilters.forEach(f => chips.push({ key: `state-${f}`, label: `Estado: ${f}`, onClear: () => setStateFilters(prev => prev.filter(x => x !== f)) }))
    prepFilters.forEach(f => chips.push({ key: `prep-${f}`, label: `Prep: ${f}`, onClear: () => setPrepFilters(prev => prev.filter(x => x !== f)) }))
    docFilters.forEach(f => chips.push({ key: `doc-${f}`, label: `Doc: ${f}`, onClear: () => setDocFilters(prev => prev.filter(x => x !== f)) }))
    factFilters.forEach(f => {
      const label = FACTURACION_OPTIONS.find(o => o.value === f)?.label || f
      chips.push({ key: `fact-${f}`, label: `Fact: ${label}`, onClear: () => setFactFilters(prev => prev.filter(x => x !== f)) })
    })
    clientFilters.forEach(f => chips.push({ key: `client-${f}`, label: `Cliente: ${f}`, onClear: () => setClientFilters(prev => prev.filter(x => x !== f)) }))
    classFilters.forEach(f => chips.push({ key: `class-${f}`, label: `Clasif: ${f}`, onClear: () => setClassFilters(prev => prev.filter(x => x !== f)) }))
    institutionFilters.forEach(f => chips.push({ key: `inst-${f}`, label: `Inst: ${f}`, onClear: () => setInstitutionFilters(prev => prev.filter(x => x !== f)) }))
    coordinadorFilters.forEach(f => chips.push({ key: `coord-${f}`, label: `Coordinador: ${f}`, onClear: () => setCoordinadorFilters(prev => prev.filter(x => x !== f)) }))
    if (urgenteFilter !== null) chips.push({ key: "urgente", label: urgenteFilter ? "Urgente" : "No urgente", onClear: () => setUrgenteFilter(null) })
    provinciaFilters.forEach(f => chips.push({ key: `prov-${f}`, label: `Prov: ${f}`, onClear: () => setProvinciaFilters(prev => prev.filter(x => x !== f)) }))
    vendedorFilters.forEach(f => chips.push({ key: `vend-${f}`, label: `Vend: ${f}`, onClear: () => setVendedorFilters(prev => prev.filter(x => x !== f)) }))
    if (dateFrom) chips.push({ key: "from", label: `Desde: ${dateFrom}`, onClear: () => setDateFrom("") })
    if (dateTo) chips.push({ key: "to", label: `Hasta: ${dateTo}`, onClear: () => setDateTo("") })

    // CHATZAI-025-4C: Date filter chips
    dateFilters.forEach(df => {
      chips.push({ key: `datefilter-${df.id}`, label: df.label, onClear: () => setDateFilters(prev => prev.filter(f => f.id !== df.id)) })
    })

    // CHATZAI-025-4C: New advanced filter chips
    if (expedienteNumFilter) chips.push({ key: "expNum", label: `Exp: ${expedienteNumFilter}`, onClear: () => setExpedienteNumFilter("") })
    if (nrNumFilter) chips.push({ key: "nrNum", label: `NR: ${nrNumFilter}`, onClear: () => setNrNumFilter("") })
    if (fvNumFilter) chips.push({ key: "fvNum", label: `FV: ${fvNumFilter}`, onClear: () => setFvNumFilter("") })
    if (numeroAutorizacionFilter) chips.push({ key: "numAuth", label: `Aut.: ${numeroAutorizacionFilter}`, onClear: () => setNumeroAutorizacionFilter("") })
    if (instrumentadorFilter) chips.push({ key: "instr", label: `Instr.: ${instrumentadorFilter}`, onClear: () => setInstrumentadorFilter("") })
    if (localidadFilter) chips.push({ key: "localidad", label: `Localidad: ${localidadFilter}`, onClear: () => setLocalidadFilter("") })
    if (fechaAutorizacionFrom || fechaAutorizacionTo) chips.push({ key: "fecAuth", label: `F. Autoriz.`, onClear: () => { setFechaAutorizacionFrom(""); setFechaAutorizacionTo("") } })
    if (fechaFacturaFrom || fechaFacturaTo) chips.push({ key: "fecFact", label: `F. Factura`, onClear: () => { setFechaFacturaFrom(""); setFechaFacturaTo("") } })
    if (sinFechaCx) chips.push({ key: "sinFecCx", label: "Sin fecha CX", onClear: () => setSinFechaCx(false) })
    if (conPrFilter === "con") chips.push({ key: "conPr", label: "Con PR", onClear: () => setConPrFilter(null) })
    if (conPrFilter === "sin") chips.push({ key: "sinPr", label: "Sin PR", onClear: () => setConPrFilter(null) })
    if (conConsumoFilter === "con") chips.push({ key: "conConsumo", label: "Con consumo", onClear: () => setConConsumoFilter(null) })
    if (conConsumoFilter === "sin") chips.push({ key: "sinConsumo", label: "Sin consumo", onClear: () => setConConsumoFilter(null) })
    if (conFacturaFilter === "con") chips.push({ key: "conFactura", label: "Con factura", onClear: () => setConFacturaFilter(null) })
    if (conFacturaFilter === "sin") chips.push({ key: "sinFactura", label: "Sin factura", onClear: () => setConFacturaFilter(null) })

    return chips
  }, [search, kpiFilter, stateFilters, prepFilters, docFilters, factFilters, clientFilters, classFilters, institutionFilters, coordinadorFilters, urgenteFilter, provinciaFilters, vendedorFilters, dateFrom, dateTo, dateFilters, expedienteNumFilter, nrNumFilter, fvNumFilter, numeroAutorizacionFilter, instrumentadorFilter, localidadFilter, fechaAutorizacionFrom, fechaAutorizacionTo, fechaFacturaFrom, fechaFacturaTo, sinFechaCx, conPrFilter, conConsumoFilter, conFacturaFilter])

  // ── Has active filters ──
  const hasActiveFilters = !!(
    search ||
    searchChips.length > 0 ||
    stateFilters.length > 0 ||
    classFilters.length > 0 ||
    clientFilters.length > 0 ||
    institutionFilters.length > 0 ||
    prepFilters.length > 0 ||
    docFilters.length > 0 ||
    factFilters.length > 0 ||
    coordinadorFilters.length > 0 ||
    urgenteFilter !== null ||
    provinciaFilters.length > 0 ||
    vendedorFilters.length > 0 ||
    dateFrom ||
    dateTo ||
    dateFilters.length > 0 ||
    kpiFilter ||
    expedienteNumFilter ||
    nrNumFilter ||
    fvNumFilter ||
    numeroAutorizacionFilter ||
    instrumentadorFilter ||
    localidadFilter ||
    fechaAutorizacionFrom ||
    fechaAutorizacionTo ||
    fechaFacturaFrom ||
    fechaFacturaTo ||
    sinFechaCx ||
    conPrFilter !== null ||
    conConsumoFilter !== null ||
    conFacturaFilter !== null
  )

  const hasExtendedSearch = !!(searchInMedico || searchInInstitucion || searchInCliente || searchInPR || searchInExpediente || searchInNR || searchInFV)

  // ── Total active filter count (for counter display) ──
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchChips.length > 0) count += searchChips.length
    if (search) count += 1
    if (kpiFilter) count += 1
    if (stateFilters.length > 0) count += 1
    if (prepFilters.length > 0) count += 1
    if (docFilters.length > 0) count += 1
    if (factFilters.length > 0) count += 1
    if (clientFilters.length > 0) count += 1
    if (classFilters.length > 0) count += 1
    if (institutionFilters.length > 0) count += 1
    if (coordinadorFilters.length > 0) count += 1
    if (urgenteFilter !== null) count += 1
    if (provinciaFilters.length > 0) count += 1
    if (vendedorFilters.length > 0) count += 1
    if (dateFrom || dateTo) count += 1
    if (dateFilters.length > 0) count += dateFilters.length
    if (hasExtendedSearch) count += 1
    if (expedienteNumFilter) count += 1
    if (nrNumFilter) count += 1
    if (fvNumFilter) count += 1
    if (numeroAutorizacionFilter) count += 1
    if (instrumentadorFilter) count += 1
    if (localidadFilter) count += 1
    if (fechaAutorizacionFrom || fechaAutorizacionTo) count += 1
    if (fechaFacturaFrom || fechaFacturaTo) count += 1
    if (sinFechaCx) count += 1
    if (conPrFilter !== null) count += 1
    if (conConsumoFilter !== null) count += 1
    if (conFacturaFilter !== null) count += 1
    return count
  }, [search, searchChips, kpiFilter, stateFilters, prepFilters, docFilters, factFilters, clientFilters, classFilters, institutionFilters, coordinadorFilters, urgenteFilter, provinciaFilters, vendedorFilters, dateFrom, dateTo, dateFilters, hasExtendedSearch, expedienteNumFilter, nrNumFilter, fvNumFilter, numeroAutorizacionFilter, instrumentadorFilter, localidadFilter, fechaAutorizacionFrom, fechaAutorizacionTo, fechaFacturaFrom, fechaFacturaTo, sinFechaCx, conPrFilter, conConsumoFilter, conFacturaFilter])

  // ── Clear all filters (including search chips) ──
  const clearFilters = useCallback(() => {
    setSearch("")
    setSearchChips([])
    setStateFilters([])
    setClassFilters([])
    setClientFilters([])
    setInstitutionFilters([])
    setPrepFilters([])
    setDocFilters([])
    setFactFilters([])
    setCoordinadorFilters([])
    setUrgenteFilter(null)
    setProvinciaFilters([])
    setVendedorFilters([])
    setDateFrom("")
    setDateTo("")
    setKpiFilter(null)
    setSearchInMedico(false)
    setSearchInInstitucion(false)
    setSearchInCliente(false)
    setSearchInPR(false)
    setSearchInExpediente(false)
    setSearchInNR(false)
    setSearchInFV(false)
    // CHATZAI-025-4C: Clear enhanced date filters
    setDateFilters([])
    // CHATZAI-025-4C: Clear new advanced filter fields
    setExpedienteNumFilter("")
    setNrNumFilter("")
    setFvNumFilter("")
    setNumeroAutorizacionFilter("")
    setInstrumentadorFilter("")
    setLocalidadFilter("")
    setFechaAutorizacionFrom("")
    setFechaAutorizacionTo("")
    setFechaFacturaFrom("")
    setFechaFacturaTo("")
    setSinFechaCx(false)
    setConPrFilter(null)
    setConConsumoFilter(null)
    setConFacturaFilter(null)
  }, [])

  const clearExtendedSearch = useCallback(() => {
    setSearchInMedico(false)
    setSearchInInstitucion(false)
    setSearchInCliente(false)
    setSearchInPR(false)
    setSearchInExpediente(false)
    setSearchInNR(false)
    setSearchInFV(false)
  }, [])

  return {
    // State
    search, setSearch,
    stateFilters, setStateFilters,
    classFilters, setClassFilters,
    clientFilters, setClientFilters,
    institutionFilters, setInstitutionFilters,
    prepFilters, setPrepFilters,
    docFilters, setDocFilters,
    factFilters, setFactFilters,
    coordinadorFilters, setCoordinadorFilters,
    urgenteFilter, setUrgenteFilter,
    provinciaFilters, setProvinciaFilters,
    vendedorFilters, setVendedorFilters,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    kpiFilter, setKpiFilter,
    filtersOpen, setFiltersOpen,
    searchInMedico, setSearchInMedico,
    searchInInstitucion, setSearchInInstitucion,
    searchInCliente, setSearchInCliente,
    searchInPR, setSearchInPR,
    searchInExpediente, setSearchInExpediente,
    searchInNR, setSearchInNR,
    searchInFV, setSearchInFV,
    // CHATZAI-025: Search chips
    searchChips, setSearchChips,
    // CHATZAI-025-4C: Enhanced date filters
    dateFilters, setDateFilters,
    // CHATZAI-025-4C: New advanced filter fields
    expedienteNumFilter, setExpedienteNumFilter,
    nrNumFilter, setNrNumFilter,
    fvNumFilter, setFvNumFilter,
    numeroAutorizacionFilter, setNumeroAutorizacionFilter,
    instrumentadorFilter, setInstrumentadorFilter,
    localidadFilter, setLocalidadFilter,
    fechaAutorizacionFrom, setFechaAutorizacionFrom,
    fechaAutorizacionTo, setFechaAutorizacionTo,
    fechaFacturaFrom, setFechaFacturaFrom,
    fechaFacturaTo, setFechaFacturaTo,
    sinFechaCx, setSinFechaCx,
    conPrFilter, setConPrFilter,
    conConsumoFilter, setConConsumoFilter,
    conFacturaFilter, setConFacturaFilter,
    // Computed
    activeFilterChips,
    hasActiveFilters,
    hasExtendedSearch,
    activeFilterCount,
    facturacionStatus,
    // Actions
    filterData,
    clearFilters,
    clearExtendedSearch,
  }
}
