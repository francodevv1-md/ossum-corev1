# Informe de avance — OSSUM COR

**Fecha de corte:** 14 de septiembre de 2026  
**Destinatarios:** Gerencia y dirección del proyecto  
**Naturaleza:** análisis de producto y evidencia técnica; no es una proyección de plazos ni una certificación productiva.

## Cómo leer este informe

El estado se clasificó con evidencia del repositorio actual, migraciones, pruebas, verificaciones independientes, handoffs, Knowledge y commits. Una pantalla o un documento de diseño no se consideró “terminado” por sí solo.

| Etiqueta | Significado |
| --- | --- |
| **Terminado y validado en DEV** | Implementación persistida y/o ejecutable con validación concreta registrada. No implica producción. |
| **Implementado, pendiente de integración** | Existe código y contrato, pero falta conectarlo al circuito completo, datos reales o QA final. |
| **En desarrollo** | Hay trabajo activo, artefactos o capacidades parciales; no es una promesa funcional completa. |
| **Diseño validado** | Se acordó el modelo y se revisó, sin que ello pruebe una operación real. |
| **Investigado** | Se obtuvo conocimiento utilizable, pero todavía no se convirtió en migración o regla ejecutable. |
| **Bloqueado/dependiente** | Requiere información, decisión de negocio, datos o autorización fuera del paquete técnico. |

> **Advertencia de lectura:** el repositorio está ampliamente modificado y con artefactos no confirmados en Git. El último commit confirmado es del 3 de septiembre; la auditoría encontró 143 archivos trackeados modificados, 13 staged y 371 rutas sin seguimiento. Por ello este informe distingue evidencia consolidada de cambios actuales de working tree. Una validación DEV documentada de un paquete no equivale todavía a un baseline integrado, versionado y apto para release.

---

# Parte I — Informe completo de avance

## 1. Resumen ejecutivo

OSSUM COR es hoy un ERP operativo multiempresa en construcción para distribuidoras quirúrgicas, ortopedias y comercios de salud. Su propósito no es digitalizar formularios aislados: es poder seguir un caso quirúrgico desde el contacto inicial hasta el cobro, incluyendo preparación física, despacho, consumo, devolución, documentación y trazabilidad.

El avance más importante es el cambio de enfoque. El proyecto comenzó con un prototipo de interfaz rico en pantallas y datos locales; hoy tiene una base PostgreSQL/Prisma, servicios de servidor, acceso por empresa, auditoría, autenticación operativa de desarrollo y varios circuitos persistidos y probados en DEV. Paralelamente se avanzó en stock, cajas, control físico, despacho atómico y conciliación con reglas de integridad que no existían en la maqueta inicial.

No se está trasladando XAdmin pantalla por pantalla. Se está reconstruyendo su lógica operativa dentro de una arquitectura nueva, separando lo que XAdmin aporta como conocimiento y datos de lo que no conviene perpetuar: relaciones implícitas, campos sobrecargados, dependencias de texto, estados ambiguos y comportamiento no documentado.

La etapa actual está centrada, correctamente, en consolidar reglas, backend, datos y circuitos. Agregar pantallas sin resolver esas bases produciría una interfaz más moderna con los mismos riesgos operativos históricos: doble ejecución, stock ambiguo, material sin lineage, permisos débiles y facturación desconectada del hecho operativo.

**Conclusión ejecutiva:** existe avance funcional real en DEV, especialmente en la fundación de datos, Contactos, el expediente quirúrgico, presupuesto/remito, trazabilidad documental y el circuito físico acotado de Cajas/Stock. Aún no existe evidencia para afirmar reemplazo total de XAdmin, operación productiva, migración histórica completa ni autenticación/seguridad productivas.

## 2. Evolución del proyecto por hitos

| Hito | Evolución lograda | Estado sustentado |
| --- | --- | --- |
| **1. Prototipo y aprendizaje operativo** | Se modelaron Cirugías, Expediente, Contactos, Presupuestos, Remitos, Consumos, Facturación y tableros en UI. Se confirmó que el prototipo sirve como referencia UX, no como fuente de verdad. | Base histórica; persisten áreas locales/mock. |
| **2. Definición de dominio y gobierno** | Se ordenó Knowledge V2, el flujo canónico y la Cirugía/Expediente como centro. Se documentaron límites entre presupuesto, remito, consumo, devolución, factura y cobro. | Terminado documentalmente. |
| **3. Backend foundation** | Se reemplazó el modelo demo por multiempresa, contactos, cirugía y auditoría; se conectó PostgreSQL/Supabase con Prisma y se agregaron servicios/API. | Terminado y validado en DEV para el alcance fundacional. |
| **4. Identidad y acceso DEV** | Se incorporó Supabase Auth, Bearer hacia API, mapeo al usuario interno y control por empresa. | Operativo en DEV; diseño productivo pendiente. |
| **5. Circuito comercial-operativo** | Se persistieron y conectaron versiones de presupuesto, remitos, consumos, devoluciones, comparativa, documentación, facturación operativa y pagos. | Avanzado en DEV; integración completa y productiva pendiente. |
| **6. Artículos, stock y cajas** | Se pasó de categorías informales a una base con artículos, taxonomía, trazabilidad, posiciones, reservas, evidencia y unidades físicas; se diseñó una migración segura de información XAdmin. | Parte implementada/validada en DEV; migración histórica pendiente. |
| **7. Preparación física y despacho** | Se incorporaron asignación de caja, reserva por posición, lotes/unidades identificadas, control, re-control, despacho y lineage inmutable. | Validado en paquetes DEV acotados. |
| **8. Consumo, devolución y conciliación** | Se incorporó una ruta de conciliación para líneas físicas despachadas, con cuarentena de retornos no identificados y cierre/reapertura controlada. | Validación PostgreSQL DEV documentada para C14; aún no es baseline integrado en Git. |
| **9. Logística y UX operativa** | Se construyeron proyecciones de lectura y superficies de Logística que consumen capacidades derivadas del servidor; se sumó geografía y, en trabajo actual, visibilidad GPS de desarrollo. | Logística de expediente: avanzada DEV. GPS: trabajo actual, no certificado como cierre global ni commit. |

La cronología revela una maduración normal: primero se definió qué debía representar el sistema; luego se creó autoridad backend; finalmente se atacaron los puntos de mayor riesgo operativo —material físico, concurrencia y trazabilidad— antes de declarar una migración completa.

## 3. Qué está realmente terminado

### 3.1 Fundación multiempresa, PostgreSQL y servicios

**Problema que resuelve.** Evita que cada pantalla mantenga su propia versión de la realidad y habilita separación entre empresas.

**Implementado.** PostgreSQL con Prisma, entidades de organización/empresa/sucursal/usuario/acceso, auditoría y servicios/API server-side. Las operaciones se orientan a `companyId` y a validación de acceso antes de leer o modificar.

**Validaciones.** La migración inicial quedó aplicada en DEV; existen validaciones Prisma, TypeScript/build y smoke de rutas protegidas registrados en el worklog. El schema actual contiene relaciones e índices compuestos de empresa en entidades operativas.

**Dependencias y límite.** Es una base DEV; no certifica configuración productiva, backup/restore, monitoreo ni operación con datos reales.

**Estado:** **terminado y validado en DEV** para la fundación; **no listo para producción**.

### 3.2 Contactos como autoridad backend

**Problema que resuelve.** Evita duplicar pacientes, médicos, instituciones y pagadores en formularios o estado local.

**Implementado.** Contactos por empresa con código, roles, grupos, dirección principal, notas y datos contextuales; selectores reutilizables para Nueva Cirugía; validación, servicio, API y auditoría.

**Validaciones.** Migración aplicada a la DB DEV descartable; 28 pruebas focalizadas, typecheck, build y browser QA autenticado. La prueba verificó búsqueda, edición y selección desde Nueva Cirugía contra API.

**Dependencias y límite.** La calidad y migración histórica total de contactos XAdmin todavía no están demostradas.

**Estado:** **terminado y validado en DEV / listo para integración controlada**, no producción.

### 3.3 Cirugía/Expediente y documentación operativa

**Problema que resuelve.** Reúne el caso en vez de dispersarlo entre módulos y personas.

**Implementado.** Cirugía con número visible, fechas, estado clínico/administrativo separado del estado de preparación, asignaciones de contacto y APIs. El expediente concentra presupuesto, remitos, consumos, devoluciones, trazabilidad derivada, documentación y acciones vinculadas. La documentación tiene persistencia, inicialización y transiciones auditadas.

**Validaciones.** Hay pruebas de servicios, rutas y documentación transaccional; se registró un E2E del flujo DEV que pasó una vez. El E2E posterior quedó bloqueado por token de autenticación expirado, lo cual no es una regresión del flujo pero sí impide presentar una certificación continua.

**Dependencias y límite.** La pantalla principal de Cirugías conserva compatibilidades de UI/estado local y es sensible; el plan histórico de “no refactor abierto” sigue siendo prudente. No corresponde afirmar que toda la experiencia de Cirugías sea backend-first.

**Estado:** **avanzado en DEV**, con integración parcial entre UI legacy y autoridad server.

### 3.4 Presupuestos, remitos, consumos, devoluciones y comparativa

**Problema que resuelve.** Separa hechos que antes podían confundirse: lo cotizado, lo enviado, lo usado, lo devuelto y lo facturable no son lo mismo.

**Implementado.** Modelos y servicios company-scoped para Presupuesto y versiones; Remito con ítems, estados, destinatario/logística y snapshot; Consumo ligado obligatoriamente a un Remito; Devolución como entidad propia; trazabilidad read-only derivada de eventos; comparativa operacional. Hay impresión/PDF de documentos y contratos de lectura/mutación.

**Validaciones.** El repositorio contiene suites específicas de presupuesto, remito, consumo, devolución y trazabilidad. El estado histórico registra pruebas focalizadas exitosas; la evidencia más robusta del despacho físico y de consumo/devolución está detallada más abajo.

**Dependencias y límite.** Algunos enlaces V0 permanecen como compatibilidad o FK blanda (`itemId`, referencias de presupuesto y algunas relaciones históricas). Eso permite transición, pero no debe confundirse con el modelo final plenamente normalizado. El alcance no cubre toda forma posible de remito ni todos los casos de consumo.

**Estado:** **avanzado en DEV**, parcialmente integrado; no listo para declarar circuito productivo general.

### 3.5 Cajas, preparación física, despacho atómico y conciliación

**Problema que resuelve.** Un control de caja no puede ser un simple cambio visual de estado: debe preservar qué material físico se seleccionó, qué lote/serie salió, quién lo controló, qué cambió, qué se despachó y qué volvió.

**Implementado.** El schema actual incluye fórmulas y versiones de cajas, asignaciones, preparaciones, correlaciones de reserva, controles, diferencias, despacho, confirmaciones de consumo/devolución, condición actual y reconciliación. Se implementaron reservas por posición/unidad, snapshots inmutables por asignación, liberaciones explícitas, control/re-control y despacho de un remito quirúrgico mediante una transacción serializable y un contrato de idempotencia.

**Validaciones.**

- La preparación física probó posiciones múltiples, lote/unidad identificada, idempotencia, sobreasignación, aislamiento de escritores de control/despacho y liberación explícita.
- La verificación independiente de despacho atómico reportó 8/8 criterios y 27 pruebas: bloqueo por diferencias/re-control, consolidación comercial sin perder líneas físicas y supervivencia de trace inmutable ante cambios posteriores del origen.
- La conciliación de consumo/devolución reportó 11/11 requisitos; incluyó prueba concurrente real en PostgreSQL: un ganador, un replay de misma intención, conflicto ante intención distinta y rollback sin escrituras parciales.

**Dependencias y límite.** Este es un circuito de alta integridad pero acotado al dominio Cajas/Stock/C14 y a DEV. No sustituye todavía una migración integral de inventario ni autoriza inferir historia de remitos antiguos. La UI de Cajas tuvo buenas pruebas focalizadas, pero su smoke visual autenticado quedó pendiente en su paquete.

**Estado:** **implementado y con validación DEV documentada para paquetes acotados; pendiente de integración/versionado como baseline, no apto para producción ni migración histórica masiva**.

### 3.6 Artículos y trazabilidad base

**Problema que resuelve.** Evita usar descripciones, códigos o categorías como si fueran identidad física y evita asumir que “Fabricado” o “Reventa” definen comportamiento operativo.

**Implementado.** Article master, identificadores GS1/AI-22, catálogos de categoría/familia clínica/marca/fabricante/línea, aliases y tablas de staging/mapping XAdmin. Para Stock/Cajas el schema contempla depósito/contexto, lote, unidad identificada, posición, reserva, evidencia y proyecciones.

**Validaciones.** Hubo migraciones y pruebas de artefacto para taxonomía de artículos, stock/reservas y mantenimiento de cajas. La migración de taxonomía fue aplicada a DEV descartable. Existe evidencia de un diseño revisado para preservar staging y no perder filas.

**Dependencias y límite.** No hay evidencia de importación/mapeo definitivo de todos los artículos XAdmin ni de inventario de apertura real. La taxonomía sigue requiriendo curaduría humana.

**Estado:** **avanzado en DEV; migración de datos reales pendiente**.

### 3.7 Facturación y pagos operativos

**Problema que resuelve.** Separa la verdad operativa y financiera de la emisión fiscal externa, y permite vincular cobros a facturas de manera explícita.

**Implementado.** Invoice, items, Payment e imputaciones están en el schema; los commits y Task Brief evidencian UI/backend para borrador, emisión operativa no fiscal, cobro ligado a factura, anulación y fuentes pendientes de facturación.

**Validaciones.** Hay pruebas unitarias de hooks/cliente y commits de integración. El paquete autorizado exige pruebas/build, pero no se encontró un cierre de browser QA equivalente al de Contactos ni evidencia de fiscalización.

**Dependencias y límite.** El alcance excluye ARCA/AFIP, CAE, emisión fiscal, cuenta corriente completa, cobros generales/no imputados y facturas multi-cirugía. No debe comunicarse como facturación fiscal ni como módulo financiero completo.

**Estado:** **implementado en DEV, pendiente de integración y validación funcional completa**.

### 3.8 Logística, recepción y códigos

**Problema que resuelve.** Vincula la logística con el expediente y con la composición física, en vez de tratarla como una agenda aislada.

**Implementado.** Proyección de operaciones logística de sólo lectura con trazabilidad física, capacidades derivadas del servidor y resolver `none/exact/ambiguous`; workspace de Logística en Ficha CX; georreferenciación de direcciones; remitos con localizador, verificación pública de privacidad limitada y Code128/QR. El esquema también contiene recepción de mercadería y scans por unidad.

**Validaciones.** La proyección logística E1 fue verificada con 8/8 escenarios y 11 pruebas; la verificación de remitos incluye publicación/rotación/revocación y protección de acceso. Las reglas de recepción/scanning existen y cuentan con pruebas focalizadas.

**Dependencias y límite.** Órdenes de compra y reposición integrada no están completas. La visibilidad GPS actual es una extensión DEV reciente; su artefacto de propuesta sigue desactualizado frente al código y no se considera cierre productivo.

**Estado:** Logística de expediente **avanzada en DEV**; compras/recepción integral **en desarrollo**; GPS **en desarrollo/validado parcialmente DEV**.

## 4. Migración desde XAdmin

### A. Datos

XAdmin no es una única tabla limpia. La evidencia revisada incluye al menos una exportación de artículos/cajas (`CAJAS.XLS`) con 236 filas y campos como código, descripción, tipo, departamento, rubro, sección, marca y línea. También existen datos implícitos en sus operaciones: cirugía, remitos, consumo, cajas, stock, facturación y relaciones que no necesariamente están expresadas como claves confiables.

**Equivalencias ya preparadas en OSSUM COR:**

| Información XAdmin | Equivalencia OSSUM COR | Situación |
| --- | --- | --- |
| Artículo/código/descripción | Article + identificadores + catálogos | Persistencia y staging disponibles; mapeo real pendiente. |
| Marca/línea | Brand / ProductLine con aliases | Parcial; requiere curaduría. |
| Caja modelo | CajasBoxFormula + versiones | Implementado para DEV. |
| Caja física | StockIdentifiedUnit | Implementado para DEV. |
| Cirugía y actores | Surgery + Contact/SurgeryContactAssignment | Implementado parcialmente e integrado progresivamente. |
| Remito/consumo/devolución | Entidades propias y vinculadas | Implementado DEV, con compatibilidades históricas. |
| Stock y movimientos | Posiciones, reservas, evidencia y proyecciones | Implementado para alcance C13/C14; apertura/migración real pendiente. |

**Lo que aún requiere estudio:** estructura total de XAdmin, significado de campos por módulo, claves efectivas, calidad de registros históricos, duplicados, artículos sin clasificación, fórmulas de cajas, inventario físico, relaciones entre comprobantes y criterios de facturación/cobro. Ninguna de esas preguntas debe resolverse inventando conversiones automáticas.

### B. Reglas implícitas descubiertas

1. **“Fabricado” y “Reventa” no describen por sí solos el tipo operativo.** En la exportación aparecen tanto en cajas, sets, implantes, motores y descartables. No se puede inferir automáticamente que un artículo es caja, compuesto, estándar o comprable.
2. **Rubro y Sección fueron redundantes sólo en la exportación analizada.** No es evidencia para transformar esa coincidencia local en una regla global.
3. **Departamento es una señal operativa, no una categoría canónica probada.** Distingue, por ejemplo, CAJAS de implantes dentro de rubros similares, pero aún no acredita que deba ser una jerarquía de producto.
4. **Caja modelo, caja física y caja despachada son cosas distintas.** Mezclarlas impide versionar composición, reservar una unidad concreta, explicar cambios y reconciliar retornos.
5. **Un consumo pertenece a un remito concreto.** Un caso puede tener más de un remito/consumo; el expediente consolida la lectura, pero no debe destruir la relación de origen.
6. **El despacho debe preservar la composición física aceptada.** La línea comercial puede consolidarse, pero las reservas, lotes y unidades físicas necesitan mantener lineage propio.
7. **Un retorno sin identificación no debe convertirse en stock disponible por inferencia.** Debe permanecer en cuarentena hasta resolución humana.

### C. Problemas encontrados con evidencia

| Tipo | Hallazgo | Evidencia/efecto |
| --- | --- | --- |
| Regla no documentada | `Fabricado/Reventa` se usa en grupos heterogéneos. | La matriz XAdmin prohíbe derivar tipo operativo o comportamiento físico desde ese campo. |
| Dependencia de XAdmin | No existe columna `Sector` en la exportación estudiada, aunque había expectativas de usarla. | Se dejó sin mapear; se requiere exportación/evidencia autoritativa. |
| Diseño heredado | Referencias antiguas de caja/ítem son blandas. | No prueban identidad, empresa, posición, lote ni unidad física. |
| Diseño heredado | Remito, consumo y devolución pueden verse como una cadena de estados si se copia la UI. | OSSUM los separa en entidades y preserva enlaces explícitos. |
| Dato faltante | Correlaciones históricas sin snapshot de trace. | Se mantienen legibles pero se bloquea liberarlas/reemplazarlas: no se fabrica historia. |
| Calidad de datos | Marca y línea son incompletas; la línea está poblada sólo en una minoría de la muestra. | Requiere alias/mapping y revisión; no inferencia automática. |

### D. Riesgo de copiar XAdmin literalmente

Copiar tablas y pantallas trasladaría ambigüedad en vez de resolverla. Los riesgos principales serían: usar texto como identidad, cruzar empresas de forma accidental, tratar una caja física como una categoría, perder qué lote o unidad se despachó, permitir doble ejecución ante reintentos, asumir stock disponible por una devolución no controlada y convertir campos históricos ambiguos en reglas permanentes.

También se heredaría una dificultad operativa: una regla estaría repartida entre datos, pantalla y conocimiento humano. En un ERP nuevo esa regla debe estar declarada, validada y auditada en el servidor.

### E. Estrategia adoptada

XAdmin se usa como **fuente de conocimiento operativo**, **fuente de datos para estudiar** y **referencia de algunos comportamientos**. No se usa como arquitectura objetivo.

La estrategia es migración progresiva: preservar evidencia legacy sin alterar su significado, mapear automáticamente sólo lo determinístico, marcar lo ambiguo como `REVIEW_REQUIRED` o `UNMAPPED`, y recién entonces promoverlo a identidad/relación operativa en OSSUM COR. Esto protege la operación y evita que una importación convierta conjeturas en “verdad” del ERP.

## 5. Problemas importantes encontrados

| Problema | Tipo | Impacto | Causa / descubrimiento | Solución adoptada | Estado actual |
| --- | --- | --- | --- | --- | --- |
| Doble ejecución de despacho | Problema de diseño técnico | Puede duplicar salida, evidencia o auditoría. | Reintentos concurrentes no son un detalle de UI. | Comando transaccional serializable, key de idempotencia, replay/ conflicto y pruebas PostgreSQL. | Validación DEV documentada para C14; integración pendiente. |
| Concurrencia de preparación | Problema de diseño técnico | Puede sobre-reservar material. | Dos operadores pueden intentar usar la misma posición/unidad. | Locks, decremento condicional y relectura de replay. | Validado DEV en preparación física. |
| Lineage físico vs línea comercial | Regla de negocio no documentada | Se pierde qué material real salió. | Una misma línea comercial puede requerir varias asignaciones físicas. | Consolidar para el documento, mantener líneas físicas inmutables de reserva/evidencia/despacho. | Validado DEV en despacho atómico. |
| Cajas sin historia real | Problema de diseño | No permite explicar cambios, control o retorno parcial. | Caja modelo, unidad física y envío real estaban confundidos. | Fórmula versionada, unidad identificada, control, composición y dispatch/return append-only. | Avanzado/validado DEV por paquete. |
| Retorno no identificado | Regla de negocio | Riesgo de habilitar stock inexistente o errado. | No todo lo que vuelve puede asignarse automáticamente a una línea física. | Cuarentena, vínculo a evidencia y resolución explícita. | Validado DEV en fase D. |
| Relación consumo–remito incompleta | Diseño heredado | Comparativa y facturación pueden no tener origen confiable. | El store antiguo no garantizaba `remitoId`. | FK obligatoria en Consumo; lectura consolidada en cirugía. | Implementado DEV. |
| Artículos XAdmin ambiguos | Dependencia de XAdmin / dato faltante | Clasificación errónea, fórmulas o serialización falsas. | `Fabricado/Reventa`, Rubro/Sección/Departamento no expresan una taxonomía confiable. | Staging lossless, alias, estados de mapping y revisión humana. | Investigado/diseñado; importación pendiente. |
| Datos históricos sin trace suficiente | Dato faltante | No se puede recrear una liberación/reemplazo verídico. | Filas legacy no guardan snapshot completo. | Fail-closed: lectura sí; nueva mutación que fabrique trace, no. | Resuelto como protección; depende de fuente histórica. |
| Permisos dispersos | Deuda de arquitectura | Riesgo de reglas inconsistentes entre módulos. | Roles existen en guards/servicios, pero centralización completa no cerró. | API como autoridad y políticas específicas; ADR final pendiente. | Operativo DEV, deuda abierta. |
| Datos para E2E | Dependencia de entorno | Impide confirmar cadena completa continuamente. | Estado autenticado temporal venció. | Reutilizar storage state fresco, preflight y no modificar Auth por un token vencido. | E2E pasó una vez; nueva ejecución bloqueada por sesión. |
| UI que aparenta autoridad | Problema de transición | Puede hacer creer que un módulo ya está integrado. | Persisten componentes/mock/Zustand de la etapa prototipo. | Etiquetar fuentes, migrar por slices y no asumir pantalla = backend. | Deuda en áreas todavía no migradas. |

## 6. Demoras y por qué ocurren

No todas las demoras son fallas de ejecución. En este proyecto una parte relevante del tiempo reduce riesgo antes de que el riesgo se convierta en un problema productivo.

### Demora productiva: descubrir la identidad real del material

- **Qué pasó:** se comprobó que los valores XAdmin no permiten convertir artículos en “caja”, “estándar” o “serializado” de forma automática.
- **Riesgo evitado:** cargar fórmulas, unidades físicas o reglas de stock sobre artículos incorrectamente interpretados.
- **Solución surgida:** separar tipo operativo, categoría, familia clínica, marca/línea, fórmula de caja y política de trazabilidad; conservar el origen legacy.
- **Pendiente:** curaduría/mapping y calidad de datos de la fuente completa.

### Retrabajo necesario: de preparación visual a preparación física verificable

- **Qué pasó:** una preparación basada sólo en estado o cantidad no alcanza cuando hay posiciones, lotes, unidades identificadas, reemplazos y re-control.
- **Riesgo evitado:** despachar material diferente del controlado, o permitir cambiar composición después del control sin exigir revisión.
- **Solución surgida:** snapshots inmutables, liberación explícita, control invalidable y bloqueo de despacho ante diferencias/re-control.
- **Pendiente:** extender este rigor de modo uniforme a todos los caminos operativos, no sólo al circuito aprobado de cajas.

### Complejidad técnica legítima: atomicidad, concurrencia e idempotencia

- **Qué pasó:** se debió demostrar qué ocurre con dos comandos iguales o distintos compitiendo sobre el mismo recurso.
- **Riesgo evitado:** duplicar movimientos, auditoría, evidencia o reservas; o dejar registros a medias ante una falla.
- **Solución surgida:** transacciones, invariantes de servidor, replays semánticos, conflictos por intención distinta y pruebas concurrentes en PostgreSQL.
- **Pendiente:** completar cobertura de integración donde aún hay pruebas unitarias/mock y operar esto bajo condiciones de producción futuras.

### Dependencia externa: autenticación y entorno de pruebas

- **Qué pasó:** el E2E integrado depende de una sesión DEV válida. Una ejecución posterior falló en preflight por `invalid_auth_token`.
- **Riesgo evitado:** “arreglar” Auth para hacer pasar una prueba que en realidad estaba bloqueada por expiración de sesión.
- **Solución surgida:** política de sesión reutilizable y preflight; tratar el caso como bloqueo de entorno, no como regresión funcional.
- **Pendiente:** regenerar sesión manual cuando se necesite nueva validación E2E.

### Retrabajo útil: integridad del replay C14

- **Qué pasó:** una revisión detectó que un replay podía aceptar el resultado sin revalidar la totalidad de la evidencia persistida.
- **Riesgo evitado:** tratar como válido un despacho cuyo lineage/evidencia hubiese sido alterado o estuviese incompleto.
- **Solución surgida:** un paquete posterior de working tree implementó comparación de auditoría, aceptación, evidencia, reservas, despacho, efectos, tiempos y líneas; ante divergencia falla cerrado.
- **Pendiente:** no se cerró como baseline integrado: falta revisión independiente y prueba de integración PostgreSQL específica para esa revalidación. Hasta entonces, el HIGH registrado por el Core E2E se mantiene como deuda abierta del estado global.

## 7. Soluciones y mejoras conseguidas

| Antes / problema heredado | Nuevo enfoque OSSUM COR |
| --- | --- |
| Estado implícito en pantalla o convención humana | Estados, transiciones y validadores explícitos en servicios. |
| Datos de operación repartidos entre formulario, store y documentos | Cirugía/Expediente como vista que compone fuentes persistidas. |
| Stock resumido o referencias blandas | Posición, reserva, evidencia y proyección con alcance físico explícito. |
| Caja entendida como un rótulo | Fórmula versionada, unidad física, preparación/control y dispatch como conceptos separados. |
| Reintento potencialmente duplicado | Idempotencia con misma intención = replay y distinta intención = conflicto. |
| Línea comercial como único detalle | Consolidación comercial sin borrar lineage físico de lote/unidad/reserva. |
| Retorno ambiguo incorporado automáticamente | Cuarentena y resolución humana para retorno no identificado. |
| Historial mutable | Snapshots y evidencia append-only para controles, dispatches, retornos y conciliación. |
| Códigos/QR con riesgo de exponer IDs | Localizador interno autorizado y verificación pública de proyección mínima, con tokens opacos. |
| Acciones sólo condicionadas por la UI | Chequeo de empresa, rol/capacidad y validación en API/servicio. |
| Facturación confundida con fiscalización | Facturación operativa propia; motor fiscal externo futuro y backend-only. |

Estas mejoras deben entenderse como capacidades DEV comprobadas o diseñadas según cada fila, no como certificación de reemplazo global.

## 8. Decisiones de arquitectura importantes

| Decisión | Por qué importa para el negocio |
| --- | --- |
| **Cirugía/Expediente como centro** | Permite responder en un mismo lugar qué se pidió, preparó, envió, consumió, devolvió, documentó, facturó y cobró. |
| **Backend y PostgreSQL como fuente de verdad** | Evita que el navegador o una pantalla distinta decidan la realidad operativa. |
| **Multiempresa desde el modelo** | Protege aislamiento de datos y habilita operar más de una empresa sin mezclar casos. |
| **Servicios server-side, no lógica crítica en componentes** | Las reglas de despacho, permisos y stock quedan reutilizables, auditables y menos expuestas a errores de UI. |
| **Auditoría y evidencia de dominio** | Permite investigar quién hizo qué y distinguir un evento técnico de un hecho operativo histórico. |
| **Transacciones e idempotencia** | Protegen contra doble clic, red inestable, reintentos y dos operadores trabajando al mismo tiempo. |
| **Stock por posición/custodia y trazabilidad híbrida** | Evita sumar como si fueran equivalentes materiales de depósitos, tránsito, lotes o unidades físicas distintas. |
| **Migración progresiva** | Permite validar un slice sin reemplazar de golpe una operación viva ni inventar la historia faltante. |
| **XAdmin como referencia, no modelo a copiar** | Conserva el aprendizaje operativo sin congelar sus ambigüedades y deuda histórica. |
| **Integraciones externas periféricas** | OCR, fiscalización o rastreo pueden asistir, pero la lógica operativa y sus decisiones continúan siendo del ERP. |

## 9. Cambios de criterio importantes

| Decisión inicial | Qué se descubrió | Nueva decisión | Por qué mejora |
| --- | --- | --- | --- |
| Prototipo/localStorage como camino rápido | La UI no garantiza integridad, aislamiento ni trazabilidad. | Migración por slices a API/Prisma/PostgreSQL. | Permite avanzar sin reescribir todo, pero con autoridad backend progresiva. |
| Un estado de cirugía | Estado clínico/administrativo y preparación material son dimensiones distintas. | `cxStatus` y `prepStatus` separados. | Evita que un estado tape al otro. |
| Copiar categorías/tipos XAdmin | Sus campos son heterogéneos e incompletos. | Separar categoría, familia clínica, tipo operativo, fórmula y política de trace. | Evita clasificaciones falsas. |
| Caja como entidad/saldo simple | Se necesita historia, fórmula, unidad física, control y retorno. | Modelo con evidencia inmutable y condición actual derivada. | Permite explicar y controlar el ciclo real. |
| Consumir/devolver desde el estado del remito | El remito es lo enviado, no necesariamente lo usado o devuelto. | Entidades propias vinculadas a remito. | Habilita comparativa, diferencias y facturación correctamente. |
| QR con IDs internos | Un código visible puede filtrar datos o convertirse en permiso implícito. | Locators/tokens separados, autorización y proyección pública mínima. | Mantiene utilidad operacional sin exponer información sensible. |
| “Replay” como sólo no duplicar | Un replay puede ocultar evidencia alterada/incompleta. | Se implementó una revalidación amplia en un paquete DEV aún no integrado. | Es la dirección correcta; requiere cierre y prueba de integración antes de considerarla garantía global. |

## 10. Estado por área

| Área | Estado | Avance comprobable | Pendiente principal | Riesgo | Próximo hito |
| --- | --- | --- | --- | --- | --- |
| Cirugías | Avanzado | Modelo, APIs, número visible, expediente y pruebas; E2E DEV una vez exitoso. | Reducir compatibilidades UI/local y validar cadena continua. | UI sensible y E2E dependiente de sesión. | Core flow autenticado fresco. |
| Contactos | Sólido | Backend autoritativo, migración DEV, pruebas y browser QA. | Calidad/importación histórica. | Duplicados y reglas legacy. | Mapping/limpieza de datos. |
| Artículos | Avanzado | Master, catálogos, identificadores y staging XAdmin. | Mapping humano y carga real. | Tipos legacy ambiguos. | Catálogo/matriz aprobada por dato. |
| Stock | Avanzado | Posiciones, reservas, evidencia, proyecciones y pruebas de integridad en paquetes C13/C14. | Apertura de inventario, migración y operación general. | No confundir DEV con stock productivo. | Plan de datos y reconciliación inicial. |
| Cajas | En desarrollo | Fórmulas, unidades, preparación, control, dispatch, retornos y conciliación acotada, con pruebas DEV documentadas. | Integrar/versionar baseline, QA transversal/UI y compatibilidad legacy. | Historia legacy incompleta, HIGH global de replay y alta criticidad. | Cerrar baseline y luego piloto progresivo. |
| Preparación | Avanzado | Reservas físicas, snapshots, reemplazos/release y re-control. | Cobertura de todos los flujos no-Caja. | Sobreasignación si se saltea el servicio. | Consolidar preparación–remito. |
| Remitos | Avanzado | Persistencia, estados, impresión, verificación y despacho atómico acotado. | Normalizar enlaces V0 y casos no quirúrgicos. | Soft references de transición. | Validar escenarios operativos completos. |
| Consumo | En desarrollo | Entidad vinculada a Remito; confirmación física C14. | Integración total de casos generales. | Diferencia entre consumo UI y evidencia física. | Core flow completo por caso. |
| Devoluciones | En desarrollo | Entidad propia y reconciliación/retorno físico C14. | Procesos generales y QA end-to-end. | Retornos sin identidad. | Piloto con cuarentena/resolución. |
| Logística | Avanzado | Proyección server-side, Ficha CX, geografía y pruebas. | Flujo operativo integral y validación de campo. | Datos de direcciones y GPS separados. | Validar despacho/recepción en operación. |
| Recepciones | En desarrollo | GoodsReceipt/scans y contratos de recepción. | Flujo de proveedor completo y confirmación de stock. | Datos y scanner físico. | Receipt + diferencias + confirmación. |
| Compras | Diseño validado / En desarrollo | OCR asistido y matching de artículos; dominio definido. | Solicitud, OC, proveedor e integración stock. | No automatizar entrada crítica. | Definir compras V1 conectada a necesidades. |
| Facturación | En desarrollo | Factura/pago operativos no fiscales y fuentes pendientes. | Cuenta corriente, validación funcional y fiscal. | Confundir operativo con fiscal. | Cierre de flujo no fiscal por caso. |
| Integraciones fiscales | Diseño validado | Límite ERP–motor fiscal documentado. | ADR e implementación backend-only. | Credenciales/regulación/producto. | Decisión fiscal explícita. |
| Usuarios/permisos | En desarrollo | Auth DEV, empresa activa y guards server-side. | ADR Auth final, roles centralizados y producción. | Fallback DEV y roles dispersos. | Cierre de Auth productiva. |
| Documentación | Avanzado | Checklist/documentos/transiciones auditadas, recibos digitales. | Política de retención y validación por institución. | Storage y reglas por cliente. | Documentación habilitante de factura. |
| Trazabilidad | Avanzado | Trace derivada, snapshots y evidencia C14. | Homogeneizar todos los módulos y datos históricos. | Relaciones blandas legacy. | Trazabilidad de circuito completo. |
| Reportes | En desarrollo | Comparativa, PDFs y proyecciones operativas. | Reportes gerenciales y calidad de fuentes. | Indicadores sobre datos incompletos. | Definir KPIs a partir de eventos confiables. |
| Migración XAdmin | Exploración | Matriz, staging y reglas de no-inferencia. | Modelo completo, calidad y plan de cutover. | Copiar ambigüedad o inventar datos. | Inventario/mapping verificable. |

## 11. Qué falta para hablar de migración completa

### Imprescindible antes de reemplazar XAdmin

1. **Lógica de negocio:** cerrar y probar el circuito completo por caso, incluyendo excepciones, múltiples remitos, diferencias, retornos, documentación habilitante y cierre.
2. **Datos:** inventario de fuentes XAdmin, reglas de mapeo por entidad, pruebas de calidad, duplicados, registros sin equivalencia y decisión para cada estado de migración.
3. **Migración histórica:** staging, reconciliación de totales/muestras, trazabilidad de qué se migró, qué se preservó como legacy y qué queda no resuelto. No se debe inventar lineage faltante.
4. **Operación diaria:** usuarios piloto, procedimientos de contingencia, entrenamiento y convivencia controlada con XAdmin.
5. **Seguridad:** ADR Auth final, roles/capacidades centralizados, eliminación/control del fallback DEV, revisión de secretos, sesiones, auditoría y acceso multiempresa productivo.
6. **QA:** E2E repetible con sesión renovable, pruebas de concurrencia para rutas críticas, browser/mobile y pruebas con datos representativos.
7. **Contingencia:** backup/restore probado, rollback de cutover, plan de corrección y monitoreo operativo.

### Puede quedar después del MVP, si el circuito crítico está controlado

- Integración fiscal completa con ARCA/AFIP.
- Automatizaciones avanzadas de compra/reposición.
- Reporting analítico amplio.
- Serialización universal o ubicación interna de máxima granularidad.
- Integraciones GPS/alertas sofisticadas, si no son requisito de la operación piloto.

## 12. Dependencias y preguntas abiertas

| Pregunta/dependencia | ¿Bloquea? | Motivo |
| --- | --- | --- |
| Export completo y significado de tablas/campos XAdmin | Sí, para migración completa. | Sin él no se puede prometer equivalencia ni mapping histórico. |
| Semántica real de `Fabricado`, `Reventa`, Departamento y campos no exportados | Sí, para clasificación automática. | Evita convertir etiquetas ambiguas en reglas. |
| Inventario físico de apertura, depósitos y custodia | Sí, para stock productivo. | No se puede arrancar con saldos confiables sin conciliación. |
| Fórmulas y unidades físicas reales de cajas | Sí, para operación de Cajas migrada. | La caja necesita composición/versionado y unidad identificada verificables. |
| Política de facturación fiscal e integración externa | No bloquea el flujo no fiscal DEV; sí bloquea emisión fiscal. | Requiere decisión de negocio, normativa y credenciales. |
| Modelo final de permisos/roles y empresa activa | Sí, para producción. | El DEV actual no es la autorización final. |
| Reglas documentales por institución/obra social | No bloquea todos los casos; sí los casos que dependan de ellas. | Determina cuándo se puede facturar/cerrar. |
| Procesos de proveedores, compras y recepción reales | No bloquea el piloto de circuito quirúrgico si se acota; sí el abastecimiento integral. | Falta validar flujo de entrada y reposición. |
| Datos y disponibilidad de usuarios piloto | Sí, para validación operativa. | Un test técnico no reemplaza el uso real supervisado. |
| Gobierno de datos históricos no mapeables | Sí, para cutover completo. | Debe decidirse preservación, consulta legacy o revisión manual. |

## 13. Próximas etapas por hitos

| Hito | Objetivo | Condición de entrada | Resultado esperado | Riesgo principal |
| --- | --- | --- | --- | --- |
| **A. Cerrar un caso operativo crítico en DEV** | Ejecutar la cadena Contacto → Cirugía → Presupuesto → Preparación → Remito → Consumo/Devolución → Factura/Cobro operativo. | Datos DEV representativos y sesión E2E renovada. | Evidencia repetible de circuito y excepciones básicas. | Confundir un camino feliz con cobertura total. |
| **B. Consolidar integración física–operativa** | Conectar de forma controlada Cajas/Stock/Preparación/Remito con el expediente. | Validación de contratos C14 y fuentes de materiales. | Un caso muestra lineage físico verificable. | Compatibilidades legacy y datos incompletos. |
| **C. Auditoría de datos XAdmin** | Inventariar origen, calidad, relaciones y mapping. | Acceso a exportaciones/DB y referentes del negocio. | Matriz de datos con mapeable/revisión/no migrable. | Conjeturar significado de campos. |
| **D. Migración controlada de maestros y apertura** | Migrar primero contactos, artículos y datos maestros validados; luego apertura reconciliada. | Hito C y reglas de rollback aprobadas. | Datos iniciales trazables con conteos y excepciones. | Duplicación o saldos incorrectos. |
| **E. Piloto con usuarios y convivencia** | Operar casos seleccionados sin cortar XAdmin de golpe. | Circuito A estable y datos piloto controlados. | Evidencia de uso real, capacitación y correcciones acotadas. | Doble carga y criterios divergentes. |
| **F. Decisión de reemplazo progresivo** | Mover módulos/casos por prioridad, no por pantalla. | Resultados de piloto, contingencia, Auth y QA productivos. | Plan de cutover por capacidades. | Declarar reemplazo antes de cerrar excepciones. |

## 14. Estimación y plazos

No hay evidencia suficiente para una fecha final responsable. La estimación debe basarse en alcance comprobable, no en la cantidad de pantallas.

### Hoy sí es estimable

- Correcciones o extensiones acotadas con contrato, datos de prueba y criterios de aceptación definidos.
- QA focalizado de módulos ya implementados.
- Mejoras de UX sobre proyecciones server-side existentes.
- Artefactos de migración únicamente cuando el modelo y la DB DEV descartable estén explícitamente confirmados.

### Hoy no es estimable con precisión

- Migración completa de XAdmin y reconciliación histórica.
- Stock de apertura e inventario físico real.
- Cobertura de reglas implícitas todavía no documentadas.
- Cutover sin convivencia o reemplazo total de XAdmin.
- Facturación fiscal e integración externa definitiva.
- Seguridad/Auth productivas y matriz de permisos definitiva.

### Qué hay que descubrir para poder estimarlo

1. Inventario exacto de fuentes y relaciones XAdmin.
2. Porcentaje real de datos mapeables, ambiguos y faltantes, medido sobre exportaciones completas.
3. Casos operativos representativos y excepciones por área.
4. Datos físicos de stock/cajas y criterio de conciliación de apertura.
5. Alcance de usuarios piloto, convivencia y contingencia.
6. Decisiones de Gerencia sobre fiscalización, roles, datos históricos y prioridad de módulos.

La ausencia de plazo cerrado no es falta de avance: es una consecuencia de no prometer una migración basada en información aún no conocida.

## 15. Valor generado hasta ahora

El proyecto ya generó valor antes del despliegue completo:

- Un lenguaje común y un circuito canónico para discutir operación, no sólo pantallas.
- Reglas antes implícitas transformadas en modelos, invariantes, validadores y pruebas.
- Identificación de deuda y ambigüedad de XAdmin antes de trasladarla.
- Base multiempresa, persistencia y auditoría sobre la que se puede construir sin depender del navegador.
- Separación explícita entre lo cotizado, enviado, consumido, devuelto, facturado y cobrado.
- Un camino probado para material físico: reservas, control, despacho, devoluciones y conciliación bajo concurrencia.
- Protección contra doble ejecución y contra fabricación de historia cuando faltan datos legacy.
- Fundamentos para automatización asistida —OCR, QR, geografía, GPS— sin entregar la decisión operativa a servicios externos.

---

# Parte II — 16. Informe ejecutivo para Gerencia

## 1. Situación actual

OSSUM COR está en una etapa de consolidación de un ERP operativo para el negocio quirúrgico. Ya no es solamente un prototipo de pantallas: cuenta con una base de datos y backend de desarrollo, control por empresa, auditoría y varios procesos operativos persistidos.

El objetivo es reemplazar progresivamente circuitos hoy distribuidos entre XAdmin, planillas, mensajes, documentos y conocimiento de las personas. La entidad central es la cirugía o expediente, desde donde se busca ver y controlar todo el recorrido del caso.

## 2. Qué se avanzó

Se estableció una arquitectura nueva basada en PostgreSQL, servicios de servidor y control multiempresa. Se incorporaron Contactos como fuente backend, Cirugías/Expediente, presupuestos, remitos, consumos, devoluciones, documentación, facturación operativa no fiscal y cobros.

También se avanzó en una de las áreas más sensibles: preparación física, stock y cajas. El sistema puede representar fórmulas de cajas, unidades físicas, reservas, controles, diferencias, despacho, retorno y conciliación con registro de evidencia.

## 3. Qué descubrimos durante el desarrollo

El descubrimiento central es que XAdmin contiene conocimiento valioso, pero no siempre reglas explícitas ni estructuras aptas para copiar. Varias etiquetas, campos y relaciones históricas no tienen un significado único o suficiente para automatizar una migración segura.

Por ejemplo, “Fabricado” o “Reventa” no alcanza para saber si un artículo es una caja, un implante, un equipo o un artículo estándar. También se comprobó que una caja modelo, una caja física y una caja enviada son conceptos diferentes y deben mantenerse separados.

## 4. Principales problemas encontrados

Los problemas más importantes no fueron visuales. Fueron de operación: evitar despachos duplicados, impedir que dos personas reserven el mismo material, conservar qué lote/unidad física salió, no habilitar stock por una devolución no identificada y no fabricar historia cuando los datos legacy no tienen evidencia suficiente.

Son problemas que normalmente aparecen tarde, en operación real. Encontrarlos ahora permite resolverlos antes de depender del sistema nuevo.

## 5. Soluciones implementadas

OSSUM COR está reemplazando estados implícitos por reglas explícitas, cambios no auditables por evidencia trazable y saldos ambiguos por reservas, posiciones y movimientos con origen.

En paquetes DEV se documentó que un despacho no se duplica ante reintento, que una intención distinta se rechaza, que los errores revierten sin dejar información parcial y que la composición controlada se preserva aun si luego cambia el origen. Ese trabajo debe consolidarse en un baseline integrado antes de usarse como garantía de release.

## 6. Por qué algunas etapas demandaron más tiempo

Parte del tiempo se utilizó para evitar implementaciones incorrectas. No habría sido responsable copiar una tabla o una pantalla si no se sabe qué regla representa, cómo se relaciona con otros datos o qué ocurre ante excepciones.

El tiempo adicional en stock, cajas y despacho responde a complejidad real: concurrencia, trazabilidad, material físico, control humano, auditoría e idempotencia. Es trabajo que reduce incidentes costosos y difíciles de corregir una vez que el sistema está en uso.

## 7. Estado actual por grandes áreas

- **Sólidos en DEV:** base multiempresa, persistencia PostgreSQL/Prisma, Contactos backend y partes acotadas de control/dispatch/conciliación de Cajas.
- **Avanzados en DEV:** Cirugías/Expediente, artículos, stock/cajas, preparación, remitos, logística de expediente, trazabilidad y documentación.
- **En desarrollo:** consumo/devoluciones generalizados, recepciones, compras, facturación/pagos de uso completo, reportes y GPS operativo.
- **Diseñados, no productivos:** fiscalización, Auth/seguridad definitivos y migración completa de XAdmin.

## 8. Qué falta

Para hablar de reemplazo de XAdmin falta cerrar el circuito completo con datos representativos, terminar de conocer y clasificar datos/reglas legacy, reconciliar inventario de apertura, operar pilotos, resolver seguridad productiva y preparar contingencia.

No todos los módulos necesitan estar cerrados para un MVP controlado. Pero stock de apertura, permisos, casos críticos, datos migrados y operación piloto sí son condiciones indispensables para un reemplazo responsable.

## 9. Riesgos actuales

Los principales riesgos son dependencia de información histórica incompleta, diferencias entre la lógica real de XAdmin y lo que aparentan sus pantallas/campos, datos no normalizados, una deuda HIGH de integridad aún abierta en el baseline global y el hecho de que varias capacidades actuales son de desarrollo y no de producción.

El riesgo está identificado y se está gestionando con migración gradual, pruebas de integridad y la regla de no inventar relaciones históricas que no se puedan demostrar.

## 10. Próximos hitos

1. Demostrar de manera repetible el circuito crítico completo en DEV.
2. Consolidar la integración entre expediente, preparación física, remito y conciliación.
3. Auditar datos y reglas XAdmin con evidencia completa.
4. Migrar maestros y posiciones de apertura de manera controlada y reconciliable.
5. Ejecutar pilotos con usuarios y convivencia acotada.
6. Decidir reemplazo progresivo por módulos/casos, con contingencia preparada.

## 11. Conclusión

El proyecto está madurando desde una representación visual de la operación hacia una plataforma capaz de sostenerla. El avance real no se mide sólo por pantallas nuevas: se mide por la capacidad de expresar reglas, preservar evidencia, evitar errores operativos y migrar sin repetir los problemas históricos.

La recomendación es sostener el enfoque progresivo y basado en evidencia. Acelerar copiando XAdmin literalmente o fijando una fecha final antes de conocer datos y reglas faltantes incrementaría el riesgo. En cambio, cerrar hitos verificables permite llegar a un reemplazo controlado y defendible.

---

# Parte III — 17. Anexo técnico y evidencia

## A. Fuentes revisadas y jerarquía aplicada

1. Implementación actual (`prisma/schema.prisma`, servicios, rutas y pruebas) como evidencia principal de capacidades presentes.
2. Verificaciones independientes y handoffs recientes para pruebas ejecutadas en DEV.
3. ADRs y Knowledge vigentes para intención, límites y decisiones de producto.
4. Task Briefs, Change Packs, worklog y commits para trazabilidad de evolución.
5. Engram como memoria operativa reciente, en especial para paquetes de logística/GPS que aún no tienen cierre documental consolidado.

## B. Evidencia principal por capacidad

| Capacidad | Evidencia |
| --- | --- |
| Producto y circuito | `knowledge/core/PROJECT_BRIEF.md`, `knowledge/domain/CENTRAL_OPERATIONAL_FLOW.md` |
| Decisiones canónicas | `knowledge/core/CANONICAL_DECISIONS.md`, `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` |
| Estado prototipo/transición | `knowledge/core/CURRENT_STATE.md` |
| Multiempresa/auditoría | `prisma/schema.prisma` (Organization, Company, UserCompanyAccess, AuditEvent); `src/lib/api/auth-context.ts`, `src/lib/api/guards.ts` |
| Auth DEV y límite productivo | `knowledge/architecture/ADR-AUTH-FINAL.md` |
| Contactos backend | `knowledge/specs/CONTACTS-BACKEND-AUTHORITY-UI-DEV-001/HANDOFF.md`; contact service/routes/tests |
| Core E2E | `knowledge/specs/CORE-FLOW-E2E-DEV-001/HANDOFF.md`, `e2e/core-flow-dev.spec.ts` |
| Remito / dispatch | `knowledge/specs/REMITO-STOCK-ATOMIC-DISPATCH-001/TASK_BRIEF.md`; `src/lib/services/remito.service.ts`; C14 services/tests |
| Preparación física | `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/HANDOFF.md` |
| Control/dispatch | `knowledge/specs/LOGISTICS-CONTROL-ATOMIC-DISPATCH-T3-DEV-001/VERIFY_REPORT.md` |
| Consumo/devolución/conciliación | `knowledge/specs/LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DEV-001/{TASK_BRIEF,VERIFY_REPORT}.md` |
| Logística read model | `knowledge/specs/LOGISTICS-OPERATIONS-READ-PROJECTION-E1-DEV-001/VERIFY_REPORT.md` |
| Artículos / XAdmin | `knowledge/specs/ARTICLE-XADMIN-MIGRATION-MATRIX-001/MIGRATION_MATRIX.md`; `ARTICLE-XADMIN-TECHNICAL-DESIGN-001/TASK_BRIEF.md` |
| Stock/Cajas arquitectura | `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md`, `ADR-CAJAS-CORE-PERSISTENCE.md`, `ADR-CAJAS-STOCK-TRANSACTIONS.md` |
| Facturación/pagos | `knowledge/specs/BILLING-PAYMENTS-OPERATIONAL-UI-DEV-001/TASK_BRIEF.md`; Invoice/Payment models and tests |
| Recepción/scans | `knowledge/specs/RECEIPT-UNIT-SCAN-LEARNING-DEV-001/TASK_BRIEF.md`; receipt services/tests |
| QR/Code128 y privacidad | `knowledge/specs/REMITO-QR-BARCODE-001/CHANGE_PACK.md` |

## C. Migraciones relevantes observadas

La historia local contiene, entre otras, migraciones para fundación backend, Cirugía, remitos, consumo/devolución, presupuesto, invoice/payment, Article master/taxonomía, recepción/scans, QR/identificadores, Cajas y reconciliación de logística. Las de mayor relevancia reciente incluyen:

- `20260606063628_init_backend_foundation`
- `20260615153000_surgery_phase1_core`
- `20260707091809_add_remito_unificado`
- `20260707163042_add_consumo_devolucion`
- `20260707173000_add_presupuesto_core`
- `20260707193000_add_invoice_payment_core`
- `20260813000000_remito_stock_atomic_dispatch_persistence_001`
- `20260820170000_article_master_v11`
- `20260820190000_receipt_preparation_v1`
- `20260826190000_article_xadmin_taxonomy_v1`
- `20260906234500_add_cajas_allocation_trace_snapshot`
- `20260907100000_phase_d_logistics_reconciliation`
- `20260914093000_logistics_vehicle_gps_rest_v1`

La existencia de una migración no equivale a despliegue productivo. Los handoffs revisados sólo acreditan ejecución donde expresamente declaran DB DEV descartable y `prisma migrate status` conforme.

## D. Tests y validaciones destacadas

- Contactos: 28 pruebas focalizadas, Prisma format/validate/generate, typecheck, build y browser QA autenticado.
- Preparación física: suites focalizadas de 7/9 pruebas en distintos momentos, con prueba de sobreasignación, snapshots, idempotencia y aislamiento.
- Control/dispatch: verificación independiente 8/8 criterios; 27 tests focalizados.
- Consumo/devolución/conciliación: verificación independiente 11/11 requisitos; 12 tests, incluyendo competencia real PostgreSQL.
- Logística read projection: verificación 8/8 escenarios; 11 tests focalizados y typecheck.
- Core E2E: una ejecución Playwright registrada como exitosa (46,7 s), otra bloqueada por token DEV vencido.

## E. Discrepancias y límites detectados

1. `CURRENT_STATE.md` se declara borrador inicial y describe stock/cajas como futuro; el schema y verificaciones posteriores prueban que el repositorio avanzó más. Para este informe prevaleció implementación/verificación reciente.
2. `BACKEND_PHASE2_PLAN.md` conserva fases y gates de julio que fueron superados por paquetes posteriores autorizados. Se usó para entender la dirección, no para negar evidencia posterior.
3. La propuesta de GPS dice “sin conexión real/historial”; el working tree y memoria operativa posterior muestran integración REST/historial reciente. Como falta un cierre documental consolidado en la propuesta, se clasificó como trabajo DEV en desarrollo, no como capacidad cerrada.
4. El handoff Core E2E reporta typecheck global afectado por una prueba C14 en ese momento; paquetes posteriores reportan typecheck exitoso. Con working tree masivamente sucio, no se certifica un baseline global actual sin una ejecución aislada y repetible.
5. Hay dependencias como `next-auth` presentes en `package.json`, pero la evidencia de Auth operativa revisada es Supabase Auth; no se infiere que NextAuth esté integrado.

## F. Riesgos y deuda técnica abierta

- Auth productiva no cerrada: ADR DRAFT, fallback DEV y roles no centralizados completamente.
- Integridad legacy: no se puede liberar/reemplazar una correlación histórica sin snapshot de trace autoritativo; el comportamiento fail-closed es deliberado.
- E2E depende de sesión de autenticación temporal renovable.
- Referencias blandas/compatibilidades V0 persisten en algunas relaciones operativas durante la transición.
- Migración XAdmin integral, mapeo de datos e inventario de apertura no están ejecutados.
- En el Core E2E se documentó deuda de validación de la función de techo Cajas y orden de chequeos de replay; la deuda de replay de WCB-06 posterior fue abordada por el paquete de estabilización, pero requiere mantener/regenerar prueba de integración DB para máxima evidencia.
- Worktree compartido con amplios cambios no confirmados: requiere ownership y validación selectiva antes de cualquier release.
- El último commit confirmado es `dd35d40` (03-09-2026); ningún paquete posterior debe presentarse como release integrado hasta ser revisado, validado y versionado selectivamente.

## G. Decisiones pendientes para Gerencia/Franco

- Prioridad y alcance del primer piloto operativo.
- Fuente, disponibilidad y calidad de exportaciones/DB XAdmin.
- Tratamiento de registros no mapeables y de historia insuficiente.
- Criterio de inventario de apertura, depósitos/custodia y reconciliación.
- Rol final, sesiones y política de seguridad/Auth productiva.
- Alcance y momento de la emisión fiscal/ARCA.
- Política documental por institución/obra social y retención de adjuntos.
- Estrategia de convivencia y contingencia XAdmin + OSSUM COR.
