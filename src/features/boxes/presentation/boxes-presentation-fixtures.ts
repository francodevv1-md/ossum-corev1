export type BoxUnitCondition = "Disponible" | "Con diferencias" | null

export type BoxActiveMaintenanceSummary = {
  id: string
  kind: "REPAIR" | "PREVENTIVE_MAINTENANCE"
  status: "OPEN" | "SENT" | "RETURNED_PENDING_REVIEW"
  articleDescription: string | null
  version: number
  updatedAt: string
}

type BoxPresentationEvidenceBase = {
  id: string
  occurredAt: string
  displayedAt: string
  checkpoint: "Uso / CX" | "Control de preparación" | "Contenido despachado" | "Devolución registrada" | "Nota de operación" | "Problema reportado" | "Enviado a reparación" | "Regresó de reparación"
  summary: string
  actor?: string
  surgeryReference?: string
}

export type BoxPresentationEvidence = BoxPresentationEvidenceBase & (
  | { eventKind: "PROBLEM_REPORTED" | "REPAIR_SENT" | "REPAIR_RETURNED"; articleId: string; articleDescription: string }
  | { eventKind?: "SURGERY_USE"; articleId?: never; articleDescription?: never }
)

export type BoxPresentationUnit = {
  code: string
  condition: BoxUnitCondition
  operationReference?: string
  evidence: BoxPresentationEvidence[]
  /** DB ID of the StockIdentifiedUnit — set by real API data, absent in fixtures. */
  unitId?: string
  usageCount?: number
  lastSurgery?: { reference: string; occurredAt: string } | null
  reportedProblemCount?: number
  repairSendCount?: number
  repairLatestSentSignalCount?: number
  activeMaintenanceCount?: number
  latestActiveMaintenance?: BoxActiveMaintenanceSummary | null
}

export type BoxExpectedContentItem = {
  articleId: string
  articleSku?: string
  articleName: string
  expectedQuantity: number
  quantityUnit: string
  order?: number
}

export type BoxExpectedContentVersion = {
  label: string
  nextLabel: string
  context: string
  items: BoxExpectedContentItem[]
}

export type BoxPresentationSku = {
  id: string
  name: string
  description: string
  category: string
  expectedContent: BoxExpectedContentVersion
  units: BoxPresentationUnit[]
}

export type BoxPreparationComparisonKind =
  | "Coincide"
  | "Cantidad menor"
  | "Cantidad mayor"
  | "Faltante"
  | "Agregado no esperado"
  | "Sustitución"

export type BoxPreparationPhysicalItem = {
  id: string
  articleName: string
  quantity: string
  traceability?: string
}

export type BoxPreparationComparison = {
  id: string
  kind: BoxPreparationComparisonKind
  expectedArticle?: string
  expectedQuantity?: string
  actualItems: BoxPreparationPhysicalItem[]
  explanation: string
  requiresAcknowledgement: boolean
}

export type BoxPreparationCandidate = {
  id: string
  boxId: string
  boxName: string
  unitCode: string
  eligible: boolean
  unavailableReason?: string
  expectedVersion: string
  comparisons: BoxPreparationComparison[]
}

export type BoxPreparationControlHandoff = {
  candidate: BoxPreparationCandidate
  acknowledgedDifferenceIds: string[]
}

export type BoxPreparationControlEvidence = {
  reference: string
  occurredAt: string
  displayedAt: string
  actor: string
}

export type BoxDispatchEvidence = {
  remittanceReference: string
  dispatchedContentReference: string
  occurredAt: string
  displayedAt: string
  actor: string
}

export type BoxReturnExceptionKind = "Consumido" | "Faltante" | "Agregado" | "Reemplazado"

export type BoxReturnExceptionPreset = {
  id: string
  kind: BoxReturnExceptionKind
  title: string
  detail: string
  dispatchedSide?: string
  receivedSide?: string
}

export type BoxReturnScenario = {
  returnedNow: string[]
  pendingBalance: string
  exceptions: BoxReturnExceptionPreset[]
  recontrolComposition: BoxPreparationPhysicalItem[]
}

export type BoxReturnResolutionDifference = {
  id: string
  kind: string
  title: string
  detail: string
}

export type BoxReturnResolutionHandoff = {
  historicalResult: "Con diferencias"
  differences: BoxReturnResolutionDifference[]
  note?: string
}

export type BoxPostControlChangeKind =
  | "Cantidad modificada"
  | "Trazabilidad modificada"
  | "Agregado"
  | "Removido"
  | "Reemplazado"

export type BoxPostControlChange = {
  id: string
  kind: BoxPostControlChangeKind
  articleName: string
  priorValue: string
  currentValue: string
  explanation: string
}

export type BoxPostControlChangeReview = {
  currentComposition: BoxPreparationPhysicalItem[]
  changes: BoxPostControlChange[]
}

export const BOX_PRESENTATION_FIXTURES: BoxPresentationSku[] = [
  {
    id: "CJ-TIB-01",
    name: "Caja de tibia proximal",
    description: "Artículo compuesto para preparación de instrumental de tibia proximal.",
    category: "Traumatología",
    expectedContent: {
      label: "Versión 3",
      nextLabel: "Versión 4",
      context: "Referencia vigente para nuevas preparaciones",
      items: [
        { articleId: "ART-TIB-101", articleName: "Guía de corte tibial", expectedQuantity: 1, quantityUnit: "unidad", order: 1 },
        { articleId: "ART-TIB-118", articleName: "Bloque de prueba tibial", expectedQuantity: 6, quantityUnit: "unidades", order: 2 },
        { articleId: "ART-TIB-126", articleName: "Impactores tibiales", expectedQuantity: 2, quantityUnit: "unidades", order: 3 },
      ],
    },
    units: [
      {
        code: "UT-TIB-014",
        condition: "Disponible",
        evidence: [],
        usageCount: 12,
        lastSurgery: { reference: "CX-1938", occurredAt: "2026-08-21T11:00:00-03:00" },
        reportedProblemCount: 0,
        repairSendCount: 1,
        repairLatestSentSignalCount: 0,
      },
      {
        code: "UT-TIB-022",
        condition: "Con diferencias",
        operationReference: "CX-1842",
        usageCount: 8,
        lastSurgery: { reference: "CX-1921", occurredAt: "2026-08-18T09:30:00-03:00" },
        reportedProblemCount: 2,
        repairSendCount: 2,
        repairLatestSentSignalCount: 1,
        evidence: [
          {
            id: "EV-TIB-022-01",
            occurredAt: "2026-08-04T09:20:00-03:00",
            displayedAt: "4 ago 2026 · 09:20",
            checkpoint: "Control de preparación",
            summary: "Composición revisada y conservada como evidencia de la operación ilustrativa.",
            actor: "Lucía M.",
          },
          {
            id: "EV-TIB-022-02",
            occurredAt: "2026-08-04T14:45:00-03:00",
            displayedAt: "4 ago 2026 · 14:45",
            checkpoint: "Contenido despachado",
            summary: "Contenido registrado para este despacho ilustrativo, separado del control previo.",
            actor: "Diego R.",
          },
          {
            id: "EV-TIB-022-03",
            occurredAt: "2026-08-06T11:10:00-03:00",
            displayedAt: "6 ago 2026 · 11:10",
            checkpoint: "Devolución registrada",
            summary: "Devolución parcial recibida con una diferencia informada para esta operación.",
            actor: "Lucía M.",
          },
          {
            id: "EV-TIB-022-04",
            occurredAt: "2026-08-06T11:18:00-03:00",
            displayedAt: "6 ago 2026 · 11:18",
            checkpoint: "Nota de operación",
            summary: "Observación descriptiva agregada para conservar el contexto de la diferencia.",
          },
        ],
      },
      { code: "UT-TIB-031", condition: null, evidence: [] },
    ],
  },
  {
    id: "CJ-ART-04",
    name: "Caja de artroscopía de hombro",
    description: "Artículo compuesto para procedimientos artroscópicos de hombro.",
    category: "Artroscopía",
    expectedContent: {
      label: "Versión 2",
      nextLabel: "Versión 3",
      context: "Referencia vigente para nuevas preparaciones",
      items: [
        { articleId: "ART-ART-204", articleName: "Cánula de trabajo", expectedQuantity: 2, quantityUnit: "unidades", order: 1 },
        { articleId: "ART-ART-219", articleName: "Guía de sutura", expectedQuantity: 1, quantityUnit: "unidad", order: 2 },
        { articleId: "ART-ART-227", articleName: "Obturadores", expectedQuantity: 3, quantityUnit: "unidades", order: 3 },
      ],
    },
    units: [
      { code: "UT-ART-008", condition: "Disponible", evidence: [] },
      { code: "UT-ART-011", condition: "Disponible", evidence: [] },
    ],
  },
  {
    id: "CJ-COL-02",
    name: "Caja lumbar posterior",
    description: "Artículo compuesto de instrumental lumbar para abordaje posterior.",
    category: "Columna",
    expectedContent: {
      label: "Versión 5",
      nextLabel: "Versión 6",
      context: "Referencia vigente para nuevas preparaciones",
      items: [
        { articleId: "ART-COL-302", articleName: "Separador lumbar", expectedQuantity: 2, quantityUnit: "unidades", order: 1 },
        { articleId: "ART-COL-315", articleName: "Medidor pedicular", expectedQuantity: 1, quantityUnit: "unidad", order: 2 },
        { articleId: "ART-COL-328", articleName: "Destornilladores poliaxiales", expectedQuantity: 4, quantityUnit: "unidades", order: 3 },
      ],
    },
    units: [
      {
        code: "UT-COL-003",
        condition: "Con diferencias",
        operationReference: "CX-1901",
        evidence: [
          {
            id: "EV-COL-003-01",
            occurredAt: "2026-08-05T08:35:00-03:00",
            displayedAt: "5 ago 2026 · 08:35",
            checkpoint: "Control de preparación",
            summary: "Composición revisada y conservada como evidencia de la operación ilustrativa.",
            actor: "Martín C.",
          },
          {
            id: "EV-COL-003-02",
            occurredAt: "2026-08-05T13:05:00-03:00",
            displayedAt: "5 ago 2026 · 13:05",
            checkpoint: "Contenido despachado",
            summary: "Contenido registrado para este despacho ilustrativo, separado del control previo.",
            actor: "Martín C.",
          },
        ],
      },
      { code: "UT-COL-009", condition: null, evidence: [] },
    ],
  },
  {
    id: "CJ-INS-07",
    name: "Caja de instrumental general",
    description: "Artículo compuesto reutilizable para apoyo quirúrgico general.",
    category: "Instrumental",
    expectedContent: {
      label: "Versión 1",
      nextLabel: "Versión 2",
      context: "Referencia vigente para nuevas preparaciones",
      items: [
        { articleId: "ART-INS-401", articleName: "Pinza de disección", expectedQuantity: 4, quantityUnit: "unidades", order: 1 },
        { articleId: "ART-INS-414", articleName: "Separadores manuales", expectedQuantity: 2, quantityUnit: "unidades", order: 2 },
        { articleId: "ART-INS-429", articleName: "Portaagujas", expectedQuantity: 2, quantityUnit: "unidades", order: 3 },
      ],
    },
    units: [{ code: "UT-INS-017", condition: "Disponible", evidence: [] }],
  },
]

export const BOX_PREPARATION_OPERATION = {
  reference: "CX-2048",
  patientLabel: "Expediente quirúrgico ilustrativo",
  procedure: "Reconstrucción de rodilla · preparación demostrativa",
} as const

export const BOX_PREPARATION_CONTROL_EVIDENCE: BoxPreparationControlEvidence = {
  reference: "CTRL-ILU-2048-01",
  occurredAt: "2026-08-07T10:24:00-03:00",
  displayedAt: "7 ago 2026 · 10:24",
  actor: "Lucía M. · operador ilustrativo",
}

export const BOX_RECONTROL_EVIDENCE: BoxPreparationControlEvidence = {
  reference: "CTRL-ILU-2048-02",
  occurredAt: "2026-08-07T11:05:00-03:00",
  displayedAt: "7 ago 2026 · 11:05",
  actor: "Lucía M. · operador ilustrativo",
}

export const BOX_DISPATCH_EVIDENCE: BoxDispatchEvidence = {
  remittanceReference: "REM-ILU-2048-01",
  dispatchedContentReference: "CD-ILU-2048-01",
  occurredAt: "2026-08-07T11:42:00-03:00",
  displayedAt: "7 ago 2026 · 11:42",
  actor: "Diego R. · operador ilustrativo",
}

export const BOX_RETURN_SCENARIOS_BY_CANDIDATE: Record<string, BoxReturnScenario> = {
  "candidate-tib-014": {
    returnedNow: ["Guía de corte tibial · 1 unidad", "Bloque de prueba tibial · 2 de 4 unidades"],
    pendingBalance: "2 Bloques de prueba tibial + 2 Impactores tibiales permanecen pendientes",
    exceptions: [
      { id: "ret-tib-consumed", kind: "Consumido", title: "Bloque de prueba tibial · 1 unidad", detail: "Se contabiliza una sola vez contra el saldo compartido del despacho." },
      { id: "ret-tib-missing", kind: "Faltante", title: "Guía de corte tibial", detail: "La unidad despachada no fue recibida dentro de esta porción." },
      { id: "ret-tib-added", kind: "Agregado", title: "Guía femoral no despachada", detail: "Elemento recibido fuera del Contenido despachado; queda En revisión." },
      { id: "ret-tib-replaced", kind: "Reemplazado", title: "Impactor tibial", detail: "Se preservan ambos lados sin inferir disponibilidad ni compensación.", dispatchedSide: "Despachado: IMP-A-0904", receivedSide: "Recibido: IMP-B-1102 · En revisión" },
    ],
    recontrolComposition: [
      { id: "PH-TIB-GUI-77", articleName: "Guía de corte tibial", quantity: "1 unidad", traceability: "Serie GUI-7790" },
      { id: "PH-TIB-BLO-21", articleName: "Bloque de prueba tibial", quantity: "2 unidades", traceability: "Lote L-TB-2607" },
      { id: "PH-TIB-IMP-09", articleName: "Impactor tibial alternativo", quantity: "2 unidades", traceability: "Serie IMP-A-0904" },
    ],
  },
  "candidate-art-008": {
    returnedNow: ["Cánula de trabajo · 1 unidad", "Obturadores · 2 de 4 unidades"],
    pendingBalance: "2 Obturadores + 1 Sonda artroscópica permanecen pendientes",
    exceptions: [
      { id: "ret-art-consumed", kind: "Consumido", title: "Obturador · 1 unidad", detail: "Se contabiliza una sola vez contra el saldo compartido del despacho." },
      { id: "ret-art-missing", kind: "Faltante", title: "Cánula de trabajo", detail: "La unidad despachada no fue recibida dentro de esta porción." },
      { id: "ret-art-added", kind: "Agregado", title: "Pinza artroscópica no despachada", detail: "Elemento recibido fuera del Contenido despachado; queda En revisión." },
      { id: "ret-art-replaced", kind: "Reemplazado", title: "Obturador", detail: "Se preservan ambos lados sin inferir disponibilidad ni compensación.", dispatchedSide: "Despachado: OBT-3201", receivedSide: "Recibido: OBT-4108 · En revisión" },
    ],
    recontrolComposition: [
      { id: "PH-ART-CAN-14", articleName: "Cánula de trabajo", quantity: "1 unidad", traceability: "Lote CAN-2608" },
      { id: "PH-ART-OBT-31", articleName: "Obturadores", quantity: "2 unidades", traceability: "Serie OBT-3201 a OBT-3202" },
    ],
  },
  "candidate-ins-017": {
    returnedNow: ["Pinza de disección · 2 de 3 unidades"],
    pendingBalance: "1 Pinza de disección permanece pendiente",
    exceptions: [
      { id: "ret-ins-consumed", kind: "Consumido", title: "Pinza de disección · 1 unidad", detail: "Se contabiliza una sola vez contra el saldo compartido del despacho." },
      { id: "ret-ins-missing", kind: "Faltante", title: "Pinza de disección", detail: "Una unidad despachada no fue recibida dentro de esta porción." },
      { id: "ret-ins-added", kind: "Agregado", title: "Separador manual no despachado", detail: "Elemento recibido fuera del Contenido despachado; queda En revisión." },
      { id: "ret-ins-replaced", kind: "Reemplazado", title: "Pinza de disección", detail: "Se preservan ambos lados sin inferir disponibilidad ni compensación.", dispatchedSide: "Despachado: PIN-451", receivedSide: "Recibido: PIN-611 · En revisión" },
    ],
    recontrolComposition: [
      { id: "PH-INS-PIN-44", articleName: "Pinza de disección", quantity: "2 unidades", traceability: "Series PIN-451 a PIN-452" },
    ],
  },
}

export const BOX_RETURN_RECONTROL_EVIDENCE: BoxPreparationControlEvidence = {
  reference: "CTRL-ILU-2048-03",
  occurredAt: "2026-08-07T13:10:00-03:00",
  displayedAt: "7 ago 2026 · 13:10",
  actor: "Lucía M. · operador ilustrativo",
}

export const BOX_POST_CONTROL_CHANGES_BY_CANDIDATE: Record<string, BoxPostControlChangeReview> = {
  "candidate-tib-014": {
    currentComposition: [
      { id: "PH-TIB-GUI-77", articleName: "Guía de corte tibial", quantity: "1 unidad", traceability: "Serie GUI-7790" },
      { id: "PH-TIB-BLO-21", articleName: "Bloque de prueba tibial", quantity: "4 unidades", traceability: "Lote L-TB-2607" },
      { id: "PH-TIB-IMP-09", articleName: "Impactor tibial alternativo", quantity: "2 unidades", traceability: "Serie IMP-A-0904" },
    ],
    changes: [
      {
        id: "change-tib-quantity",
        kind: "Cantidad modificada",
        articleName: "Bloque de prueba tibial",
        priorValue: "5 unidades",
        currentValue: "4 unidades",
        explanation: "La composición actual contiene una unidad menos que la composición controlada.",
      },
      {
        id: "change-tib-traceability",
        kind: "Trazabilidad modificada",
        articleName: "Guía de corte tibial",
        priorValue: "Serie GUI-7781",
        currentValue: "Serie GUI-7790",
        explanation: "La identidad trazable capturada cambió después del control ilustrativo.",
      },
    ],
  },
  "candidate-art-008": {
    currentComposition: [
      { id: "PH-ART-CAN-14", articleName: "Cánula de trabajo", quantity: "1 unidad", traceability: "Lote CAN-2608" },
      { id: "PH-ART-OBT-31", articleName: "Obturadores", quantity: "4 unidades", traceability: "Serie OBT-3201 a OBT-3204" },
      { id: "PH-ART-PRO-06", articleName: "Sonda artroscópica", quantity: "1 unidad", traceability: "Serie PRO-0612" },
    ],
    changes: [
      {
        id: "change-art-quantity",
        kind: "Cantidad modificada",
        articleName: "Cánula de trabajo",
        priorValue: "2 unidades",
        currentValue: "1 unidad",
        explanation: "La composición actual contiene una unidad menos que la composición controlada.",
      },
      {
        id: "change-art-traceability",
        kind: "Trazabilidad modificada",
        articleName: "Obturadores",
        priorValue: "Serie OBT-3101 a OBT-3104",
        currentValue: "Serie OBT-3201 a OBT-3204",
        explanation: "La serie capturada para los obturadores cambió después del control ilustrativo.",
      },
    ],
  },
  "candidate-ins-017": {
    currentComposition: [
      { id: "PH-INS-PIN-44", articleName: "Pinza de disección", quantity: "3 unidades", traceability: "Series PIN-451 a PIN-453" },
    ],
    changes: [
      {
        id: "change-ins-quantity",
        kind: "Cantidad modificada",
        articleName: "Pinza de disección",
        priorValue: "4 unidades",
        currentValue: "3 unidades",
        explanation: "La composición actual contiene una unidad menos que la composición controlada.",
      },
      {
        id: "change-ins-traceability",
        kind: "Trazabilidad modificada",
        articleName: "Pinza de disección",
        priorValue: "Series PIN-441 a PIN-444",
        currentValue: "Series PIN-451 a PIN-453",
        explanation: "Las series capturadas cambiaron después del control ilustrativo.",
      },
    ],
  },
}

export const BOX_PREPARATION_CANDIDATES: BoxPreparationCandidate[] = [
  {
    id: "candidate-tib-014",
    boxId: "CJ-TIB-01",
    boxName: "Caja de tibia proximal",
    unitCode: "UT-TIB-014",
    eligible: true,
    expectedVersion: "Versión 3",
    comparisons: [
      {
        id: "tib-guide-match",
        kind: "Coincide",
        expectedArticle: "Guía de corte tibial",
        expectedQuantity: "1 unidad",
        actualItems: [
          {
            id: "PH-TIB-GUI-77",
            articleName: "Guía de corte tibial",
            quantity: "1 unidad",
            traceability: "Serie GUI-7781",
          },
        ],
        explanation: "La selección física coincide con la referencia esperada.",
        requiresAcknowledgement: false,
      },
      {
        id: "tib-block-under",
        kind: "Cantidad menor",
        expectedArticle: "Bloque de prueba tibial",
        expectedQuantity: "6 unidades",
        actualItems: [
          {
            id: "PH-TIB-BLO-21",
            articleName: "Bloque de prueba tibial",
            quantity: "5 unidades",
            traceability: "Lote L-TB-2607",
          },
        ],
        explanation: "La selección ilustrativa contiene una unidad menos que la referencia.",
        requiresAcknowledgement: true,
      },
      {
        id: "tib-impactor-substitution",
        kind: "Sustitución",
        expectedArticle: "Impactores tibiales",
        expectedQuantity: "2 unidades",
        actualItems: [
          {
            id: "PH-TIB-IMP-09",
            articleName: "Impactor tibial alternativo",
            quantity: "2 unidades",
            traceability: "Serie IMP-A-0904",
          },
        ],
        explanation: "La selección física corresponde a un artículo alternativo, sin modificar la fórmula.",
        requiresAcknowledgement: true,
      },
    ],
  },
  {
    id: "candidate-art-008",
    boxId: "CJ-ART-04",
    boxName: "Caja de artroscopía de hombro",
    unitCode: "UT-ART-008",
    eligible: true,
    expectedVersion: "Versión 2",
    comparisons: [
      {
        id: "art-cannula-match",
        kind: "Coincide",
        expectedArticle: "Cánula de trabajo",
        expectedQuantity: "2 unidades",
        actualItems: [
          {
            id: "PH-ART-CAN-14",
            articleName: "Cánula de trabajo",
            quantity: "2 unidades",
            traceability: "Lote CAN-2608",
          },
        ],
        explanation: "La selección física coincide con la referencia esperada.",
        requiresAcknowledgement: false,
      },
      {
        id: "art-obturator-over",
        kind: "Cantidad mayor",
        expectedArticle: "Obturadores",
        expectedQuantity: "3 unidades",
        actualItems: [
          {
            id: "PH-ART-OBT-31",
            articleName: "Obturadores",
            quantity: "4 unidades",
            traceability: "Serie OBT-3101 a OBT-3104",
          },
        ],
        explanation: "La selección ilustrativa contiene una unidad adicional.",
        requiresAcknowledgement: true,
      },
      {
        id: "art-added-probe",
        kind: "Agregado no esperado",
        actualItems: [
          {
            id: "PH-ART-PRO-06",
            articleName: "Sonda artroscópica",
            quantity: "1 unidad",
            traceability: "Serie PRO-0612",
          },
        ],
        explanation: "El componente físico fue agregado más allá de la fórmula de referencia.",
        requiresAcknowledgement: true,
      },
    ],
  },
  {
    id: "candidate-ins-017",
    boxId: "CJ-INS-07",
    boxName: "Caja de instrumental general",
    unitCode: "UT-INS-017",
    eligible: true,
    expectedVersion: "Versión 1",
    comparisons: [
      {
        id: "ins-forceps-match",
        kind: "Coincide",
        expectedArticle: "Pinza de disección",
        expectedQuantity: "4 unidades",
        actualItems: [
          {
            id: "PH-INS-PIN-44",
            articleName: "Pinza de disección",
            quantity: "4 unidades",
            traceability: "Series PIN-441 a PIN-444",
          },
        ],
        explanation: "La selección física coincide con la referencia esperada.",
        requiresAcknowledgement: false,
      },
      {
        id: "ins-holder-missing",
        kind: "Faltante",
        expectedArticle: "Portaagujas",
        expectedQuantity: "2 unidades",
        actualItems: [],
        explanation: "No hay selección física ilustrativa para esta línea esperada.",
        requiresAcknowledgement: true,
      },
    ],
  },
  {
    id: "candidate-col-003",
    boxId: "CJ-COL-02",
    boxName: "Caja lumbar posterior",
    unitCode: "UT-COL-003",
    eligible: false,
    unavailableReason: "Vinculada a la operación activa CX-1901; no está disponible para esta preparación.",
    expectedVersion: "Versión 5",
    comparisons: [],
  },
]
