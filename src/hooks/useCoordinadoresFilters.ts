import { useState, useMemo, useCallback } from "react"
import type { Surgery } from "@/types"
import type {
  CoordinadoresFilterState,
  IncidentFilterKey,
  IncidentMetric,
} from "@/types/coordinadores.types"

export interface AdvancedFilterState {
  classFilters: string[]
  clientFilters: string[]
  institutionFilters: string[]
  provinciaFilters: string[]
  vendedorFilters: string[]
  urgenteFilter: boolean | null
  expedienteNumFilter: string
  nrNumFilter: string
  fvNumFilter: string
  numeroAutorizacionFilter: string
  instrumentadorFilter: string
  localidadFilter: string
  fechaAutorizacionFrom: string
  fechaAutorizacionTo: string
  fechaFacturaFrom: string
  fechaFacturaTo: string
  sinFechaCx: boolean
  conPrFilter: "con" | "sin" | null
  conConsumoFilter: "con" | "sin" | null
  conFacturaFilter: "con" | "sin" | null
  searchInMedico: boolean
  searchInInstitucion: boolean
  searchInCliente: boolean
  searchInPR: boolean
  searchInExpediente: boolean
  searchInNR: boolean
  searchInFV: boolean
}

const INITIAL_FILTER_STATE: CoordinadoresFilterState = {
  search: "",
  selectedCoordinators: [],
  selectedStates: [],
  selectedPreps: [],
  soloIncidencias: false,
  activeIncidentFilter: null,
}

const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
  classFilters: [],
  clientFilters: [],
  institutionFilters: [],
  provinciaFilters: [],
  vendedorFilters: [],
  urgenteFilter: null,
  expedienteNumFilter: "",
  nrNumFilter: "",
  fvNumFilter: "",
  numeroAutorizacionFilter: "",
  instrumentadorFilter: "",
  localidadFilter: "",
  fechaAutorizacionFrom: "",
  fechaAutorizacionTo: "",
  fechaFacturaFrom: "",
  fechaFacturaTo: "",
  sinFechaCx: false,
  conPrFilter: null,
  conConsumoFilter: null,
  conFacturaFilter: null,
  searchInMedico: true,
  searchInInstitucion: true,
  searchInCliente: true,
  searchInPR: true,
  searchInExpediente: true,
  searchInNR: false,
  searchInFV: false,
}

export function useCoordinadoresFilters(surgeries: Surgery[]) {
  const [filters, setFilters] = useState<CoordinadoresFilterState>(INITIAL_FILTER_STATE)

  // Advanced secondary filters state (matching MoreFiltersPopover)
  const [classFilters, setClassFilters] = useState<string[]>(INITIAL_ADVANCED_FILTERS.classFilters)
  const [clientFilters, setClientFilters] = useState<string[]>(INITIAL_ADVANCED_FILTERS.clientFilters)
  const [institutionFilters, setInstitutionFilters] = useState<string[]>(INITIAL_ADVANCED_FILTERS.institutionFilters)
  const [provinciaFilters, setProvinciaFilters] = useState<string[]>(INITIAL_ADVANCED_FILTERS.provinciaFilters)
  const [vendedorFilters, setVendedorFilters] = useState<string[]>(INITIAL_ADVANCED_FILTERS.vendedorFilters)
  const [urgenteFilter, setUrgenteFilter] = useState<boolean | null>(INITIAL_ADVANCED_FILTERS.urgenteFilter)
  const [expedienteNumFilter, setExpedienteNumFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.expedienteNumFilter)
  const [nrNumFilter, setNrNumFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.nrNumFilter)
  const [fvNumFilter, setFvNumFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.fvNumFilter)
  const [numeroAutorizacionFilter, setNumeroAutorizacionFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.numeroAutorizacionFilter)
  const [instrumentadorFilter, setInstrumentadorFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.instrumentadorFilter)
  const [localidadFilter, setLocalidadFilter] = useState<string>(INITIAL_ADVANCED_FILTERS.localidadFilter)
  const [fechaAutorizacionFrom, setFechaAutorizacionFrom] = useState<string>(INITIAL_ADVANCED_FILTERS.fechaAutorizacionFrom)
  const [fechaAutorizacionTo, setFechaAutorizacionTo] = useState<string>(INITIAL_ADVANCED_FILTERS.fechaAutorizacionTo)
  const [fechaFacturaFrom, setFechaFacturaFrom] = useState<string>(INITIAL_ADVANCED_FILTERS.fechaFacturaFrom)
  const [fechaFacturaTo, setFechaFacturaTo] = useState<string>(INITIAL_ADVANCED_FILTERS.fechaFacturaTo)
  const [sinFechaCx, setSinFechaCx] = useState<boolean>(INITIAL_ADVANCED_FILTERS.sinFechaCx)
  const [conPrFilter, setConPrFilter] = useState<"con" | "sin" | null>(INITIAL_ADVANCED_FILTERS.conPrFilter)
  const [conConsumoFilter, setConConsumoFilter] = useState<"con" | "sin" | null>(INITIAL_ADVANCED_FILTERS.conConsumoFilter)
  const [conFacturaFilter, setConFacturaFilter] = useState<"con" | "sin" | null>(INITIAL_ADVANCED_FILTERS.conFacturaFilter)
  const [searchInMedico, setSearchInMedico] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInMedico)
  const [searchInInstitucion, setSearchInInstitucion] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInInstitucion)
  const [searchInCliente, setSearchInCliente] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInCliente)
  const [searchInPR, setSearchInPR] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInPR)
  const [searchInExpediente, setSearchInExpediente] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInExpediente)
  const [searchInNR, setSearchInNR] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInNR)
  const [searchInFV, setSearchInFV] = useState<boolean>(INITIAL_ADVANCED_FILTERS.searchInFV)

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const toggleCoordinator = useCallback((coordinator: string) => {
    setFilters((prev) => {
      const exists = prev.selectedCoordinators.includes(coordinator)
      return {
        ...prev,
        selectedCoordinators: exists
          ? prev.selectedCoordinators.filter((c) => c !== coordinator)
          : [...prev.selectedCoordinators, coordinator],
      }
    })
  }, [])

  const toggleState = useCallback((state: string) => {
    setFilters((prev) => {
      const exists = prev.selectedStates.includes(state)
      return {
        ...prev,
        selectedStates: exists
          ? prev.selectedStates.filter((s) => s !== state)
          : [...prev.selectedStates, state],
      }
    })
  }, [])

  const togglePrep = useCallback((prep: string) => {
    setFilters((prev) => {
      const exists = prev.selectedPreps.includes(prep)
      return {
        ...prev,
        selectedPreps: exists
          ? prev.selectedPreps.filter((p) => p !== prep)
          : [...prev.selectedPreps, prep],
      }
    })
  }, [])

  const toggleSoloIncidencias = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      soloIncidencias: !prev.soloIncidencias,
    }))
  }, [])

  const toggleIncidentFilter = useCallback((key: IncidentFilterKey) => {
    setFilters((prev) => ({
      ...prev,
      activeIncidentFilter: prev.activeIncidentFilter === key ? null : key,
    }))
  }, [])

  const clearAdvancedFilters = useCallback(() => {
    setClassFilters(INITIAL_ADVANCED_FILTERS.classFilters)
    setClientFilters(INITIAL_ADVANCED_FILTERS.clientFilters)
    setInstitutionFilters(INITIAL_ADVANCED_FILTERS.institutionFilters)
    setProvinciaFilters(INITIAL_ADVANCED_FILTERS.provinciaFilters)
    setVendedorFilters(INITIAL_ADVANCED_FILTERS.vendedorFilters)
    setUrgenteFilter(INITIAL_ADVANCED_FILTERS.urgenteFilter)
    setExpedienteNumFilter(INITIAL_ADVANCED_FILTERS.expedienteNumFilter)
    setNrNumFilter(INITIAL_ADVANCED_FILTERS.nrNumFilter)
    setFvNumFilter(INITIAL_ADVANCED_FILTERS.fvNumFilter)
    setNumeroAutorizacionFilter(INITIAL_ADVANCED_FILTERS.numeroAutorizacionFilter)
    setInstrumentadorFilter(INITIAL_ADVANCED_FILTERS.instrumentadorFilter)
    setLocalidadFilter(INITIAL_ADVANCED_FILTERS.localidadFilter)
    setFechaAutorizacionFrom(INITIAL_ADVANCED_FILTERS.fechaAutorizacionFrom)
    setFechaAutorizacionTo(INITIAL_ADVANCED_FILTERS.fechaAutorizacionTo)
    setFechaFacturaFrom(INITIAL_ADVANCED_FILTERS.fechaFacturaFrom)
    setFechaFacturaTo(INITIAL_ADVANCED_FILTERS.fechaFacturaTo)
    setSinFechaCx(INITIAL_ADVANCED_FILTERS.sinFechaCx)
    setConPrFilter(INITIAL_ADVANCED_FILTERS.conPrFilter)
    setConConsumoFilter(INITIAL_ADVANCED_FILTERS.conConsumoFilter)
    setConFacturaFilter(INITIAL_ADVANCED_FILTERS.conFacturaFilter)
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE)
    clearAdvancedFilters()
  }, [clearAdvancedFilters])

  // Check if any secondary filter is active
  const hasActiveSecondary = useMemo(() => {
    return (
      classFilters.length > 0 ||
      clientFilters.length > 0 ||
      institutionFilters.length > 0 ||
      provinciaFilters.length > 0 ||
      vendedorFilters.length > 0 ||
      urgenteFilter !== null ||
      expedienteNumFilter !== "" ||
      nrNumFilter !== "" ||
      fvNumFilter !== "" ||
      numeroAutorizacionFilter !== "" ||
      instrumentadorFilter !== "" ||
      localidadFilter !== "" ||
      fechaAutorizacionFrom !== "" ||
      fechaAutorizacionTo !== "" ||
      fechaFacturaFrom !== "" ||
      fechaFacturaTo !== "" ||
      sinFechaCx ||
      conPrFilter !== null ||
      conConsumoFilter !== null ||
      conFacturaFilter !== null
    )
  }, [
    classFilters,
    clientFilters,
    institutionFilters,
    provinciaFilters,
    vendedorFilters,
    urgenteFilter,
    expedienteNumFilter,
    nrNumFilter,
    fvNumFilter,
    numeroAutorizacionFilter,
    instrumentadorFilter,
    localidadFilter,
    fechaAutorizacionFrom,
    fechaAutorizacionTo,
    fechaFacturaFrom,
    fechaFacturaTo,
    sinFechaCx,
    conPrFilter,
    conConsumoFilter,
    conFacturaFilter,
  ])

  // Derive Incidents Counts
  const incidentMetrics = useMemo<IncidentMetric[]>(() => {
    const todayStr = new Date().toISOString().split("T")[0]

    const fueraPlazo = surgeries.filter((s) => {
      return (
        Boolean(s.date) &&
        s.date < todayStr &&
        !["Realizada", "Finalizada", "Suspendida", "Cancelada"].includes(s.state)
      )
    }).length

    const ponerFecha = surgeries.filter((s) => !s.date || s.date.trim() === "").length
    const enTransito = surgeries.filter(
      (s) => s.state === "En tránsito" || s.preparationState === "Enviado" || s.preparationState === "Entregado"
    ).length
    const sinAsignar = surgeries.filter(
      (s) => !s.coordinadorCx || s.coordinadorCx.trim() === "" || s.coordinadorCx === "Sin asignar"
    ).length
    const coordinadas = surgeries.filter((s) => s.state === "Autorizada" || s.state === "Pendiente").length

    return [
      { key: "fuera-plazo", label: "Fuera de plazo", count: fueraPlazo, tone: "danger" },
      { key: "poner-fecha", label: "Poner fecha", count: ponerFecha, tone: "warning" },
      { key: "en-transito", label: "En tránsito", count: enTransito, tone: "info" },
      { key: "sin-asignar", label: "Sin asignar", count: sinAsignar, tone: "neutral" },
      { key: "coordinadas", label: "Coordinadas", count: coordinadas, tone: "success" },
    ]
  }, [surgeries])

  // Filtered dataset for current selection
  const filteredSurgeries = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]

    return surgeries.filter((surgery) => {
      // 1. Search Query
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const matchPatient = surgery.patient.toLowerCase().includes(query)
        const matchSurgeon = searchInMedico && surgery.surgeon.toLowerCase().includes(query)
        const matchInstitution = searchInInstitucion && surgery.institution.toLowerCase().includes(query)
        const matchClient = searchInCliente && (surgery.client.toLowerCase().includes(query) || (surgery.obraSocial && surgery.obraSocial.toLowerCase().includes(query)))
        const matchId = surgery.id.toLowerCase().includes(query) || (surgery.visibleNumber && surgery.visibleNumber.toLowerCase().includes(query))
        const matchCoord = surgery.coordinadorCx && surgery.coordinadorCx.toLowerCase().includes(query)
        const matchPR = searchInPR && surgery.prNumber && surgery.prNumber.toLowerCase().includes(query)
        const matchExp = searchInExpediente && surgery.expedienteNumber && surgery.expedienteNumber.toLowerCase().includes(query)

        const isMatch =
          matchPatient ||
          matchSurgeon ||
          matchInstitution ||
          matchClient ||
          matchId ||
          matchCoord ||
          matchPR ||
          matchExp

        if (!isMatch) return false
      }

      // 2. Incident quick filter toggle
      if (filters.activeIncidentFilter) {
        if (filters.activeIncidentFilter === "fuera-plazo") {
          const isOverdue =
            Boolean(surgery.date) &&
            surgery.date < todayStr &&
            !["Realizada", "Finalizada", "Suspendida", "Cancelada"].includes(surgery.state)
          if (!isOverdue) return false
        } else if (filters.activeIncidentFilter === "poner-fecha") {
          if (surgery.date && surgery.date.trim() !== "") return false
        } else if (filters.activeIncidentFilter === "en-transito") {
          if (surgery.state !== "En tránsito" && surgery.preparationState !== "Enviado" && surgery.preparationState !== "Entregado") {
            return false
          }
        } else if (filters.activeIncidentFilter === "sin-asignar") {
          if (surgery.coordinadorCx && surgery.coordinadorCx !== "Sin asignar") return false
        } else if (filters.activeIncidentFilter === "coordinadas") {
          if (surgery.state !== "Autorizada" && surgery.state !== "Pendiente") return false
        }
      }

      // 3. Solo incidencias
      if (filters.soloIncidencias) {
        const isUrgent =
          surgery.urgente ||
          surgery.state === "Suspendida" ||
          !surgery.date ||
          !surgery.coordinadorCx ||
          surgery.coordinadorCx === "Sin asignar"
        if (!isUrgent) return false
      }

      // 4. Coordinator filter
      if (filters.selectedCoordinators.length > 0) {
        const coord = surgery.coordinadorCx || "Sin asignar"
        if (!filters.selectedCoordinators.includes(coord)) return false
      }

      // 5. State filter
      if (filters.selectedStates.length > 0) {
        if (!filters.selectedStates.includes(surgery.state)) return false
      }

      // 6. Prep filter
      if (filters.selectedPreps.length > 0) {
        if (!surgery.preparationState || !filters.selectedPreps.includes(surgery.preparationState)) {
          return false
        }
      }

      // 7. Advanced: Classification filter
      if (classFilters.length > 0) {
        if (!classFilters.includes(surgery.classification)) return false
      }

      // 8. Advanced: Client / OS filter
      if (clientFilters.length > 0) {
        const os = surgery.obraSocial || surgery.client || surgery.financiador
        if (!os || !clientFilters.some((cf) => os.toLowerCase().includes(cf.toLowerCase()))) {
          return false
        }
      }

      // 9. Advanced: Institution filter
      if (institutionFilters.length > 0) {
        if (!surgery.institution || !institutionFilters.some((inf) => surgery.institution.toLowerCase().includes(inf.toLowerCase()))) {
          return false
        }
      }

      // 10. Advanced: Provincia filter
      if (provinciaFilters.length > 0) {
        const prov = surgery.institutionCity || (surgery as any).provincia || (surgery as any).city
        if (!prov || !provinciaFilters.some((pf) => prov.toLowerCase().includes(pf.toLowerCase()))) {
          return false
        }
      }

      // 11. Advanced: Vendedor filter
      if (vendedorFilters.length > 0) {
        const vend = (surgery as any).vendedor
        if (!vend || !vendedorFilters.includes(vend)) return false
      }

      // 12. Advanced: Urgente
      if (urgenteFilter !== null) {
        if (Boolean(surgery.urgente) !== urgenteFilter) return false
      }

      // 13. Advanced: Sin Fecha Cx
      if (sinFechaCx) {
        if (surgery.date && surgery.date.trim() !== "") return false
      }

      // 14. Advanced: Expediente Number
      if (expedienteNumFilter.trim() !== "") {
        if (!surgery.expedienteNumber || !surgery.expedienteNumber.toLowerCase().includes(expedienteNumFilter.toLowerCase())) {
          return false
        }
      }

      // 15. Advanced: PR Number
      if (conPrFilter === "con" && !surgery.prNumber) return false
      if (conPrFilter === "sin" && surgery.prNumber) return false

      // 16. Advanced: Factura
      if (conFacturaFilter === "con" && !surgery.facturado) return false
      if (conFacturaFilter === "sin" && surgery.facturado) return false

      return true
    })
  }, [
    surgeries,
    filters,
    classFilters,
    clientFilters,
    institutionFilters,
    provinciaFilters,
    vendedorFilters,
    urgenteFilter,
    expedienteNumFilter,
    sinFechaCx,
    conPrFilter,
    conFacturaFilter,
    searchInMedico,
    searchInInstitucion,
    searchInCliente,
    searchInPR,
    searchInExpediente,
  ])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.length > 0 ||
      filters.selectedCoordinators.length > 0 ||
      filters.selectedStates.length > 0 ||
      filters.selectedPreps.length > 0 ||
      filters.soloIncidencias ||
      filters.activeIncidentFilter !== null ||
      hasActiveSecondary
    )
  }, [filters, hasActiveSecondary])

  return {
    filters,
    setSearch,
    toggleCoordinator,
    toggleState,
    togglePrep,
    toggleSoloIncidencias,
    toggleIncidentFilter,
    clearAllFilters,
    incidentMetrics,
    filteredSurgeries,
    hasActiveFilters,

    // Advanced secondary filters & setters
    classFilters,
    setClassFilters,
    clientFilters,
    setClientFilters,
    institutionFilters,
    setInstitutionFilters,
    provinciaFilters,
    setProvinciaFilters,
    vendedorFilters,
    setVendedorFilters,
    urgenteFilter,
    setUrgenteFilter,
    expedienteNumFilter,
    setExpedienteNumFilter,
    nrNumFilter,
    setNrNumFilter,
    fvNumFilter,
    setFvNumFilter,
    numeroAutorizacionFilter,
    setNumeroAutorizacionFilter,
    instrumentadorFilter,
    setInstrumentadorFilter,
    localidadFilter,
    setLocalidadFilter,
    fechaAutorizacionFrom,
    setFechaAutorizacionFrom,
    fechaAutorizacionTo,
    setFechaAutorizacionTo,
    fechaFacturaFrom,
    setFechaFacturaFrom,
    fechaFacturaTo,
    setFechaFacturaTo,
    sinFechaCx,
    setSinFechaCx,
    conPrFilter,
    setConPrFilter,
    conConsumoFilter,
    setConConsumoFilter,
    conFacturaFilter,
    setConFacturaFilter,
    searchInMedico,
    setSearchInMedico,
    searchInInstitucion,
    setSearchInInstitucion,
    searchInCliente,
    setSearchInCliente,
    searchInPR,
    setSearchInPR,
    searchInExpediente,
    setSearchInExpediente,
    searchInNR,
    setSearchInNR,
    searchInFV,
    setSearchInFV,
    hasActiveSecondary,
    clearAdvancedFilters,
  }
}
