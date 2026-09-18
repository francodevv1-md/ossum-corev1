# OSSUM COR — Trazabilidad de cajas, instrumental e implantes

**Estado:** Documento de referencia funcional  
**Fecha:** 15 de julio de 2026  
**Objetivo:** Servir como base para diseñar e implementar en OSSUM COR el control de lotes, series, cajas de instrumental, implantes, consumos quirúrgicos, devoluciones y reposiciones.

> Este documento propone un modelo de trabajo. No debe tomarse como una especificación técnica cerrada ni como una regla inmodificable. Antes de implementarlo debe compararse con el circuito real de Districorr, el stock existente, la información provista por los fabricantes y los requisitos regulatorios aplicables.

---

## 1. Problema que se busca resolver

Districorr necesita conocer, en cualquier momento:

- qué contiene idealmente cada tipo de caja;
- qué contiene realmente cada caja física;
- dónde se encuentra cada caja, instrumental e implante;
- qué productos fueron enviados a una cirugía;
- cuáles se utilizaron, abrieron, contaminaron o regresaron;
- qué lote o serie fue implantado en cada paciente;
- qué elementos faltan reponer antes de liberar nuevamente la caja;
- quién realizó cada armado, despacho, control y conciliación;
- qué productos están vencidos, próximos a vencer, bloqueados o alcanzados por una alerta.

La solución no debe depender de editar manualmente una lista dentro de cada caja. El contenido actual debe surgir de existencias identificadas y movimientos auditables.

---

## 2. Conclusiones de la investigación

Las soluciones especializadas en inventario ortopédico trabajan con los siguientes conceptos:

1. **Plantilla o configuración maestra del set:** indica cómo debería estar compuesto.
2. **Caja física:** representa una unidad concreta que circula y posee identidad propia.
3. **Instrumental reutilizable:** se controla como activo, no como producto consumible.
4. **Implantes y descartables:** se administran por producto, lote, serie y vencimiento.
5. **Ubicaciones:** depósito, caja, hospital, transporte, técnico o cuarentena.
6. **Cirugía o caso:** reserva los productos y relaciona el consumo con el paciente.
7. **Movimientos:** explican cada ingreso, traslado, reserva, consumo, devolución y baja.
8. **Conciliación:** compara lo enviado, lo declarado y lo efectivamente devuelto.
9. **Reposición:** restablece la caja hasta su configuración esperada.

ImplantBase permite consultar inventario por contenedor, implante, lote y serie y administrar consignaciones, cajas en préstamo y reposiciones. Move Medical propone visibilidad individual de cajas, kits, instrumental e implantes. DeviceFlow incorpora niveles mínimos y reposición del inventario de campo.

---

## 3. Principios funcionales recomendados

### 3.1 Separar plantilla, caja e inventario

Una plantilla LC4 describe el contenido ideal. Cada caja LC4 física mantiene su propio estado, contenido real, ubicación e historial.

### 3.2 No descontar al despachar

Cuando un implante sale hacia una cirugía debe cambiar de **Disponible** a **Reservado** o **En tránsito**. Solo pasa a **Consumido** cuando se confirma su utilización.

Si regresa cerrado y apto, vuelve a **Disponible**. Si fue abierto, contaminado o dañado, debe pasar a **Cuarentena** o **Baja**, aunque no haya sido implantado.

### 3.3 No sobrescribir el pasado

El inventario de salida debe conservarse como una fotografía inalterable. Las correcciones posteriores deben registrarse como nuevos movimientos o ajustes, con usuario, fecha y motivo.

### 3.4 Trazabilidad completa al paciente

La relación mínima esperada es:

`Producto → lote/serie → caja/envío → cirugía → paciente → médico → institución`

### 3.5 Una caja incompleta no debe figurar como disponible

Después del retorno, la caja queda pendiente hasta finalizar:

- recepción;
- conteo;
- conciliación;
- inspección del instrumental;
- reposición de consumibles;
- resolución de diferencias.

---

## 4. Modelo funcional propuesto

### 4.1 Catálogo de productos

Define la identidad comercial y regulatoria del producto, sin representar todavía una existencia física.

Campos sugeridos:

- código interno/SKU;
- GTIN, UDI-DI u otro código del fabricante;
- descripción;
- familia y subfamilia;
- marca y fabricante;
- medida, diámetro, longitud y variante;
- tipo: implante, descartable, instrumental o equipo;
- unidad de medida;
- registro ANMAT cuando corresponda;
- control requerido: cantidad, lote, serie, vencimiento o combinación;
- condición estéril/no estéril;
- activo/inactivo.

### 4.2 Lotes y unidades serializadas

El catálogo indica qué producto es. La existencia trazable indica qué unidad o lote se posee realmente.

Campos sugeridos:

- producto;
- lote;
- número de serie, cuando corresponda;
- fecha de fabricación;
- fecha de vencimiento;
- cantidad recibida y cantidad disponible;
- proveedor y documento de ingreso;
- ubicación actual;
- estado de disponibilidad;
- costo opcional;
- observaciones y evidencias.

Regla recomendada:

- productos homogéneos: controlar cantidades por lote;
- productos únicos o de alto riesgo: controlar cada unidad por serie;
- instrumental reutilizable: asignar serie de fabricante o identificación interna.

### 4.3 Plantillas de caja

Representan la composición ideal de un tipo de set.

Ejemplo:

| Código | Elemento | Cantidad ideal | Control |
|---|---|---:|---|
| INST-001 | Guía tibial | 1 | Identificador interno/serie |
| INST-002 | Guía femoral Out-In | 1 | Identificador interno/serie |
| INST-003 | Dilatador 8 mm | 1 | Identificador interno/serie |
| IMP-101 | Tornillo interferencial 8 × 25 | 2 | Lote y vencimiento |
| IMP-102 | Tornillo interferencial 9 × 25 | 2 | Lote y vencimiento |

La plantilla puede tener versiones. Si una configuración cambia, no se debe alterar retroactivamente la composición usada en cirugías anteriores.

### 4.4 Cajas físicas

Cada caja que circula debe tener identidad propia.

Ejemplo:

- identificador: `LC4-03`;
- plantilla: `LC4 — LCA/LCP`;
- ubicación actual: Depósito Corrientes;
- estado operativo: Disponible;
- condición: Completa;
- precinto actual: `P-008492`;
- último control: 15/07/2026;
- responsable: usuario que realizó el control.

Estados sugeridos:

- Disponible;
- Reservada;
- En preparación;
- Controlada/precintada;
- Despachada;
- En institución;
- Pendiente de retiro;
- Retornada sin controlar;
- En conciliación;
- Pendiente de reposición;
- Con faltantes críticos;
- En esterilización;
- En reparación;
- Bloqueada;
- Dada de baja.

### 4.5 Instrumental reutilizable

Cada pieza crítica debe poder tener:

- identificador propio;
- serie de fabricante, cuando exista;
- código interno asignado por Districorr;
- caja y ubicación actuales;
- condición;
- cantidad de usos;
- última inspección;
- última esterilización, si Districorr debe registrarla;
- historial de mantenimiento;
- fotos;
- motivo de baja.

Estados sugeridos:

- Disponible;
- Dentro de caja;
- En cirugía;
- En esterilización;
- En inspección;
- En reparación;
- Faltante;
- Dañado;
- Dado de baja.

### 4.6 Ubicaciones

El sistema debe tratar como ubicaciones válidas:

- depósitos;
- sectores internos;
- cajas;
- hospitales o sanatorios;
- vehículos o transportes;
- técnicos o responsables de campo;
- proveedores o servicio técnico;
- cuarentena;
- baja definitiva.

Una ubicación indica dónde está el producto. Un estado indica en qué condición se encuentra. No deben confundirse.

---

## 5. Flujo operativo propuesto

### 5.1 Preparación y reserva

1. La cirugía define qué caja y qué materiales requiere.
2. El sistema reserva cajas e implantes disponibles.
3. La reserva evita que el mismo stock se prometa a otra cirugía.
4. Control de Caja arma el set usando su plantilla como checklist.
5. Las sustituciones deben quedar identificadas y justificadas.

### 5.2 Control de salida

Antes del despacho se genera una fotografía de salida con:

- caja y versión de plantilla;
- instrumental presente;
- implantes y descartables;
- producto, lote, serie, vencimiento y cantidad;
- precinto;
- fotos y documentación;
- usuario, fecha y hora del control;
- cirugía, paciente e institución de destino.

Una vez confirmada la salida, esta fotografía no se edita.

### 5.3 Despacho

El despacho genera movimientos desde el depósito o caja hacia la cirugía/institución.

Los productos quedan en estado:

- **En tránsito**, mientras se trasladan;
- **En institución**, una vez confirmada la entrega;
- nunca **Consumido** solamente por haber sido enviados.

### 5.4 Declaración de consumo

Después de la cirugía se registran:

- implantes utilizados;
- implantes abiertos y no implantados;
- productos contaminados;
- productos devueltos cerrados;
- instrumental utilizado;
- instrumental faltante o dañado;
- stickers o etiquetas;
- fotos;
- observaciones;
- usuario que realizó la declaración.

Métodos de captura posibles:

1. escaneo de GS1 DataMatrix/UDI;
2. selección desde el inventario enviado;
3. carga manual excepcional;
4. fotografía de etiquetas como evidencia.

### 5.5 Retiro y retorno

Cuando la caja vuelve al depósito:

1. se registra su recepción;
2. se valida el precinto o condición de retorno;
3. se realiza el conteo físico;
4. se compara con el retorno esperado;
5. se inspecciona el instrumental;
6. se registran diferencias;
7. se generan tareas de reposición, investigación o reparación.

### 5.6 Conciliación

La lógica básica es:

`Inventario enviado − consumo confirmado − bajas justificadas = retorno esperado`

El sistema compara:

| Fuente | Qué representa |
|---|---|
| Fotografía de salida | Lo enviado |
| Declaración posquirúrgica | Lo consumido, abierto o dañado |
| Conteo de retorno | Lo que regresó físicamente |

Resultados posibles:

- Conciliación correcta;
- Diferencia pendiente;
- Faltante no justificado;
- Producto adicional no registrado;
- Lote o serie incorrectos;
- Instrumental dañado;
- Evidencia insuficiente.

La diferencia no debe corregirse alterando el inventario de salida. Debe resolverse mediante una incidencia y el movimiento correspondiente.

### 5.7 Reposición

Una vez conciliado el retorno, el sistema compara el contenido real con la plantilla de la caja y genera una solicitud de reposición.

Ejemplo:

- Tornillo 8 × 25: reponer 1;
- Tornillo 9 × 25: reponer 2;
- Mecha 8 mm: investigar faltante;
- Guía tibial: enviar a reparación.

La reposición debe sugerir lotes disponibles según:

- compatibilidad;
- fecha de vencimiento;
- FEFO: primero vence, primero sale;
- restricciones de calidad;
- ubicación;
- reserva para otras cirugías.

---

## 6. Estados de inventario sugeridos

| Estado | Disponible para otra cirugía | Significado |
|---|---:|---|
| Disponible | Sí | Apto y sin reserva |
| Reservado | No | Asignado a una cirugía |
| En preparación | No | En proceso de armado |
| En tránsito | No | Fuera del depósito |
| En institución | No | Entregado y aún no conciliado |
| Consumido | No | Utilizado/implantado |
| Devuelto pendiente | No | Retornó sin control final |
| Cuarentena | No | Requiere decisión de calidad |
| Dañado | No | No apto hasta reparación o baja |
| Vencido | No | Fuera de vigencia |
| Faltante | No | No localizado físicamente |
| Baja | No | Salida definitiva del inventario |

---

## 7. Movimientos que deben auditarse

Tipos mínimos:

- recepción de compra;
- ingreso por devolución;
- asignación a caja;
- retiro de caja;
- traslado entre depósitos;
- reserva para cirugía;
- liberación de reserva;
- despacho;
- entrega en institución;
- consumo implantado;
- apertura sin implante;
- contaminación;
- devolución apta;
- ingreso a cuarentena;
- reposición de caja;
- faltante;
- ajuste de inventario;
- reparación;
- baja;
- retiro por alerta o recall.

Cada movimiento debería conservar:

- origen y destino;
- producto y lote/serie;
- cantidad;
- caja;
- cirugía;
- usuario;
- fecha y hora;
- motivo;
- documento o evidencia;
- movimiento que corrige, si corresponde.

---

## 8. Interfaz sugerida

### 8.1 Ficha de caja

Pestañas recomendadas:

1. **Contenido actual**  
   Comparación entre cantidad ideal, cantidad real, reservado, faltante y condición.

2. **Cirugía y ubicación**  
   Caso asignado, institución, transporte, responsable y fechas.

3. **Control de retorno**  
   Comparación enviado/consumido/devuelto, incidencias y tareas de reposición.

4. **Historial**  
   Línea de tiempo inalterable de movimientos, controles, fotos y responsables.

### 8.2 Alertas visibles

- faltante crítico;
- producto próximo a vencer;
- producto vencido;
- lote bloqueado;
- serie duplicada;
- caja sin conciliación;
- retorno demorado;
- producto enviado sin trazabilidad suficiente;
- diferencia entre consumo declarado y etiquetas adjuntas;
- caja por debajo de su configuración mínima.

### 8.3 Escaneo

El escáner debe asistir, no bloquear completamente la operación inicial.

Orden de preferencia:

1. DataMatrix/UDI del fabricante;
2. código de barras del fabricante;
3. etiqueta interna de Districorr;
4. búsqueda manual controlada.

La carga manual debe exigir motivo cuando se omite un dato requerido.

---

## 9. Reglas de negocio iniciales

1. Una caja no puede asignarse simultáneamente a dos cirugías incompatibles.
2. Un implante reservado no aparece como disponible general.
3. El despacho no equivale a consumo.
4. El consumo debe asociarse a una cirugía y, cuando corresponda, a paciente.
5. Un producto vencido, bloqueado o en cuarentena no puede reservarse.
6. El retorno físico no libera automáticamente una caja.
7. La caja se libera después de la conciliación y el control definido.
8. Las diferencias requieren incidencia y responsable.
9. Los ajustes manuales requieren motivo y auditoría.
10. Las fotografías complementan el dato estructurado, pero no deben reemplazarlo.
11. Los movimientos confirmados no se eliminan: se corrigen con contramovimientos.
12. La modificación de una plantilla crea una nueva versión.

---

## 10. Trazabilidad y normativa argentina

La UDI identifica el dispositivo mediante una parte fija del producto y una parte variable que puede incluir lote, serie, fabricación y vencimiento.

En Argentina, determinadas categorías implantables —entre ellas implantes de columna y prótesis de cadera y rodilla— requieren tarjeta de implante con datos del producto, modelo, lote o serie, fabricante/importador, registro ANMAT, institución, fecha, paciente y médico.

OSSUM COR debería poder generar o completar esa documentación usando la información confirmada del consumo, evitando volver a escribir datos ya registrados.

Antes de definir el alcance regulatorio definitivo debe validarse:

- qué líneas comercializadas por Districorr están alcanzadas por el Sistema Nacional de Trazabilidad;
- qué actor informa cada evento;
- qué datos llegan desde fabricante/importador;
- cómo se conserva la tarjeta de implante;
- plazos de guarda documental;
- procedimiento ante alertas, robos, extravíos o recalls.

---

## 11. Implementación gradual recomendada

### Fase 1 — Identidad y visibilidad

- normalizar catálogo de productos;
- registrar lotes, series y vencimientos;
- identificar cajas físicas;
- crear plantillas de composición;
- definir ubicaciones y estados;
- incorporar historial de movimientos.

**Resultado esperado:** saber qué existe, dónde está y en qué condición.

### Fase 2 — Preparación y despacho

- reservar cajas e implantes por cirugía;
- checklist de armado;
- fotografía de salida;
- precintos;
- registro de despacho y entrega;
- alertas por vencimiento y faltantes.

**Resultado esperado:** conocer exactamente qué se envió a cada cirugía.

### Fase 3 — Consumo y retorno

- declaración posquirúrgica;
- carga de etiquetas y fotos;
- retorno físico;
- conciliación enviado/consumido/devuelto;
- incidencias;
- reposición automática.

**Resultado esperado:** mantener actualizado el contenido real de cada caja después de cada uso.

### Fase 4 — Automatización y cumplimiento

- lectura GS1 DataMatrix/UDI;
- tarjeta de implante;
- alertas por lote y recall;
- FEFO;
- auditorías dirigidas;
- análisis de rotación, consumo y utilización de cajas;
- sugerencias de stock mínimo por demanda real.

**Resultado esperado:** trazabilidad avanzada y mejor planificación del inventario.

---

## 12. Qué no conviene hacer al inicio

- implementar RFID antes de ordenar catálogo y movimientos;
- exigir serialización individual para productos que solo requieren lote;
- guardar el contenido de la caja como texto libre;
- descontar todos los materiales cuando se despachan;
- permitir correcciones sin historial;
- mezclar instrumental reutilizable con consumo de implantes;
- usar fotografías como única fuente de inventario;
- automatizar reposiciones antes de contar con conciliaciones confiables;
- definir reglas regulatorias sin validación del responsable técnico.

---

## 13. Preguntas que deben resolverse con Districorr

### Catálogo e inventario

- ¿Qué productos se controlan por lote y cuáles por serie?
- ¿Todos poseen GTIN, DataMatrix o UDI legible?
- ¿Cómo se identifican actualmente las piezas de instrumental?
- ¿Existen cajas con la misma denominación pero contenido diferente?
- ¿Quién puede dar de alta o modificar productos y plantillas?

### Operación

- ¿Quién registra el consumo: técnico, coordinador, hospital o Control de Caja?
- ¿En qué momento se reciben las etiquetas utilizadas?
- ¿Qué ocurre con un implante abierto y no utilizado?
- ¿Quién autoriza una baja, ajuste o sustitución?
- ¿Una caja puede regresar parcialmente y volver a salir?

### Calidad

- ¿Qué controles son obligatorios antes de liberar una caja?
- ¿Qué instrumental requiere mantenimiento programado?
- ¿Quién gestiona alertas y recalls?
- ¿Qué evidencias deben conservarse y por cuánto tiempo?

### Sistema

- ¿Qué información ya existe en OSSUM COR, Prisma/PostgreSQL o sistemas externos?
- ¿Qué datos se importarán desde proveedores?
- ¿Dónde se almacenarán fotos, etiquetas y documentos?
- ¿Qué operaciones deben funcionar desde dispositivos móviles?
- ¿Qué reportes necesita Gerencia, Calidad, Depósito y Coordinación?

---

## 14. Indicadores futuros

- porcentaje de cajas completas;
- tiempo promedio de conciliación;
- tiempo promedio de reposición;
- diferencias por cirugía;
- faltantes por caja, usuario o institución;
- productos vencidos y próximos a vencer;
- rotación por lote y producto;
- consumo por médico, procedimiento e institución;
- utilización y rentabilidad por caja;
- instrumental con mayor desgaste o reparación;
- valor del inventario reservado, en tránsito y sin movimiento;
- cumplimiento de fotografías, etiquetas y trazabilidad del paciente.

---

## 15. Criterio de éxito

La implementación será efectiva cuando OSSUM COR pueda responder, sin reconstrucción manual:

- qué contiene ahora cada caja;
- qué debería contener;
- qué le falta y por qué;
- dónde se encuentra;
- qué salió hacia una cirugía;
- qué se implantó y a qué paciente;
- qué regresó;
- qué debe reponerse;
- qué usuario confirmó cada evento;
- qué lotes o series están afectados ante una alerta.

---

## 16. Fuentes consultadas

- [ImplantBase — Field Inventory Management](https://us.implantbase.com/software/field-inventory)
- [ImplantBase — Orthopedic Implant Industry](https://us.implantbase.com/orthopedic-implant-industry)
- [Move Medical — Medical Inventory Management](https://movemedical.com/)
- [DeviceFlow — Consignment, Trunk Stock & Loaner Tracking](https://www.deviceflow.com/solutions/inventory-management/)
- [FDA — UDI Basics](https://www.fda.gov/medical-devices/unique-device-identification-system-udi-system/udi-basics)
- [GS1 Argentina — Cuidado de la Salud](https://www.gs1.org.ar/Site/Sectores_Bootstrap5/Salud.html)
- [ANMAT — Sistema Nacional de Trazabilidad: Preguntas frecuentes](https://www.argentina.gob.ar/anmat/sistema-nacional-de-trazabilidad/preguntas-frecuentes-0)
- [Disposición ANMAT 8671/2021 — Tarjeta de implante](https://www.boletinoficial.gob.ar/detalleAviso/primera/253416/20211125)

---

## 17. Próximo documento recomendado

Una vez validado este modelo con Depósito, Control de Caja, Coordinación, Calidad y Gerencia, el próximo paso debería ser redactar una especificación funcional que incluya:

- mapa del circuito actual y circuito objetivo;
- entidades y relaciones;
- permisos por rol;
- estados y transiciones;
- reglas de negocio definitivas;
- pantallas y acciones;
- estrategia de migración del inventario actual;
- casos de prueba y criterios de aceptación.
