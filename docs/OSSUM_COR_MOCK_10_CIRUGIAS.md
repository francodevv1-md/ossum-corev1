# OSSUM COR — MOCK DATASET DE CIRUGÍAS

## Fuente
Listado de Cirugías — 02/10/2026

## Alcance
- Cirugías incluidas: 10
- Expedientes fuente: 7715, 7713, 7708, 7705, 7704, 7696, 7687, 7685, 7682, 7681
- Moneda: ARS
- Fechas normalizadas: `YYYY-MM-DD`
- Datos no presentes en la fuente: `null`
- IDs `MOCK-*`: generados únicamente para relacionar entidades internas de prueba
- No se inventan DNI, CUIT, teléfonos, emails, institución, vendedor, instrumentador, localidad ni provincia

---

# 1. CONTACTOS

## 1.1 PAGADORES / CLIENTES

```yaml
payers:

  - id: CONT-MOCK-PAG-001
    nombre: "IASEP - INSTITUTO ASISTENCIA SOCIAL PARA EMPLEADOS PUBLICOS"
    tipoPersona: juridica
    tipoContacto: cliente
    grupo: obras_sociales
    esPagador: true
    cuit: null
    email: null
    telefono: null
    domicilio: null
    localidad: null
    provincia: null

  - id: CONT-MOCK-PAG-002
    nombre: "PREVENCION ART"
    tipoPersona: juridica
    tipoContacto: cliente
    grupo: art
    esPagador: true
    cuit: null
    email: null
    telefono: null
    domicilio: null
    localidad: null
    provincia: null

  - id: CONT-MOCK-PAG-003
    nombre: "IOSCOR - INSTITUTO DE OBRA SOCIAL DE LA PROVINCIA DE C"
    tipoPersona: juridica
    tipoContacto: cliente
    grupo: obras_sociales
    esPagador: true
    cuit: null
    email: null
    telefono: null
    domicilio: null
    localidad: null
    provincia: null

  - id: CONT-MOCK-PAG-004
    nombre: "ASOCIART SA ASEGURADORA DE RIESGOS DEL TRABAJO"
    tipoPersona: juridica
    tipoContacto: cliente
    grupo: art
    esPagador: true
    cuit: null
    email: null
    telefono: null
    domicilio: null
    localidad: null
    provincia: null

  - id: CONT-MOCK-PAG-005
    nombre: "LA SEGUNDA ART"
    tipoPersona: juridica
    tipoContacto: cliente
    grupo: art
    esPagador: true
    cuit: null
    email: null
    telefono: null
    domicilio: null
    localidad: null
    provincia: null
```

---

## 1.2 PACIENTES

```yaml
patients:

  - id: CONT-MOCK-PAC-001
    nombre: "RODRIGUEZ ANGELICA"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-002
    nombre: "SEGOVIA MARIELA"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-003
    nombre: "ZAISER EVANGELINA"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-004
    nombre: "MACIEL JOSE"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-005
    nombre: "BHOLE MARIA JOSEFINA"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-006
    nombre: "PEREZ CARMEN"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-007
    nombre: "LUGO LISANDRO AGUSTIN"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-008
    nombre: "CORDOBA ALEJANDRO"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-009
    nombre: "FERNADEZ RAMON ALBERTO"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null

  - id: CONT-MOCK-PAC-010
    nombre: "PERALTA LUCAS"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: pacientes
    dni: null
    email: null
    telefono: null
```

---

## 1.3 MÉDICOS

```yaml
doctors:

  - id: CONT-MOCK-MED-001
    nombre: "ARECO RODOLFO"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-002
    nombre: "DEL BUONO MARCELO"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-003
    nombre: "VERA OSCAR"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-004
    nombre: "JUAN PABLO THOUET"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-005
    nombre: "ANDRES SOLIS"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-006
    nombre: "SANCHEZ GONZALO"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-007
    nombre: "CIVETTA JORGE LUIS"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null

  - id: CONT-MOCK-MED-008
    nombre: "SOSA BAEZ ROMINA BEATRIZ"
    tipoPersona: fisica
    tipoContacto: cliente
    grupo: medicos
    matricula: null
    especialidad: null
    email: null
    telefono: null
```

---

# 2. CIRUGÍAS

```yaml
surgeries:

  - id: CX-MOCK-7715
    sourceExpediente: "7715"
    visibleNumber: "CX-MOCK-7715"
    patientContactId: CONT-MOCK-PAC-001
    doctorContactId: CONT-MOCK-MED-001
    payerContactId: CONT-MOCK-PAG-001
    institutionContactId: null
    paciente: "RODRIGUEZ ANGELICA"
    medico: "ARECO RODOLFO"
    cliente: "IASEP - INSTITUTO ASISTENCIA SOCIAL PARA EMPLEADOS PUBLICOS"
    institucion: null
    surgeryDate: "2026-10-06"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "R-21449/2026"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 850000.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7713
    sourceExpediente: "7713"
    visibleNumber: "CX-MOCK-7713"
    patientContactId: CONT-MOCK-PAC-002
    doctorContactId: CONT-MOCK-MED-002
    payerContactId: CONT-MOCK-PAG-002
    institutionContactId: null
    paciente: "SEGOVIA MARIELA"
    medico: "DEL BUONO MARCELO"
    cliente: "PREVENCION ART"
    institucion: null
    surgeryDate: "2026-10-08"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "3059293"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 630763.60
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7708
    sourceExpediente: "7708"
    visibleNumber: "CX-MOCK-7708"
    patientContactId: CONT-MOCK-PAC-003
    doctorContactId: CONT-MOCK-MED-002
    payerContactId: CONT-MOCK-PAG-002
    institutionContactId: null
    paciente: "ZAISER EVANGELINA"
    medico: "DEL BUONO MARCELO"
    cliente: "PREVENCION ART"
    institucion: null
    surgeryDate: "2026-10-05"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "3011121"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 529423.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7705
    sourceExpediente: "7705"
    visibleNumber: "CX-MOCK-7705"
    patientContactId: CONT-MOCK-PAC-004
    doctorContactId: CONT-MOCK-MED-003
    payerContactId: CONT-MOCK-PAG-002
    institutionContactId: null
    paciente: "MACIEL JOSE"
    medico: "VERA OSCAR"
    cliente: "PREVENCION ART"
    institucion: null
    surgeryDate: "2026-10-07"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "3060248"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 549462.70
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7704
    sourceExpediente: "7704"
    visibleNumber: "CX-MOCK-7704"
    patientContactId: CONT-MOCK-PAC-005
    doctorContactId: CONT-MOCK-MED-004
    payerContactId: CONT-MOCK-PAG-003
    institutionContactId: null
    paciente: "BHOLE MARIA JOSEFINA"
    medico: "JUAN PABLO THOUET"
    cliente: "IOSCOR - INSTITUTO DE OBRA SOCIAL DE LA PROVINCIA DE C"
    institucion: null
    surgeryDate: "2026-10-07"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "880-1275-2026"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 344840.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7696
    sourceExpediente: "7696"
    visibleNumber: "CX-MOCK-7696"
    patientContactId: CONT-MOCK-PAC-006
    doctorContactId: CONT-MOCK-MED-005
    payerContactId: CONT-MOCK-PAG-001
    institutionContactId: null
    paciente: "PEREZ CARMEN"
    medico: "ANDRES SOLIS"
    cliente: "IASEP - INSTITUTO ASISTENCIA SOCIAL PARA EMPLEADOS PUBLICOS"
    institucion: null
    surgeryDate: "2026-10-28"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "P-021323/2026"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 5600000.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7687
    sourceExpediente: "7687"
    visibleNumber: "CX-MOCK-7687"
    patientContactId: CONT-MOCK-PAC-007
    doctorContactId: CONT-MOCK-MED-006
    payerContactId: CONT-MOCK-PAG-004
    institutionContactId: null
    paciente: "LUGO LISANDRO AGUSTIN"
    medico: "SANCHEZ GONZALO"
    cliente: "ASOCIART SA ASEGURADORA DE RIESGOS DEL TRABAJO"
    institucion: null
    surgeryDate: "2026-10-06"
    surgeryTime: null
    estadoFuente: "EN TRÁNSITO"
    cxStatus: "En tránsito"
    authorizationNumber: "17-220949"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 1175000.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7685
    sourceExpediente: "7685"
    visibleNumber: "CX-MOCK-7685"
    patientContactId: CONT-MOCK-PAC-008
    doctorContactId: CONT-MOCK-MED-007
    payerContactId: CONT-MOCK-PAG-002
    institutionContactId: null
    paciente: "CORDOBA ALEJANDRO"
    medico: "CIVETTA JORGE LUIS"
    cliente: "PREVENCION ART"
    institucion: null
    surgeryDate: "2026-10-15"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "3035418"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 1404852.90
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7682
    sourceExpediente: "7682"
    visibleNumber: "CX-MOCK-7682"
    patientContactId: CONT-MOCK-PAC-009
    doctorContactId: CONT-MOCK-MED-002
    payerContactId: CONT-MOCK-PAG-005
    institutionContactId: null
    paciente: "FERNADEZ RAMON ALBERTO"
    medico: "DEL BUONO MARCELO"
    cliente: "LA SEGUNDA ART"
    institucion: null
    surgeryDate: "2026-10-05"
    surgeryTime: null
    estadoFuente: "PENDIENTE"
    cxStatus: "Pendiente"
    authorizationNumber: "1355974"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 1296000.00
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null

  - id: CX-MOCK-7681
    sourceExpediente: "7681"
    visibleNumber: "CX-MOCK-7681"
    patientContactId: CONT-MOCK-PAC-010
    doctorContactId: CONT-MOCK-MED-008
    payerContactId: CONT-MOCK-PAG-005
    institutionContactId: null
    paciente: "PERALTA LUCAS"
    medico: "SOSA BAEZ ROMINA BEATRIZ"
    cliente: "LA SEGUNDA ART"
    institucion: null
    surgeryDate: "2026-10-06"
    surgeryTime: null
    estadoFuente: "EN TRÁNSITO"
    cxStatus: "En tránsito"
    authorizationNumber: "1378850"
    authorizationDate: null
    classification: null
    description: null
    totalPR: 483698.10
    totalFV: 0.00
    vendedor: null
    instrumentador: null
    localidad: null
    provincia: null
```

---

# 3. PRESUPUESTOS / MATERIAL AUTORIZADO

```yaml
presupuestos:

  - id: PR-MOCK-7715
    surgeryId: CX-MOCK-7715
    currency: ARS
    total: 850000.00
    authorizationNumber: "R-21449/2026"
    items:
      - description: "PLACA PARA TIBIA PROXIMAL DE 3.5/4.5 EN T Y L"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "TORNILLOS CANULADOS"
        quantity: 2
        unit: "u"
        unitPrice: null
      - description: "PAR DE MULETA"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "INMOVILIZADOR DE RODILLA"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7713
    surgeryId: CX-MOCK-7713
    currency: ARS
    total: 630763.60
    authorizationNumber: "3059293"
    items:
      - description: "PLACA BLOQUEADA ANATOMICA 3.5 PARACLAVICULA"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7708
    surgeryId: CX-MOCK-7708
    currency: ARS
    total: 529423.00
    authorizationNumber: "3011121"
    items:
      - description: "ARPON 5MM DOBLE SUTURA FIBER"
        quantity: 3
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7705
    surgeryId: CX-MOCK-7705
    currency: ARS
    total: 549462.70
    authorizationNumber: "3060248"
    items:
      - description: "PLACA VOLAR DE TITANIO 3.5/2.7 BLOQUEADA"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7704
    surgeryId: CX-MOCK-7704
    currency: ARS
    total: 344840.00
    authorizationNumber: "880-1275-2026"
    items:
      - description: "CLAVO GAMMA"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7696
    surgeryId: CX-MOCK-7696
    currency: ARS
    total: 5600000.00
    authorizationNumber: "P-021323/2026"
    items:
      - description: "REEMPLAZO TOTAL DE RODILLA DERECHA ESTABILIZADA POSTERIOR"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "HEMOSUCTOR"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "CEMENTO QUIRURGICO CON ANTIBIOTICO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7687
    surgeryId: CX-MOCK-7687
    currency: ARS
    total: 1175000.00
    authorizationNumber: "17-220949"
    items:
      - description: "CLAVO ACERROJADO CANULADO FRESADO PARA FEMUR"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "CLAVIJAS"
        quantity: 2
        unit: "u"
        unitPrice: null
      - description: "MOTOR"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7685
    surgeryId: CX-MOCK-7685
    currency: ARS
    total: 1404852.90
    authorizationNumber: "3035418"
    items:
      - description: "ENDOBOTON AJUSTABLE CON TORNILLO INTERFERENCIAL"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "PUNTA SHAVER 4.5"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SUTURA FIBER ALTA RESISENCIA"
        quantity: 4
        unit: "u"
        unitPrice: null
      - description: "CANULA"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "GRAPA"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7682
    surgeryId: CX-MOCK-7682
    currency: ARS
    total: 1296000.00
    authorizationNumber: "1355974"
    items:
      - description: "ARPON DE TITANIO 5MM"
        quantity: 4
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null

  - id: PR-MOCK-7681
    surgeryId: CX-MOCK-7681
    currency: ARS
    total: 483698.10
    authorizationNumber: "1378850"
    items:
      - description: "PLACA TITANIO DISTAL PERONE"
        quantity: 1
        unit: "u"
        unitPrice: null
      - description: "SET DE COLOCACION A PRESTAMO"
        quantity: 1
        unit: "u"
        unitPrice: null
```

---

# 4. RELACIONES ENTRE ENTIDADES

```yaml
relations:

  CX-MOCK-7715:
    patient: CONT-MOCK-PAC-001
    doctor: CONT-MOCK-MED-001
    payer: CONT-MOCK-PAG-001
    presupuesto: PR-MOCK-7715

  CX-MOCK-7713:
    patient: CONT-MOCK-PAC-002
    doctor: CONT-MOCK-MED-002
    payer: CONT-MOCK-PAG-002
    presupuesto: PR-MOCK-7713

  CX-MOCK-7708:
    patient: CONT-MOCK-PAC-003
    doctor: CONT-MOCK-MED-002
    payer: CONT-MOCK-PAG-002
    presupuesto: PR-MOCK-7708

  CX-MOCK-7705:
    patient: CONT-MOCK-PAC-004
    doctor: CONT-MOCK-MED-003
    payer: CONT-MOCK-PAG-002
    presupuesto: PR-MOCK-7705

  CX-MOCK-7704:
    patient: CONT-MOCK-PAC-005
    doctor: CONT-MOCK-MED-004
    payer: CONT-MOCK-PAG-003
    presupuesto: PR-MOCK-7704

  CX-MOCK-7696:
    patient: CONT-MOCK-PAC-006
    doctor: CONT-MOCK-MED-005
    payer: CONT-MOCK-PAG-001
    presupuesto: PR-MOCK-7696

  CX-MOCK-7687:
    patient: CONT-MOCK-PAC-007
    doctor: CONT-MOCK-MED-006
    payer: CONT-MOCK-PAG-004
    presupuesto: PR-MOCK-7687

  CX-MOCK-7685:
    patient: CONT-MOCK-PAC-008
    doctor: CONT-MOCK-MED-007
    payer: CONT-MOCK-PAG-002
    presupuesto: PR-MOCK-7685

  CX-MOCK-7682:
    patient: CONT-MOCK-PAC-009
    doctor: CONT-MOCK-MED-002
    payer: CONT-MOCK-PAG-005
    presupuesto: PR-MOCK-7682

  CX-MOCK-7681:
    patient: CONT-MOCK-PAC-010
    doctor: CONT-MOCK-MED-008
    payer: CONT-MOCK-PAG-005
    presupuesto: PR-MOCK-7681
```

---

# 5. DATOS DE FACTURACIÓN

```yaml
facturacion:

  - surgeryId: CX-MOCK-7715
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7713
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7708
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7705
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7704
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7696
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7687
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7685
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7682
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null

  - surgeryId: CX-MOCK-7681
    totalFV: 0.00
    facturaNumero: null
    fechaFactura: null
    vencimientoFactura: null
```

---

# 6. CAMPOS NO DISPONIBLES EN LA FUENTE

```yaml
missingFields:
  - paciente.dni
  - paciente.telefono
  - paciente.email
  - medico.matricula
  - medico.telefono
  - medico.email
  - cliente.cuit
  - cliente.telefono
  - cliente.email
  - institucion
  - localidad
  - provincia
  - vendedor
  - instrumentador
  - horaCirugia
  - clasificacion
  - fechaAutorizacion
  - precioUnitarioMaterial
  - ivaMaterial
  - codigoArticulo
  - lote
  - serie
  - vencimiento
  - numeroPresupuesto
  - numeroFactura
  - fechaFactura
  - vencimientoFactura
```

---

# 7. REGLAS PARA IMPORTACIÓN MOCK

```yaml
importRules:
  source: "Listado de Cirugías 02/10/2026"
  mode: "mock"
  preserveSourceValues: true
  generateMissingBusinessData: false
  normalizeDates: true
  normalizeMoney: true
  deduplicateContacts: true
  allowNullForMissingFields: true

  relations:
    surgery_patient: required
    surgery_doctor: required
    surgery_payer: required
    surgery_presupuesto: required
    surgery_institution: optional

  idStrategy:
    contacts: "CONT-MOCK-{TIPO}-{NNN}"
    surgeries: "CX-MOCK-{EXPEDIENTE}"
    presupuestos: "PR-MOCK-{EXPEDIENTE}"
```
