# Identificación y trazabilidad de productos médicos y quirúrgicos: estándar, flujo y modelo de datos recomendados

## Conclusión ejecutiva

La conclusión principal de esta investigación es que **el problema no debe modelarse como “leer un código de barras”**, sino como un **problema de resolución de identidad basado en múltiples evidencias**.

En productos médicos, implantes e instrumental conviven identificadores de producto, datos de producción, referencias comerciales, códigos internos, distintas jerarquías de envase y diferentes estándares de UDI. Los propios sistemas hospitalarios que han madurado en UDI no suelen sustituir su código interno por el UDI: por ejemplo, Eskenazi Health mantuvo los números de artículo de su ERP y creó referencias cruzadas con los Device Identifiers; Stanford creó una tabla específica para los DI en su ERP y los transmitió a Epic para poder resolver los códigos escaneados en el punto de atención. citeturn16search0turn15search3

Por tanto, para el ERP que estás diseñando recomiendo las siguientes tres decisiones arquitectónicas.

| Resultado solicitado | Recomendación |
|---|---|
| **Estándar recomendado** | Adoptar **el modelo semántico UDI de IMDRF —DI para identidad del producto y PI para datos de producción—**, utilizar **GS1/GTIN + Application Identifiers como primera opción**, especialmente por el contexto argentino, pero implementar una capa de decodificación multiprotocolo capaz también de HIBC/HIBCC, ICCBBA y códigos propietarios. El `product_id` interno del ERP debe ser la identidad canónica, no el GTIN ni REF. FDA reconoce actualmente GS1, HIBCC e ICCBBA como agencias emisoras de UDI; AccessGUDID puede incluso parsear los tres formatos. citeturn18search1turn14search2turn18search2 |
| **Flujo operativo recomendado** | Una lectura crea una **sesión de captura**. Dentro de ella se leen tantos DataMatrix, 1D, textos OCR y datos manuales como sean necesarios; cada uno genera observaciones. Después un **motor de resolución** determina por separado “qué artículo es” y “qué lote/serie/vencimiento tiene”, concilia todas las evidencias y finalmente pide confirmación humana cuando corresponda. IMDRF recomienda precisamente almacenar el UDI completo y sus componentes en campos separados, parsear el portador AIDC y permitir la introducción manual cuando no sea escaneable. citeturn11view1turn11view2 |
| **Modelo de datos recomendado** | Separar como mínimo `product`, `product_identifier`, `package_level`, `lot`, `serialized_unit`, `capture_session`, `capture_evidence`, `parsed_observation`, `identification_candidate`, `human_confirmation`, `manufacturer_profile` y `trace_event`. **No mezclar identidad maestra, trazabilidad y evidencia de captura en una única tabla de producto.** Este patrón coincide conceptualmente con UDI y también con HL7 FHIR, que distingue los datos del tipo/modelo de dispositivo de datos como lote, serie y vencimiento de la instancia física. citeturn18search9turn18search17 |

La regla que considero más importante para todo el diseño es:

> **Un código leído es evidencia; no es automáticamente la identidad del artículo.**

Una segunda regla igualmente importante:

> **Identificar el producto y determinar su lote/serie/vencimiento son dos problemas relacionados, pero diferentes.**

Esta separación no es simplemente académica. FDA define el **DI** como la parte fija del UDI que identifica al fabricante/labeler y la versión o modelo; los **PI** son datos variables como lote, serie, fecha de vencimiento y fabricación. GUDID almacena el DI, pero deliberadamente no almacena los valores reales de PI. citeturn18search2turn18search18

En Argentina esta separación también aparece claramente en el Sistema Nacional de Trazabilidad de Productos Médicos: ANMAT utiliza `(01)` GTIN, `(21)` serie, `(10)` lote y `(17)` vencimiento, y exige además que esos datos sean humanamente legibles para permitir carga manual. citeturn15search0turn15search1

Mi recomendación, por tanto, no es construir:

```text
barcode -> producto
```

sino:

```text
                    ┌── GS1 / HIBC / ICCBBA parser
DataMatrix ─────────┤
Barcode 1D ─────────┤
OCR / REF / LOT ────┼──► observaciones ─► candidatos ─► resolución ─► confirmación
Carga manual ───────┤                           │
Registro UDI ───────┤                           ├── artículo
Catálogo fabricante ┘                           ├── lote
                                                ├── serie
                                                └── vencimiento
```

Ese cambio de enfoque resuelve prácticamente todos los casos anómalos que planteas.

## Cómo encajan los estándares y qué están haciendo otros sistemas

### GS1, DataMatrix, UDI, GTIN, REF y datos de producción

Un **Data Matrix** es una simbología bidimensional. Que visualmente un código sea Data Matrix **no significa automáticamente que sea GS1 DataMatrix ni que contenga un UDI**. GS1 DataMatrix añade la estructura de GS1 y utiliza Application Identifiers para indicar el significado de los valores codificados; GS1 define los AIs precisamente como prefijos que especifican significado y formato para datos como GTIN, lote, serial y vencimiento. citeturn17search0turn17search8

En el caso habitual de dispositivos sanitarios GS1:

```text
(01) 07791234567890
(17) 281231
(10) LOT24051
(21) SN00018423
```

significa conceptualmente:

```text
01 -> GTIN
17 -> vencimiento
10 -> lote
21 -> serie
```

ANMAT utiliza justamente esos cuatro identificadores para los productos alcanzados por su sistema de trazabilidad y aclara que los AIs `(01)`, `(10)`, `(17)` y `(21)` **no forman parte del valor que debe almacenarse en los respectivos campos**. citeturn15search0turn15search1

El **GTIN** identifica un *trade item*, es decir, una determinada presentación comercial del producto. No debe confundirse con la unidad física individual. GS1 además asigna GTIN diferentes a niveles de envase diferentes cuando dichos niveles son unidades comerciales: una unidad, una caja y un pack pueden, por tanto, tener GTIN diferentes sin tratarse de productos clínicamente diferentes. Las reglas Healthcare GTIN Allocation Rules vigentes fueron actualizadas a la versión 11.0 en julio de 2026. citeturn17search5turn17search2turn17search21

Esto es muy relevante para tu problema de “dos códigos distintos en el mismo producto”: un GTIN de la caja exterior y otro del envase unitario **no necesariamente están en conflicto**. El modelo debe conocer el nivel de packaging.

El **UDI** introduce otra abstracción. En la terminología internacional, el **UDI-DI** identifica el modelo/versión del dispositivo mientras que los **UDI-PI** representan información variable de producción. FDA define entre los PI el lote/batch, número de serie, vencimiento, fecha de fabricación y, cuando corresponda, identificadores específicos de determinados productos de tejidos/células. citeturn18search2turn18search15

Un punto especialmente importante es que:

**UDI-DI no es sinónimo universal de GTIN.**

Cuando el sistema UDI utilizado es GS1, el GTIN desempeña el papel de DI. Pero existen otros esquemas. FDA mantiene acreditadas como agencias emisoras a **GS1, HIBCC e ICCBBA**, cada una con su propia sintaxis. AccessGUDID dispone incluso de una API que recibe un UDI GS1, HIBCC o ICCBBA y devuelve sus componentes estructurados. citeturn14search2turn18search1

HIBC/HIBCC merece ser soportado en un ERP médico serio. Su estándar distingue información primaria de producto y datos secundarios como lote, serie y vencimiento. Oracle Cloud Inventory, por ejemplo, implementa actualmente un parser HIBC que puede extraer número de parte del fabricante, lote, serie, vencimiento y fecha de fabricación, y permite incluso configurar formatos propietarios adicionales con múltiples elementos. citeturn14search16turn16search3

La **REF** impresa junto al símbolo de “catalogue number” es otro concepto distinto. ISO 15223-1 contempla el *catalogue number* como información de etiquetado de dispositivos médicos. Operativamente debe tratarse como una referencia de catálogo del fabricante, no como un identificador mundialmente único. citeturn14search1turn14search13

En otras palabras:

```text
Fabricante: Acme Orthopaedics
REF: HIPCUP-54
```

puede identificar perfectamente un artículo dentro del catálogo de Acme, pero `HIPCUP-54` por sí solo no debería asumirse globalmente único.

GS1 dispone además del AI `(240)`, denominado **Additional product identification assigned by the manufacturer**, que puede utilizarse como identificación adicional/cross-reference de un producto. Pero esto **no significa que cualquier texto impreso como REF sea automáticamente AI 240**. Sólo debe interpretarse así si realmente ha sido leído dentro de una estructura GS1 válida con ese AI. citeturn17search3turn17search7

### Artículo maestro frente a trazabilidad

Ésta es la separación conceptual que recomiendo reflejar desde la base de datos:

| Concepto | Ejemplo | Duración | Para qué sirve |
|---|---|---|---|
| Artículo | “Cabeza femoral X, 32 mm, fabricante Y” | Persistente | Catálogo, precios, compras, stock |
| Identificador de artículo | GTIN, UDI-DI, HIBC DI, fabricante+REF | Persistente pero versionable | Resolver códigos externos al artículo |
| Lote | `LOT-A9237` | Producción determinada | Recall, vencimiento, trazabilidad |
| Serie | `SN0385784` | Unidad concreta | Identificación de instancia |
| Vencimiento | `2028-12-31` | Lote/unidad | Seguridad y FEFO |
| Evento | recepción, entrega, implante, devolución | Histórico | Cadena de custodia |

FHIR utiliza una separación muy parecida: el UDI puede identificar simplemente el tipo de dispositivo o una instancia concreta cuando el PI contiene suficiente información, y los campos de lote, serie y vencimiento permanecen explícitos. HL7 exige además consistencia entre esos campos y el UDI codificado cuando éste existe. citeturn18search9turn18search17

Por eso **no recomiendo utilizar lote ni serie como clave del artículo maestro**. Son datos de producción asociados a una identidad de producto; el hecho de que un serial parezca único dentro del catálogo de cierto fabricante no lo convierte automáticamente en una clave global de producto.

### Qué hacen los hospitales y sistemas reales

Los casos de hospitales confirman esta arquitectura de referencias cruzadas.

**Eskenazi Health** quería escanear implantes y tejidos y llevar esa información al registro del paciente y facturación. Expresamente decidió **no reemplazar los números de artículo del ERP por los DI**, sino establecer un cross-reference entre ambos. citeturn16search0

**Stanford Health Care** integró Infor Lawson con Epic. Creó almacenamiento separado para los DI en el ERP y los transmitió al EHR; los clínicos podían después escanear el embalaje en el punto de uso. En su piloto de mallas quirúrgicas la captura electrónica pasó de una tarea manual de uno o dos minutos a una lectura de uno o dos segundos, según el caso publicado por AHRMM. citeturn15search3

**Beaver Dam Community Hospital** planteó almacenar los DI dentro del item master del ERP y utilizar esos DI como enlace hacia AccessGUDID y hacia su EHR. Su experiencia también muestra que el reto no es sólo “leer el código”, sino tener normalizados el maestro y las interfaces ERP-EHR. citeturn16search1

**NHS Scan4Safety** va más lejos y utiliza la identificación en el punto de atención para comprobar expiración, recalls e incluso información relevante para evitar utilizar un producto incorrecto antes de abrir el implante. NHS England continúa considerando la tecnología de scanning un elemento central para la trazabilidad de implantes. citeturn16search2turn16search8

Esto produce una conclusión práctica importante: **el código debe desembocar en una identidad de catálogo normalizada antes de que pueda proporcionar seguridad clínica, control de recall, costes o reposición fiable**.

## Resolución práctica de etiquetas incompletas y lecturas difíciles

### Qué hacer cuando falta el GTIN

No debería existir una única ruta:

```text
no hay GTIN => fallo
```

Debe existir una cascada de resolución.

La primera pregunta es si realmente falta una identidad estándar o simplemente **no es GS1**. Un UDI HIBC, por ejemplo, no tiene por qué contener un GTIN; puede llevar un identificador HIBC válido. AccessGUDID contempla explícitamente GS1, HIBCC e ICCBBA. citeturn18search1turn14search2

Si no aparece ningún DI estándar, el segundo nivel es **fabricante + REF / catalogue number**. IMDRF documentó expresamente escenarios donde, al no poder escanearse el UDI, se introduce el número de catálogo/producto, se utiliza para identificar el UDI-DI correspondiente y después se completan manualmente los PI. El Vascular Quality Initiative, por ejemplo, permite localizar dispositivos mediante número de producto/catálogo, fabricante o UDI-DI y después enlazarlos con AccessGUDID. citeturn18search4turn11view3

El tercer nivel es un **barcode propietario previamente aprendido**:

```text
barcode "84570215"
       ↓
product_identifier
scheme = MANUFACTURER_INTERNAL
manufacturer = X
value = 84570215
       ↓
product_id = P-91831
```

Eso es perfectamente válido como resolución operacional, siempre que el sistema conserve que la fuente fue un identificador propietario y no lo presente como GTIN/UDI.

El cuarto nivel debe ser **OCR de fabricante + REF/modelo**.

El quinto, **selección manual asistida**, con búsqueda restringida por fabricante, familia, medida, descripción y referencias observadas.

Y sólo finalmente debería existir una opción de “crear producto nuevo / dejar pendiente de catalogación”.

Para productos alcanzados por el **SNT-PM argentino**, la ausencia de GTIN no debería solucionarse inventando uno localmente. ANMAT indica que los productos alcanzados deben identificarse mediante GTIN, serie, lote y vencimiento según corresponda y contempla específicamente el procedimiento para importadores cuando el producto no viene identificado con GTIN y serie desde origen. citeturn15search0

En consecuencia recomiendo almacenar algo como:

```text
gtin_status:
  PRESENT
  NOT_APPLICABLE
  NOT_SUPPLIED
  EXPECTED_BUT_MISSING
  PENDING_REGULATORY_REVIEW
```

en lugar de convertir `GTIN` en un campo obligatorio del artículo o, en el extremo contrario, ignorar completamente su ausencia.

### Cómo unir varios códigos de un mismo envase

La **sesión de captura** es la pieza que permite resolver tu escenario.

Imagina un implante con:

```text
Code 128:
  8400951
    -> referencia interna del fabricante

Data Matrix:
  lote L2419
  vencimiento 2029-06-30

Texto:
  REF ACET-54-R
  SN 000392810
```

No debes exigir que uno de los tres sea “el código correcto”.

Los tres son observaciones pertenecientes a la misma sesión:

```text
CaptureSession CS-10038

Evidence E1
  Code128 = "8400951"
        └─> product alias -> P-287

Evidence E2
  DataMatrix
        ├─> lot = L2419
        └─> expiry = 2029-06-30

Evidence E3
  OCR
        ├─> REF = ACET-54-R
        └─> serial = 000392810
```

Después:

```text
Resolved product: P-287
Lot:              L2419
Serial:           000392810
Expiry:           2029-06-30
```

Ésta es una consecuencia natural de la recomendación de IMDRF de separar el UDI completo, DI y PI en campos distintos y de permitir captura manual cuando el portador AIDC no se puede escanear. citeturn11view1turn11view2

### Orden de captura que recomiendo

El sistema debería intentar, aproximadamente:

```text
Lectura AIDC estándar
       ↓
GS1 / HIBC / ICCBBA parser
       ↓
barcode propietario conocido
       ↓
segundo/tercer código del envase
       ↓
OCR del texto humanamente legible
       ↓
entrada manual asistida
```

No recomiendo utilizar OCR antes que un decoder de barcode cuando existe un código legible. El texto HRI está precisamente pensado como respaldo; ANMAT exige la versión humanamente legible de los datos de trazabilidad para permitir una carga manual. citeturn15search0

### Cuando la cámara del móvil no puede leer

No conviene considerar que “la cámara no lo lee” equivale a “el código está mal”.

Los GS1 DataMatrix pueden ser físicamente muy pequeños, y GS1 referencia **ISO/IEC 15415** e **ISO/IEC 29158** para evaluar la calidad de símbolos 2D/DataMatrix, particularmente en escenarios complejos. Es importante no confundir estas métricas de calidad del símbolo con una puntuación de confianza de la identificación dentro de tu ERP. citeturn17search1turn17search8

Para los distintos escenarios recomiendo esta jerarquía:

| Método | Dónde lo usaría | Ventaja | Limitación |
|---|---|---|---|
| Cámara móvil | Uso ocasional, recepción ligera, comerciales | Sin hardware adicional | Sufre más con códigos diminutos, desenfoque, reflejos, plástico y movimiento |
| Imager USB/Bluetooth profesional | Recepción, depósito, quirófano | Óptica/iluminación y ergonomía especializadas; respuesta más consistente | Requiere hardware dedicado |
| Scanner DPM / industrial | Instrumental marcado directamente, superficies brillantes, puestos fijos | Iluminación y óptica especializadas | Mayor coste y menos movilidad |
| Cámara industrial | Volumen alto o puesto automatizado | Control preciso de foco, lente e iluminación | Integración más compleja |
| OCR | Cuando el DataMatrix falla pero HRI/REF/LOT/SN son visibles | Recupera información sin barcode | Hay que validar cada campo y tratarlo como evidencia de menor fiabilidad |
| Entrada manual asistida | Último recurso | Siempre disponible | Más lenta y susceptible a error humano |

Por ejemplo, Zebra ofrece lectores orientados a DPM con iluminación para superficies reflectantes e irregulares; Datalogic dispone de lectores con modelos polarizados para superficies reflectantes, y también existen lectores que combinan decodificación 1D/2D y OCR de campos impresos. citeturn6search0turn6search21turn6search27

Para movilidad, existen lectores Bluetooth 2D diseñados específicamente para códigos deteriorados, de bajo contraste o de calidad deficiente. Eso hace razonable que una aplicación móvil soporte tanto la cámara incorporada como lectores externos que se presenten como HID/keyboard o mediante SDK. citeturn6search7

### No depender de un solo motor de lectura

También recomiendo una interfaz de software desacoplada:

```text
BarcodeDecoder
    ├─ MobileNativeDecoder
    ├─ DecoderEngineA
    ├─ DecoderEngineB
    └─ HardwareScannerDecoder
```

Google ML Kit y ZXing, por ejemplo, soportan Data Matrix junto a los principales formatos 1D y 2D, mientras que existen SDK comerciales especializados que permiten configuraciones adicionales para códigos difíciles. citeturn20search0turn20search1turn20search7

Esto permite un **modo de rescate**:

```text
frame original
  ├─ decoder A
  ├─ decoder B
  ├─ recorte / rotación
  └─ decoder C

         ↓

consenso / resultados candidatos
```

No recomiendo ejecutar todos los motores permanentemente: es mejor usar uno principal optimizado y pasar a los alternativos tras varios intentos fallidos. También conviene limitar las simbologías activas en cada contexto; la documentación de Scandit, por ejemplo, recomienda habilitar sólo las simbologías esperadas cuando se conocen, tanto por rendimiento como para evitar lecturas no deseadas. citeturn20search2turn20search6

## Confianza, conflictos y perfiles de fabricante

### La confianza no debería ser una única propiedad del scanner

No encontré en UDI, GS1 o IMDRF una “puntuación universal de confianza de identificación” que puedas adoptar directamente. Los estándares especifican sintaxis, identificadores, datos y calidad de símbolos; **la confianza de que varias evidencias corresponden al producto correcto es una decisión de aplicación**. GS1 sí define mecanismos de validación y estándares de calidad del símbolo, pero un DataMatrix de excelente calidad puede contener una referencia que tu sistema no conozca, y una lectura OCR mediocre puede resultar correcta tras una confirmación humana. citeturn17search0turn17search8

Por eso recomiendo mantener **tres dimensiones distintas**:

```text
capture_quality
    ¿Qué tan fiable fue físicamente la lectura?

parse_validity
    ¿La cadena cumple GS1/HIBC/etc.?

resolution_confidence
    ¿Qué tan seguro estoy de que corresponde
    a este producto/lote/serie?
```

Y además:

```text
confirmation_status
    ¿Un usuario autorizado ya lo confirmó?
```

No pondría:

```text
confidence = 100
```

simplemente porque un usuario pulsó “Aceptar”. La decisión humana y la estimación automática son hechos diferentes y ambos tienen valor para auditoría y futura calibración.

### Cómo calcularía la confianza

Para empezar utilizaría un **scoring explicable basado en reglas**, no un modelo de IA.

Por ejemplo, para identificar el artículo:

| Evidencia | Peso orientativo |
|---|---:|
| DI/GTIN válido con coincidencia exacta en maestro o registro autorizado | +40 |
| fabricante + REF exactos | +25 |
| segundo código independiente que apunta al mismo producto | +15 |
| metadatos externos coherentes: fabricante/modelo/tamaño | +10 |
| perfil del fabricante explica completamente el layout | +10 |
| OCR como única fuente de REF | −10 |
| checksum/sintaxis inválida | −25 |
| otro código afirma un producto diferente | −40 |

Entonces:

```text
raw_identity_score =
    sum(evidencias positivas)
    - sum(penalizaciones)
```

normalizado después a `0..1`.

Para trazabilidad usaría **otra puntuación**:

```text
traceability_score =
    calidad_lote
  + calidad_serie
  + calidad_vencimiento
  + corroboración
  - conflictos
```

porque puedes saber con altísima certeza cuál es el producto y no haber logrado leer el número de serie.

Ejemplo:

```text
Producto:
  GTIN exacto                +40
  catálogo local coincide   +25
  REF visible coincide      +15
  fabricante coincide       +10
  perfil conocido           +10
  -----------------------------
  identidad                 100/100

Trazabilidad:
  lote machine-readable      30
  vencimiento machine        25
  serie OCR                  20
  sin segunda corroboración   0
  -----------------------------
  trazabilidad                75/100
```

Eso expresa mucho mejor la situación que `confidence=0.88`.

Los pesos anteriores son **una propuesta de diseño, no un estándar GS1/UDI**. Después de acumular miles de confirmaciones reales deberías calibrarlos contra tu historial: qué puntuaciones acabaron aceptándose y qué puntuaciones acabaron corregidas. Sólo después de esa calibración tendría sentido presentar el número como una probabilidad estadística.

Operativamente utilizaría categorías como:

```text
VERIFIED_STANDARD
HIGH_CONFIDENCE
NEEDS_CONFIRMATION
AMBIGUOUS
UNRESOLVED
```

Para una recepción de consumibles baratos podrías automatizar `VERIFIED_STANDARD`. Para asociar un **implante a un paciente**, recomiendo confirmación humana explícita incluso con identificación automática perfecta. La lógica de Scan4Safety muestra precisamente el valor de verificar producto, expiración y recall antes del uso del implante. citeturn16search2turn16search6

### Qué hacer cuando dos códigos “se contradicen”

Primero hay que determinar **si realmente se contradicen**.

Supongamos:

```text
Código A -> GTIN 001
Código B -> GTIN 002
```

Antes de declarar conflicto, hay que consultar:

```text
GTIN 001 -> producto P42, envase EACH
GTIN 002 -> producto P42, envase BOX/5
```

Eso puede ser completamente correcto porque GS1 permite GTIN distintos por nivel de packaging. citeturn17search2turn17search25

Otro caso:

```text
Código A -> REF X500
Código B -> lote X500
```

Los textos coinciden pero la **semántica es diferente**. Nunca debe compararse sólo la cadena; debe compararse `(tipo, valor)`.

Por tanto, el reconciliador debe trabajar con afirmaciones:

```text
E1 asserts product_identifier = 077912...
E2 asserts manufacturer_ref  = ACET54
E3 asserts lot               = L902
E4 asserts serial            = 00381
E5 asserts expiry            = 2029-10-31
```

Dos evidencias sólo entran en conflicto cuando afirman **distintos valores para el mismo concepto y el mismo ámbito**.

Por ejemplo:

```text
E1: serial = 00381
E2: serial = 00387
```

es un verdadero conflicto.

Mi política sería:

```text
si campo no crítico:
    mostrar discrepancia
    usuario decide

si lote/serie/vencimiento de implante:
    bloquear confirmación automática
    requerir selección humana

si identidad de producto:
    no actualizar master automáticamente
    investigar packaging / etiqueta externa / alias
```

Nunca usaría una regla del tipo “el último código leído gana”.

FHIR también expresa esta exigencia de consistencia: cuando existe UDI, los datos separados de lote, vencimiento, etc. deben ser coherentes con la información codificada en el UDI o en el repositorio correspondiente. citeturn18search9turn18search17

### Perfiles específicos por fabricante

Ésta será probablemente una de las funciones que más valor aporte al ERP después de unos meses de uso.

No recomiendo código del estilo:

```python
if manufacturer == "Fabricante X":
    value = barcode[4:12]
```

Recomiendo reglas declarativas y versionadas.

Un perfil podría contener:

```text
ManufacturerProfile
  manufacturer_id
  version
  valid_from
  valid_to

  Rules[]
    expected_symbology
    value_prefix / regex
    semantic_role
    priority
    packaging_level
    date_format
    checksum_rule
    case_sensitive
    parser
    OCR_anchors
    conflict_policy
```

Ejemplo:

```text
Fabricante X / Profile v4

Code128 prefix "90":
    role = PRODUCT_REFERENCE

DataMatrix proprietary:
    first field = LOT
    second field = EXPIRY_YYMMDD

Visible label:
    "REF" -> PRODUCT_REFERENCE
    "LOT" -> LOT
    "SN"  -> SERIAL
    hourglass symbol -> EXPIRY
```

La necesidad de una capa de configuración de formatos no es puramente teórica. Oracle Inventory, por ejemplo, además de su formato HIBC predefinido permite configurar formatos de barcode personalizados con elementos múltiples y secuencias específicas. citeturn16search3

El perfil debería ejecutarse **después de los parsers estándar**:

```text
GS1?
  sí -> parser GS1
  no
    ↓
HIBC?
  sí -> parser HIBC
  no
    ↓
ICCBBA?
  sí -> parser ICCBBA
  no
    ↓
perfil fabricante
  ↓
genérico / OCR / manual
```

Así evitas que una regla propietaria interprete accidentalmente como código interno un GS1 perfectamente válido.

Otra recomendación esencial: una confirmación del usuario puede **proponer** un nuevo alias o regla, pero no debe publicar automáticamente un perfil para todos los futuros productos.

Usaría:

```text
PROPOSED
APPROVED
REJECTED
RETIRED
```

con usuario aprobador y auditoría.

## Flujo operativo recomendado

El flujo siguiente sería mi diseño de referencia para recepción, depósito y quirófano.

### Captura

El operador inicia implícita o explícitamente una `capture_session`. La aplicación permanece abierta a **varios códigos del mismo envase**, en lugar de cerrar el flujo cuando obtiene la primera lectura.

```text
[Escanear producto]

Detectados:
✓ DataMatrix
✓ Code 128
○ Otro código
○ Añadir foto/texto
```

Cada lectura conserva el valor bruto antes de cualquier transformación.

### Clasificación

Por cada lectura:

```text
detectar simbología
      ↓
preservar raw bytes/string
      ↓
detectar estándar
      ├─ GS1
      ├─ HIBC
      ├─ ICCBBA
      ├─ propietario conocido
      └─ desconocido
```

Un Data Matrix visualmente parecido a GS1 pero que no valida como GS1 debe quedar registrado como, por ejemplo:

```text
symbology = DATA_MATRIX
syntax = PROPRIETARY_OR_UNKNOWN
```

y **no**:

```text
symbology = GS1_DATAMATRIX
```

por conveniencia.

### Extracción de observaciones

Una lectura válida se transforma en campos independientes:

```text
raw:
  "..."

parsed:
  product_identifier
  manufacturer_ref
  lot
  serial
  expiry
  manufacture_date
```

IMDRF recomienda que los sistemas puedan capturar el portador UDI y separar DI y PI en campos distintos, preservando además el UDI completo. citeturn11view1

### Resolución del artículo

Orden recomendado:

```text
UDI-DI / GTIN / HIBC DI / ICCBBA DI
               ↓
     product_identifier
               ↓
         product_id
```

Si no resuelve:

```text
fabricante + REF
```

Si no:

```text
barcode propietario conocido
```

Si no:

```text
registro externo / catálogo fabricante
```

Si no:

```text
OCR + búsqueda fuzzy restringida
```

Si no:

```text
selección manual
```

AccessGUDID puede utilizarse para búsquedas de dispositivos por DI, nombre y empresa en el ecosistema FDA, y el caso IMDRF del VQI demuestra el uso de número de catálogo y fabricante como caminos alternativos hasta un UDI-DI. citeturn18search2turn18search4

Para Europa, **EUDAMED** debe contemplarse como otra fuente regulatoria relevante. Desde el **28 de mayo de 2026**, el módulo UDI/Devices es de uso obligatorio, junto con Actor Registration, Notified Bodies & Certificates y Market Surveillance. citeturn15search2turn15search4turn15search6

No confundas además **Basic UDI-DI europeo** con el código que esperas escanear del envase. La Comisión Europea lo define como clave principal en base de datos y documentación regulatoria; es independiente del etiquetado/packaging del dispositivo. citeturn14search3turn14search23

### Completado de trazabilidad

Una vez conocido el producto:

```text
¿Lote requerido?        ✓/✗
¿Serie requerida?       ✓/✗
¿Vencimiento requerido? ✓/✗
```

Los campos pueden provenir de otra lectura.

La UI debería indicarlo explícitamente:

```text
Artículo
✓ ACME Femoral Head 32 mm
  identificado por GTIN

Lote
✓ LOT24918
  leído de DataMatrix

Serie
! Falta serie
  [Escanear otro código]
  [Leer texto]
  [Ingresar manualmente]

Vencimiento
✓ 31/12/2029
```

Esto evita el error conceptual de declarar “escaneo fallido” cuando en realidad **el producto ya fue identificado y sólo falta un PI**.

### Reconciliación

Una vez reunidas suficientes observaciones:

```text
resolver packaging
comparar fabricante
comparar REF
comparar GTIN/DI
comparar lote
comparar serie
comparar vencimiento
```

Los datos complementarios se agregan.

Los datos contradictorios se elevan.

```text
⚠ Se detectaron dos números de serie

DataMatrix: SN004518
Texto/OCR:  SN004513

[Ver fotografía]
[Escanear nuevamente]

Confirmar:
( ) SN004518
( ) SN004513
( ) Otro
```

### Confirmación

La pantalla final no debería mostrar sólo el código. Debería mostrar el **significado clínico/comercial**:

```text
Fabricante: Zimmer / ...
Artículo:   ...
REF:        ...
Tamaño:     ...
Lateralidad: ...
GTIN:       ...
Lote:       ...
Serie:      ...
Vence:      ...
```

Para una entrega o implante:

```text
Paciente/procedimiento: ...
Producto: ...
Lote/serie: ...
Vencimiento: ...
Estado recall: ...
```

El modelo Scan4Safety precisamente busca unir productos con pacientes, lugares y procesos, y NHS documenta la utilidad de las alertas de producto vencido, recall o selección incorrecta antes de utilizar el implante. citeturn16search15turn16search2

### Aprendizaje después de confirmar

Después de la confirmación:

```text
nuevo barcode propietario?
        ↓
crear alias PROPOSED

nuevo patrón del fabricante?
        ↓
crear profile-rule PROPOSED

corrección de OCR?
        ↓
guardar para métricas/entrenamiento

conflicto resuelto?
        ↓
guardar elección + motivo
```

El flujo completo quedaría:

```text
CAPTURE
   ↓
DECODE
   ↓
PARSE
   ↓
RESOLVE PRODUCT
   ↓
ENRICH TRACEABILITY
   ↓
RECONCILE
   ↓
SCORE
   ↓
HUMAN CONFIRMATION
   ↓
TRANSACTION
   ↓
AUDIT / LEARNING
```

### Diferencias por contexto operativo

No usaría exactamente la misma política de confirmación en todos los lugares.

| Contexto | Política |
|---|---|
| Alta inicial de artículo | Confirmación fuerte; modificaciones al maestro controladas |
| Recepción | Se puede automatizar con identificador conocido, pero validar lote/vencimiento |
| Picking | Identidad + lote/serie según control del artículo |
| Transferencia | Escaneo rápido contra unidad/lote ya conocido |
| Quirófano | Confirmación explícita de implante/unidad; comprobaciones de vencimiento/recall |
| Devolución | Identificar unidad/lote original y validar estado |
| Recall | Buscar todas las unidades/eventos por DI/GTIN + lote/serie según alcance |

En Argentina, el SNT-PM contempla eventos como recepción, distribución, implantación a paciente, devolución, destrucción y robo/extravío, por lo que un ERP destinado a distribuidores debería modelar la trazabilidad como **eventos**, no sólo como el estado actual del stock. citeturn15search0

## Modelo de datos recomendado

La siguiente arquitectura soporta tanto los productos impecablemente estandarizados como las etiquetas problemáticas que describes.

### Maestro de producto

```text
Product
------
product_id UUID PK
manufacturer_id FK
canonical_ref
brand
model
description
family
size
laterality
material
sterile
single_use
implantable
regulatory_class
active
created_at
updated_at
```

`product_id` debe ser interno, estable e inmutable.

No recomiendo:

```text
GTIN PRIMARY KEY
```

ni:

```text
REF PRIMARY KEY
```

porque un producto puede poseer múltiples identificadores externos, cambiar de identificadores históricos y existir en distintos niveles de packaging. Los hospitales citados anteriormente utilizaron precisamente tablas/cross-references entre su identificador interno y los DI externos. citeturn16search0turn15search3

### Niveles de packaging

Añadiría una entidad explícita:

```text
ProductPackage
--------------
package_id
product_id
level
quantity
unit_of_measure
parent_package_id
active
```

Ejemplos:

```text
P42 / EACH / 1
P42 / BOX  / 5
P42 / CASE / 20
```

Cada nivel puede tener sus propios identificadores. Esto se ajusta a las reglas GS1, según las cuales los niveles superiores considerados trade items reciben GTIN separados. citeturn17search2turn17search25

### Identificadores y aliases

Ésta es probablemente la tabla más importante:

```text
ProductIdentifier
-----------------
identifier_id
product_id
package_id nullable

scheme
issuer
value_raw
value_normalized

manufacturer_id nullable
identifier_role

is_primary
status

valid_from
valid_to

source_type
source_reference
verified_by
verified_at
```

`scheme` podría contener:

```text
GTIN
UDI_DI_GS1
UDI_DI_HIBC
UDI_DI_ICCBBA
MANUFACTURER_REF
MANUFACTURER_BARCODE
DISTRIBUTOR_BARCODE
INTERNAL_SKU
ANMAT_REGISTRATION
LEGACY_CODE
OTHER
```

Y `identifier_role`:

```text
PRODUCT_IDENTITY
PACKAGE_IDENTITY
ADDITIONAL_ID
LOGISTICS_ID
LEGACY_ALIAS
```

No aplicaría una única restricción `UNIQUE(value)` a toda la tabla.

Por ejemplo:

```text
GTIN:
  unicidad global según esquema

REF:
  unicidad normalmente dentro de manufacturer

INTERNAL_SKU:
  unicidad dentro de tu organización

manufacturer barcode:
  scope según perfil
```

Además conservaría **raw y normalized por separado**.

Esto es particularmente importante en Argentina porque ANMAT señala explícitamente que lote y serie pueden ser alfanuméricos y diferenciar mayúsculas de minúsculas. Por ello no deberías convertir indiscriminadamente todos los seriales y lotes a uppercase como mecanismo de normalización. citeturn15search0

### Lotes

```text
Lot
---
lot_id
product_id
lot_number_raw
lot_number_normalized
manufacture_date
expiry_date
supplier_id
status
created_from_session_id
```

La clave lógica debería incluir al menos el producto:

```text
(product_id, lot_number_normalized)
```

no simplemente:

```text
lot_number
```

porque dos fabricantes/productos pueden reutilizar cadenas idénticas de lote.

### Unidades serializadas

```text
SerializedUnit
--------------
unit_id
product_id
package_id
lot_id nullable

serial_raw
serial_normalized

manufacture_date nullable
expiry_date nullable

status
current_location_id
```

Esto permite artículos:

```text
solo lote
solo serie
lote + serie
sin ninguno
```

sin forzar una estructura artificial.

### Sesión de captura

```text
CaptureSession
--------------
session_id
business_context
transaction_id nullable
user_id
location_id
started_at
completed_at
status
```

`business_context`:

```text
RECEIVING
CATALOGUE
PICKING
TRANSFER
SURGERY
IMPLANT
RETURN
RECALL
INVENTORY_COUNT
```

### Evidencia de lectura

No guardaría solamente el valor finalmente aceptado.

Guardaría:

```text
CaptureEvidence
---------------
evidence_id
session_id

source_type
capture_device
device_model

symbology
aim_symbology_identifier nullable

raw_bytes nullable
raw_text

image_uri nullable
image_hash nullable
bounding_box nullable

decoder_engine
decoder_version

capture_quality nullable

captured_by
captured_at
```

`source_type`:

```text
CAMERA_BARCODE
USB_SCANNER
BLUETOOTH_SCANNER
INDUSTRIAL_SCANNER
OCR
MANUAL
API
REGISTRY
```

Esto permite responder meses más tarde:

> “¿De dónde salió este serial?”

y no solamente:

> “Está en la base”.

Para imágenes clínicas/productivas sensibles almacenaría el fichero fuera de la fila principal, con URI, hash, política de retención y controles de acceso. El hash sirve para verificar integridad sin necesitar duplicar el blob por todas partes.

### Observaciones parseadas

Ésta es la otra entidad crucial:

```text
ParsedObservation
-----------------
observation_id
evidence_id

semantic_type
raw_value
normalized_value

parser
parser_version
manufacturer_profile_version nullable

validation_status
confidence

metadata_json
```

`semantic_type`:

```text
GTIN
UDI_DI
REF
LOT
SERIAL
EXPIRY
MANUFACTURE_DATE
MANUFACTURER
MODEL
SIZE
LATERALITY
UNKNOWN
```

Una evidencia puede generar muchas observaciones:

```text
DataMatrix E102
   ├─ Observation GTIN
   ├─ Observation LOT
   ├─ Observation SERIAL
   └─ Observation EXPIRY
```

Eso reproduce exactamente el modelo UDI/GS1 de separar la información codificada en elementos significativos. citeturn17search0turn18search1

### Candidatos de identificación

```text
IdentificationCandidate
-----------------------
candidate_id
session_id
product_id
package_id nullable

identity_score
traceability_score

score_algorithm
score_version

status
explanation_json
```

Y mantendría la relación con las evidencias que justifican el candidato:

```text
CandidateEvidence
-----------------
candidate_id
observation_id
weight
effect
reason
```

De esa forma puedes enseñar al usuario:

```text
95% - ACME Cup 54 mm

Razones:
✓ GTIN coincide
✓ fabricante coincide
✓ REF coincide
✓ segundo barcode coincide
```

en lugar de un misterioso `confidence = .95`.

### Confirmación humana

```text
HumanConfirmation
-----------------
confirmation_id
session_id

selected_product_id
selected_package_id
selected_lot_id
selected_unit_id

confirmed_lot_value
confirmed_serial_value
confirmed_expiry

action
reason_code
reason_text

previous_values_json
confirmed_values_json

user_id
user_role
confirmed_at
```

`action`:

```text
ACCEPTED
CORRECTED
REJECTED
CREATED_PRODUCT
CREATED_ALIAS
ESCALATED
```

La confirmación **no debe destruir los candidatos descartados**.

Si el sistema propuso:

```text
A 80%
B 20%
```

y el operador eligió `B`, ése es precisamente uno de los ejemplos más útiles para mejorar posteriormente la resolución.

### Perfiles de fabricante

```text
ManufacturerProfile
-------------------
profile_id
manufacturer_id
version
status
valid_from
valid_to
approved_by
approved_at
```

y:

```text
ManufacturerParseRule
---------------------
rule_id
profile_id

symbology
match_expression
semantic_role
parser_type

field_mapping
date_format
case_policy
checksum_policy
package_level

priority
```

También guardaría reglas OCR:

```text
OCRAnchorRule
-------------
profile_id
label
regex

"REF" -> reference
"LOT" -> lot
"SN"  -> serial
```

### Eventos de trazabilidad

Finalmente:

```text
TraceEvent
----------
event_id
event_type
occurred_at

product_id
package_id
lot_id nullable
unit_id nullable

quantity

from_location_id nullable
to_location_id nullable

actor_id
transaction_id

procedure_reference nullable
patient_reference nullable

source_session_id
```

Eventos:

```text
RECEIVED
PUT_AWAY
MOVED
RESERVED
PICKED
SHIPPED
DELIVERED
OPENED
USED
IMPLANTED
RETURNED
RECALL_HOLD
DESTROYED
LOST
STOLEN
```

Ésta es la parte del modelo donde podría incorporarse **GS1 EPCIS** si en el futuro necesitas interoperabilidad formal de eventos de trazabilidad entre organizaciones. En cambio, para integración clínica hospitalaria, **HL7 FHIR Device/DeviceDefinition** es el estándar que conviene estudiar. FHIR ya ofrece estructuras explícitas para UDI carrier, device identifier, lote, serie, fecha de fabricación y vencimiento. citeturn18search17turn18search19

En el contexto argentino, esta arquitectura por eventos encaja además mucho mejor con los movimientos que ANMAT pide informar al SNT-PM —recepción, distribución, implantación, devolución, destrucción y robo/extravío— y ANMAT permite la integración mediante Web Service. citeturn15search0

### Qué conservar después de una confirmación

Después de que el usuario confirma una identificación, recomiendo **no reducir toda la sesión al resultado final**.

Deberían sobrevivir:

| Información | Guardar |
|---|---|
| Cadenas crudas leídas | Sí |
| Simbología | Sí |
| AIM/symbology identifier cuando esté disponible | Sí |
| Fotografía original/crop cuando la política lo permita | Sí |
| Resultado OCR original | Sí |
| Motor y versión de decoding | Sí |
| Parser y versión | Sí |
| Perfil de fabricante y versión | Sí |
| Todos los campos extraídos | Sí |
| Todos los candidatos de producto | Sí |
| Scores anteriores a confirmación | Sí |
| Producto finalmente seleccionado | Sí |
| Lote/serie/vencimiento finalmente seleccionados | Sí |
| Correcciones del usuario | Sí |
| Motivo del conflicto/corrección | Sí |
| Usuario y rol | Sí |
| Fecha/hora y ubicación | Sí |
| Contexto de transacción | Sí |
| Consulta a registro regulatorio y clave utilizada | Sí |
| Nueva asociación/alias aprendida | Sí, pero separada y gobernada |

Esto convierte la identificación en un proceso auditable y hace posible mejorar el sistema sin perder la evidencia histórica.

## Qué estudiar antes de construir el sistema

### Estándares prioritarios

La pila que estudiaría, por orden de relevancia, es:

**IMDRF UDI.** Utilízalo como modelo conceptual neutral de fabricante y jurisdicción: identidad DI separada de datos de producción PI. IMDRF busca precisamente una identificación armonizada internacional de dispositivos, y su guía de uso en sistemas sanitarios recomienda captura, parsing y almacenamiento separado de los componentes UDI, además de alternativas manuales cuando el código no es legible. citeturn18search0turn11view1turn11view2

**GS1 General Specifications, GS1 Application Identifiers, GS1 DataMatrix Guideline y Healthcare GTIN Allocation Rules.** Para tu escenario argentino son fundamentales. La versión vigente de las reglas Healthcare GTIN Allocation Rules es 11.0, publicada en julio de 2026. citeturn17search0turn17search8turn17search21

**HIBC/HIBCC Supplier Labeling Standard.** No deberías asumir que todos los dispositivos internacionales utilizarán GS1. HIBCC mantiene un estándar específico de etiquetado de proveedores sanitarios y está reconocido como sistema UDI. citeturn14search8turn14search16

**ICCBBA/ISBT 128**, especialmente si en el futuro entran tejidos, células y otros productos biológicos. El hecho de que FDA y AccessGUDID contemplen ICCBBA junto a GS1/HIBCC justifica que la arquitectura no esté acoplada exclusivamente a GTIN. citeturn14search2turn18search1

**ISO/IEC 16022, ISO/IEC 15415 e ISO/IEC 29158**, si vas a especificar hardware, iluminación o aceptación de calidad de DataMatrix/DPM. GS1 referencia 15415 y 29158 para evaluación de calidad de GS1 DataMatrix. citeturn17search1turn17search8

**ISO 15223-1**, para comprender la información y símbolos humanamente legibles utilizados en etiquetas de dispositivos, entre ellos referencias de catálogo y otros datos de etiquetado. citeturn14search1turn14search13

**ANMAT SNT-PM y Disposición 2303/2014**, como requisito de primera clase si el ERP se utilizará en Argentina. El diseño debería conocer nativamente GTIN, serie, lote, vencimiento y los eventos del sistema de trazabilidad, sin tratarlos como extensiones improvisadas. citeturn15search0turn15search1

**FDA UDI/GUDID/AccessGUDID**, aunque no operes en Estados Unidos, porque ofrece un excelente modelo práctico y una API pública de parsing de UDI GS1/HIBCC/ICCBBA. GUDID debe utilizarse como catálogo de identidad —DI— y no como repositorio de lotes/series reales, porque no almacena esos PI. citeturn18search1turn18search2turn18search18

**EU MDR/IVDR y EUDAMED**, sobre todo si manejas productos europeos. A fecha de agosto de 2026 el módulo UDI/Devices ya es obligatorio desde el 28 de mayo de 2026. También merece atención la diferencia europea entre Basic UDI-DI, utilizado a nivel regulatorio/documental, y UDI-DI de dispositivo. citeturn15search4turn14search3

**HL7 FHIR Device y DeviceDefinition**, si vas a conectarte con hospitales/EHR. El modelo de FHIR para dispositivos ya representa UDI, DI, lote, serie y vencimiento y exige coherencia entre la información separada y el UDI. citeturn18search17turn18search9

### Sistemas y proyectos que merece la pena comparar

No intentaría copiar uno de estos productos entero; estudiaría cada uno por una razón concreta.

| Sistema/proyecto | Qué observar |
|---|---|
| **Eskenazi UDI implementation** | Su decisión de mantener el código interno del ERP y crear cross-references con UDI es prácticamente el patrón que recomiendo para tu maestro. citeturn16search0 |
| **Stanford Health Care + Infor Lawson + Epic** | Cómo almacenar DI en ERP y trasladarlo al EHR para scanning en el punto de uso. citeturn15search3 |
| **NHS Scan4Safety** | Modelo “persona-producto-lugar-proceso”, implant scanning, recalls y verificaciones antes de abrir el producto. citeturn16search2turn16search15 |
| **Oracle Inventory HIBC** | Muy interesante desde el punto de vista del parser configurable: HIBC estándar, múltiples componentes y formatos custom. citeturn16search3 |
| **h-trak** | Está orientado al punto de atención y decodificación de barcodes sanitarios para procedimientos/implantes; GS1 UK describe su uso para decodificar GS1 y capturar implantes y otros elementos de procedimiento. citeturn19search2 |
| **TrackCore** | Interesante para estudiar el ciclo específico de tejidos e implantes, incluyendo scanning UDI, inventario, vencimientos y recalls. Las características concretas deben evaluarse como afirmaciones del proveedor. citeturn19search0turn19search16 |
| **BD Pyxis Tissue & Implant** | Buen ejemplo de cómo integrar inventario perioperatorio, scanner inalámbrico y seguimiento de tejidos/implantes. citeturn19search3 |
| **Censis CensiTrac** | Más relevante para instrumental y activos quirúrgicos: seguimiento a nivel de instrumento, procedimiento y paciente, complementando el problema de consumibles/implantes. citeturn19search1 |

Hay un patrón común particularmente valioso entre estos casos: **un catálogo maestro normalizado y las referencias cruzadas son tan importantes como la tecnología de escaneo**. El lector resuelve la adquisición física; la base maestra resuelve el significado.

### Arquitectura final que recomendaría construir

La arquitectura lógica final sería:

```text
                   CAPA DE ADQUISICIÓN
┌─────────────────────────────────────────────────────┐
│ cámara | USB | Bluetooth | industrial | OCR | manual│
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
                    EVIDENCIA CRUDA
       raw / imagen / simbología / motor / timestamp
                          │
                          ▼
                  CAPA DE DECODIFICACIÓN
        GS1 | HIBC | ICCBBA | generic | proprietary
                          │
                          ▼
                 OBSERVACIONES SEMÁNTICAS
        DI/GTIN | REF | LOT | SERIAL | EXP | etc.
                          │
                          ▼
                MOTOR DE RESOLUCIÓN
       ┌──────────────────┼───────────────────┐
       │                  │                   │
       ▼                  ▼                   ▼
 local aliases      registros externos   manufacturer
 item master        UDI / catálogo        profiles
       │                  │                   │
       └──────────────────┼───────────────────┘
                          ▼
                    CANDIDATOS
           identity_score / trace_score
                          │
                          ▼
                    RECONCILIACIÓN
             packaging / conflictos / reglas
                          │
                          ▼
                  CONFIRMACIÓN HUMANA
                          │
           ┌──────────────┼───────────────┐
           ▼              ▼               ▼
        PRODUCT          LOT             UNIT
                                        SERIAL
           │              │               │
           └──────────────┼───────────────┘
                          ▼
                    TRACE EVENTS
      recepción → stock → entrega → implante → recall
                          │
           ┌──────────────┼──────────────────┐
           ▼              ▼                  ▼
         ANMAT          EHR/FHIR           EPCIS
```

Y la decisión de diseño fundamental sería **no permitir que la capa superior dependa de cómo fue capturado el dato**.

Para el resto del ERP:

```text
Producto P-92817
Lote L-2819
Serie S-009183
```

debe ser exactamente el mismo objeto independientemente de si la información llegó mediante:

```text
GS1 DataMatrix
+ Code128
+ OCR
```

o mediante:

```text
HIBC
```

o mediante:

```text
barcode propietario
+ entrada manual
```

La diferencia permanece en la **provenance/evidence**, no en el modelo de inventario.

Eso permite que hoy soporte fabricantes desordenados sin contaminar el maestro y, al mismo tiempo, que mañana un fabricante pase a un UDI completamente estándar sin obligarte a rediseñar la base.

En una frase, el estándar operativo que recomendaría para este ERP sería:

> **UDI en la semántica, GS1 como formato prioritario pero no exclusivo, identificador interno inmutable para el maestro, DI/GTIN/REF como aliases de identidad, PI como trazabilidad separada, captura multifuente basada en evidencia y confirmación humana auditable para los casos ambiguos.**

Esa combinación es mucho más robusta para una distribuidora de implantes y productos quirúrgicos que cualquier diseño basado en un único campo `barcode` dentro de la tabla de artículos.