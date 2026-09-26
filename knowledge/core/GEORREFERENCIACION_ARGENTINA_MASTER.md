# Documento Maestro de Georreferenciación Argentina

**Versión:** 1.0  
**Fecha:** 2026-09-10  
**Ámbito:** Argentina  
**Uso:** documento agnóstico de sistema para ERP, logística, flota, CRM, e-commerce, BI, mapas, integraciones, APIs y bases de datos.  
**Fuente territorial primaria recomendada:** Georef Argentina — Estado Nacional.  
**Marco geodésico nacional:** POSGAR 07 — Instituto Geográfico Nacional (IGN).

---

## 1. Propósito

Este documento define un criterio único y reutilizable para:

- obtener coordenadas geográficas confiables de provincias, departamentos, municipios, localidades y direcciones de Argentina;
- vincular una misma entidad geográfica entre sistemas diferentes;
- evitar duplicados por diferencias de escritura, tildes, mayúsculas o abreviaturas;
- distinguir entre un **centroide oficial**, una **dirección geocodificada**, una **coordenada GPS** y una **geometría territorial**;
- auditar información existente sin modificarla automáticamente;
- conservar trazabilidad de la fuente, fecha y método con el que se obtuvo cada coordenada;
- permitir futuras integraciones con SIG, mapas web, ERPs, plataformas logísticas y herramientas analíticas.

La regla principal es que **el nombre de una localidad nunca debe ser la clave de interoperabilidad**. La clave preferida debe ser un identificador oficial estable, acompañado por la jerarquía territorial y las coordenadas correspondientes.

---

# 2. Qué significa “coordenada exacta”

No existe una única “coordenada exacta” para una provincia, ciudad o localidad completa. Una entidad territorial puede representarse de distintas maneras según el objetivo.

## 2.1. Centroide de una entidad

Ejemplo:

```text
Goya (Corrientes)
→ latitud del centroide
→ longitud del centroide
```

Sirve para:

- ubicar una localidad en un mapa;
- mostrar marcadores generales;
- análisis de distancias aproximadas entre localidades;
- dashboards;
- agrupaciones geográficas;
- mapas de costos.

**No representa necesariamente una dirección, terminal, hospital o punto físico concreto.**

Georef identifica el campo `centroide` como las coordenadas del **centro aproximado** de la entidad.

## 2.2. Geometría territorial

Una provincia, departamento, municipio, localidad censal u otra entidad puede disponer de una geometría completa.

Ejemplo conceptual:

```text
Provincia de Corrientes
→ centroide: un punto
→ geometría: polígono/multipolígono completo
```

Usar geometría cuando el sistema necesite:

- saber si un punto está dentro de una jurisdicción;
- pintar límites administrativos;
- realizar intersecciones;
- análisis espacial;
- mapas SIG;
- cálculo de superficies o coberturas.

Para interoperabilidad web, el formato recomendado es **GeoJSON**.

## 2.3. Dirección geocodificada

Ejemplo:

```text
Av. 3 de Abril 1200, Corrientes
→ lat/lon de esa dirección
```

Para una dirección física se debe utilizar el recurso de **direcciones**, no el centroide de la localidad.

La georreferenciación de direcciones es apropiada para:

- clientes;
- depósitos;
- centros médicos;
- sucursales;
- domicilios;
- entregas;
- puntos de retiro;
- proveedores;
- destinos logísticos específicos.

La API Georef devuelve una ubicación **aproximada** para la dirección normalizada.

## 2.4. Coordenada medida por GPS/GNSS

Si un sistema registra la posición real de un vehículo, una entrega, un depósito, una máquina, un activo o un punto relevado en campo, la coordenada debe provenir del dispositivo GPS/GNSS o de un levantamiento geodésico.

Debe guardarse separadamente del centroide de Georef.

Ejemplo:

```text
coordinate_type = gps
lat = -27.46912345
lon = -58.83245671
```

Para aplicaciones de alta precisión, además deben preservarse:

- sistema/marco de referencia;
- fecha/hora;
- precisión reportada;
- fuente/dispositivo;
- eventualmente altura y época de referencia.

## 2.5. Coordenadas geodésicas de alta precisión

Para topografía, agrimensura, ingeniería o aplicaciones que requieren precisión geodésica, utilizar el marco oficial argentino **POSGAR 07** y las redes geodésicas del Instituto Geográfico Nacional.

POSGAR 07 es el Marco de Referencia Geodésico Nacional adoptado por el IGN y utiliza el elipsoide WGS84.

**No utilizar centroides de localidades para tareas topográficas o catastrales.**

---

# 3. Jerarquía de fuentes recomendada

## Nivel 1 — Fuente territorial primaria: Georef Argentina

Usar Georef como fuente primaria para:

- nombres oficiales;
- IDs oficiales;
- provincias;
- departamentos;
- municipios;
- gobiernos locales;
- localidades;
- localidades censales;
- asentamientos;
- calles;
- cuadras;
- direcciones;
- centroides;
- geometrías;
- georreferenciación inversa.

Base:

```text
https://apis.datos.gob.ar/georef/api/v2.0/
```

## Nivel 2 — Referencia geodésica: IGN / POSGAR 07

Usar IGN/POSGAR 07 cuando la posición tenga requerimientos geodésicos, topográficos o de precisión superior.

No confundir:

```text
centroide administrativo
```

con:

```text
punto geodésico medido
```

## Nivel 3 — Fuentes complementarias

Otros proveedores cartográficos pueden utilizarse para enriquecer una experiencia de usuario, rutas, POIs o validaciones secundarias.

Ejemplos:

- OpenStreetMap;
- Google Maps / Geocoding;
- Mapbox;
- HERE;
- TomTom;
- proveedores GPS.

**No deben reemplazar silenciosamente el ID territorial oficial de Georef.**

Si se utiliza una fuente secundaria, registrar siempre:

```text
source_name
source_id
source_url
source_date
```

---

# 4. Sistema de coordenadas para interoperabilidad

## 4.1. Formato estándar recomendado

Para intercambio entre sistemas, guardar coordenadas geográficas como `latitud` y `longitud` en grados decimales.

Ejemplo:

```text
lat: -27.469213
lon: -58.830634
```

## 4.2. CRS recomendado

Para datos provenientes de Georef:

```text
CRS: WGS84
EPSG:4326
```

Georef documenta que las geometrías descargadas se encuentran en **WGS84 (EPSG:4326)**.

## 4.3. Regla de orden

En bases y APIs internas usar nombres explícitos:

```text
latitude
longitude
```

ó:

```text
lat
lon
```

No confiar en una lista sin nombre como:

```text
[-58.83, -27.46]
```

porque algunos formatos —como GeoJSON— expresan coordenadas como:

```text
[longitud, latitud]
```

mientras que muchas APIs de aplicación presentan:

```text
latitud, longitud
```

---

# 5. Tipos de entidad que deben distinguirse

## Provincia

Jurisdicción provincial.

Ejemplo:

```text
Corrientes
```

## Departamento / Partido

División territorial de segundo nivel.

Ejemplo:

```text
Departamento Goya
```

## Municipio / Gobierno local

Unidad de gobierno local o entidad administrativa.

No asumir que municipio y localidad son equivalentes.

## Localidad

Entidad de asentamiento proveniente del sistema territorial utilizado por Georef.

Para ERPs, logística y destinos por ciudad suele ser la entidad más útil.

## Localidad censal

Unidad geoestadística definida para fines censales. Puede no coincidir exactamente con un límite municipal o administrativo.

## Asentamiento

Entidad poblacional o infraestructura territorial con una clasificación más amplia.

## Dirección

Punto derivado de:

```text
calle + altura + contexto territorial
```

Debe utilizarse cuando se necesita ubicar un domicilio concreto.

---

# 6. Modelo Maestro de Datos Geográficos

Todo sistema que necesite interoperabilidad debería poder mapear sus registros a un modelo equivalente al siguiente.

## 6.1. Registro territorial mínimo

```json
{
  "internal_id": "uuid-o-id-local",
  "georef_id": "ID_OFICIAL",
  "entity_type": "localidad",

  "name": "Goya",
  "display_name": "Goya (Corrientes)",

  "province_id": "18",
  "province_name": "Corrientes",

  "department_id": null,
  "department_name": null,

  "municipality_id": null,
  "municipality_name": null,

  "latitude": null,
  "longitude": null,

  "coordinate_type": "centroid",
  "crs": "EPSG:4326",

  "source": "Georef Argentina",
  "source_version": "v2.0",
  "source_retrieved_at": "2026-09-10T00:00:00Z",

  "validation_status": "verified"
}
```

## 6.2. Campos recomendados

| Campo | Descripción |
|---|---|
| `internal_id` | ID propio del sistema |
| `georef_id` | ID oficial de Georef |
| `entity_type` | provincia, departamento, municipio, localidad, dirección, etc. |
| `name` | nombre oficial |
| `display_name` | nombre amigable para UI |
| `province_id` | ID oficial de provincia |
| `province_name` | nombre oficial de provincia |
| `department_id` | ID oficial si aplica |
| `department_name` | nombre si aplica |
| `municipality_id` | ID oficial si aplica |
| `municipality_name` | nombre si aplica |
| `latitude` | latitud decimal |
| `longitude` | longitud decimal |
| `coordinate_type` | centroid, address, gps, survey, manual |
| `crs` | sistema de referencia |
| `source` | fuente de origen |
| `source_id` | ID externo si corresponde |
| `source_retrieved_at` | fecha de consulta |
| `validation_status` | verified, candidate, conflict, missing |
| `validation_notes` | observaciones |
| `geometry` | GeoJSON opcional |
| `geometry_source` | fuente de la geometría |

---

# 7. Campo crítico: `coordinate_type`

Nunca guardar una coordenada sin saber qué representa.

Valores recomendados:

```text
centroid
address
gps
survey
manual
unknown
```

- `centroid`: centroide oficial/aproximado de una entidad territorial.
- `address`: punto obtenido al geocodificar una dirección.
- `gps`: punto observado por un dispositivo GPS/GNSS.
- `survey`: punto proveniente de relevamiento geodésico/topográfico.
- `manual`: punto establecido manualmente por un usuario autorizado.
- `unknown`: solo para históricos donde no puede determinarse el origen.

---

# 8. Cómo obtener el catálogo territorial completo

Georef permite descargar los recursos completos sin ejecutar miles de consultas individuales.

## Provincias

```text
https://apis.datos.gob.ar/georef/api/v2.0/provincias.json
```

## Departamentos

```text
https://apis.datos.gob.ar/georef/api/v2.0/departamentos.json
```

## Municipios

```text
https://apis.datos.gob.ar/georef/api/v2.0/municipios.json
```

## Gobiernos locales

```text
https://apis.datos.gob.ar/georef/api/v2.0/gobiernos-locales.json
```

## Localidades

```text
https://apis.datos.gob.ar/georef/api/v2.0/localidades.json
```

## Localidades censales

```text
https://apis.datos.gob.ar/georef/api/v2.0/localidades_censales.json
```

## Asentamientos

```text
https://apis.datos.gob.ar/georef/api/v2.0/asentamientos.json
```

## Calles

```text
https://apis.datos.gob.ar/georef/api/v2.0/calles.json
```

## Cuadras

```text
https://apis.datos.gob.ar/georef/api/v2.0/cuadras.json
```

---

# 9. Formatos de descarga

Elegir formato según el uso.

## JSON

Recomendado para APIs, backend, Node.js, Python e integración con sistemas.

## CSV

Recomendado para Excel, Sheets, importaciones tabulares y auditorías.

## GeoJSON

Recomendado para mapas web, Leaflet, MapLibre, QGIS, PostGIS y análisis espacial.

## NDJSON

Recomendado para grandes volúmenes, streaming, procesos ETL y procesamiento línea a línea.

## Shapefile

Puede utilizarse en herramientas SIG tradicionales cuando sea necesario.

---

# 10. Cómo obtener coordenadas de una localidad

## Método recomendado

Buscar por ID oficial.

Conceptualmente:

```http
GET /localidades?id={GEOREF_ID}
```

El resultado debe utilizarse para obtener:

```text
id
nombre
provincia
centroide.lat
centroide.lon
```

## Si todavía no se conoce el ID

Buscar utilizando contexto territorial.

Ejemplo conceptual:

```http
GET /localidades?nombre=Goya&provincia=Corrientes&max=10
```

Nunca seleccionar automáticamente una coincidencia solo por nombre si existen varias posibilidades.

## Resultado mínimo esperado

```json
{
  "georef_id": "...",
  "name": "Goya",
  "province_id": "18",
  "province_name": "Corrientes",
  "latitude": -00.000000,
  "longitude": -00.000000,
  "coordinate_type": "centroid",
  "crs": "EPSG:4326"
}
```

Los valores anteriores son ilustrativos; siempre deben cargarse desde la respuesta real de Georef.

---

# 11. Cómo obtener coordenadas de una provincia

Consultar:

```http
GET /provincias?id=18
```

Ejemplo de estructura documentada por Georef:

```json
{
  "id": "14",
  "nombre": "CÓRDOBA",
  "centroide": {
    "lat": -32.142933,
    "lon": -63.801753
  }
}
```

El centroide representa a la provincia como entidad territorial, no a su capital.

---

# 12. Cómo obtener una dirección

Para un destino físico concreto utilizar:

```http
GET /direcciones
```

Ejemplo conceptual:

```text
/direcciones?direccion=Av. Corrientes 1234&provincia=Buenos Aires
```

Siempre que sea posible agregar contexto:

```text
provincia
departamento
localidad
localidad_censal
```

Cuanto mayor sea el contexto correcto, menor será la ambigüedad.

---

# 13. Georreferenciación inversa

Si ya existe una coordenada `lat/lon` y se necesita saber dónde está territorialmente:

```http
GET /ubicacion?lat={LAT}&lon={LON}
```

Puede utilizarse para obtener la provincia, departamento, municipio u otras entidades que contienen ese punto.

Usos típicos:

- validar GPS;
- determinar jurisdicción;
- clasificar entregas;
- verificar recorridos;
- enriquecer registros históricos.

---

# 14. Consultas por lotes

Para procesos masivos utilizar POST cuando corresponda.

La documentación actual de Georef establece:

- hasta **1000 consultas por petición**;
- la suma de los parámetros `max` no debe superar **5000 resultados**.

Esto es preferible a realizar miles de requests individuales.

---

# 15. Estrategia universal de vinculación

## Regla 1 — ID oficial primero

Si existe `georef_id`, vincular por ID.

```text
georef_id == georef_id
```

## Regla 2 — Nombre nunca es suficiente por sí solo

Ejemplos como `San José`, `San Vicente`, `Santa Rosa` o `Concepción` pueden existir en más de una provincia.

Una coincidencia válida debe considerar, como mínimo:

```text
nombre normalizado + provincia
```

Y, cuando sea necesario:

```text
departamento
municipio
categoría
```

## Regla 3 — La búsqueda no modifica la geografía

Si un usuario escribe `Corrientes`, el buscador puede filtrar localidades de Corrientes, pero nunca puede convertir:

```text
San Carlos de Bariloche
```

En:

```text
San Carlos de Bariloche (Corrientes)
```

La provincia debe provenir del vínculo territorial real.

---

# 16. Normalización de texto para matching

Para encontrar candidatos puede utilizarse una representación normalizada.

Ejemplo:

```text
"Ituzaingó" -> "ituzaingo"
"  Goya  "  -> "goya"
"ROSARIO"   -> "rosario"
```

Transformaciones permitidas para **búsqueda**:

- trim;
- minúsculas;
- eliminación de tildes;
- colapso de espacios;
- normalización Unicode.

No utilizar la versión normalizada como nombre oficial visible.

---

# 17. Estados de validación recomendados

```text
verified
candidate
conflict
missing
manual_verified
deprecated
```

- `verified`: coincide mediante ID oficial y jerarquía válida.
- `candidate`: existe una coincidencia probable, pero requiere revisión.
- `conflict`: hay información contradictoria.
- `missing`: no se logró identificar la entidad.
- `manual_verified`: un operador validó explícitamente el vínculo.
- `deprecated`: registro antiguo reemplazado por otro ID canónico.

Ejemplo de conflicto:

```text
provincia guardada: Corrientes
localidad guardada: San Carlos de Bariloche
provincia oficial de la localidad: Río Negro
```

---

# 18. Auditoría antes de modificar datos

Todo proceso de normalización debe ejecutarse primero en modo:

```text
READ ONLY
```

Clasificar:

1. coincidencias exactas por ID;
2. coincidencias por nombre + provincia;
3. duplicados;
4. provincia/localidad contradictorias;
5. localidades sin provincia;
6. localidades no encontradas;
7. registros sin coordenadas;
8. coordenadas existentes diferentes de la referencia;
9. registros con coordenadas pero sin fuente;
10. entidades externas sin equivalente oficial.

---

# 19. Nunca corregir automáticamente un conflicto

Ejemplo:

```text
provincia_id = Corrientes
localidad_id = San Carlos de Bariloche
```

No asumir si debe corregirse la provincia o la localidad.

Clasificar:

```text
validation_status = conflict
```

Y solicitar revisión humana.

---

# 20. Auditoría de coordenadas existentes

Si un sistema ya tiene `lat/lon`, comparar contra la fuente de referencia, pero **no sobrescribir automáticamente**.

Registrar:

```text
current_lat
current_lon
reference_lat
reference_lon
coordinate_type_current
coordinate_type_reference
distance_between_points_m
status
```

Un GPS real y un centroide pueden ser ambos correctos aunque estén separados por kilómetros.

Por eso la diferencia de coordenadas **no implica automáticamente un error**.

---

# 21. Regla de precisión

No inventar una precisión que la fuente no declara.

Para centroides de localidades:

```text
coordinate_type = centroid
```

No utilizar:

```text
accuracy_m = 5
```

si la fuente no proporciona esa precisión.

Para GPS, si el dispositivo reporta precisión:

```text
accuracy_m = valor_reportado
```

Para direcciones geocodificadas:

```text
coordinate_type = address
```

Y conservar el proveedor y calidad devuelta por el servicio cuando esté disponible.

---

# 22. Geometrías completas

Cuando se necesiten límites territoriales utilizar GeoJSON.

Georef permite descargar geometrías de entidades geográficas y documenta que estas se publican en:

```text
WGS84 / EPSG:4326
```

---

# 23. Modelo portable para APIs entre sistemas

Formato recomendado:

```json
{
  "geo": {
    "entity_type": "localidad",
    "georef_id": "ID_OFICIAL",
    "name": "Goya",

    "province": {
      "id": "18",
      "name": "Corrientes"
    },

    "department": {
      "id": null,
      "name": null
    },

    "municipality": {
      "id": null,
      "name": null
    },

    "coordinate": {
      "lat": null,
      "lon": null,
      "type": "centroid",
      "crs": "EPSG:4326"
    },

    "source": {
      "provider": "Georef Argentina",
      "version": "v2.0",
      "retrieved_at": null
    },

    "validation": {
      "status": "verified",
      "notes": null
    }
  }
}
```

Este objeto puede utilizarse en InfoGastos, OSSUM COR, CRM, TMS, WMS, e-commerce, APIs internas, aplicaciones móviles, BI, data warehouses y microservicios.

---

# 24. Modelo CSV interoperable

Columnas recomendadas:

```text
internal_id
georef_id
entity_type
name
province_id
province_name
department_id
department_name
municipality_id
municipality_name
latitude
longitude
coordinate_type
crs
source
source_version
source_retrieved_at
validation_status
validation_notes
```

---

# 25. Recomendación para PostgreSQL / Supabase

Una tabla maestra reutilizable podría seguir este criterio conceptual:

```sql
geo_entities
------------
id
external_georef_id
entity_type
name
province_georef_id
province_name
department_georef_id
department_name
municipality_georef_id
municipality_name
latitude
longitude
coordinate_type
crs
source
source_version
source_retrieved_at
validation_status
validation_notes
geometry_json
created_at
updated_at
```

No es obligatorio que todos los sistemas adopten físicamente esta misma tabla. Lo importante es conservar el contrato de datos.

---

# 26. Sincronización del catálogo

Para sistemas conectados permanentemente:

1. descargar catálogo Georef;
2. comparar por `georef_id`;
3. detectar altas/bajas/cambios;
4. generar diff;
5. auditar;
6. aprobar;
7. sincronizar.

Nunca utilizar:

```text
DELETE + INSERT de todo el catálogo
```

en una base con relaciones históricas.

---

# 27. Snapshot y trazabilidad

Cada importación debe registrar:

```text
source
source_version
download_url
retrieved_at
record_count
checksum opcional
```

Ejemplo:

```json
{
  "provider": "Georef Argentina",
  "api_version": "v2.0",
  "resource": "localidades",
  "retrieved_at": "2026-09-10T11:00:00Z",
  "record_count": 0
}
```

`record_count` debe completarse con el valor real de la importación.

---

# 28. Recomendación de actualización

No es necesario consultar Georef en cada render de una interfaz.

Patrón recomendado:

```text
Georef
   ↓
Sincronización controlada
   ↓
Catálogo geográfico propio
   ↓
Aplicaciones
```

El catálogo local puede actualizarse periódicamente.

Una operación histórica debe conservar el ID territorial utilizado y no depender de que la API externa esté disponible al momento de leerla.

---

# 29. Uso offline

Para aplicaciones que deben seguir funcionando sin Internet, utilizar las descargas completas en:

```text
JSON
CSV
GeoJSON
NDJSON
```

y mantener un snapshot local versionado.

---

# 30. Reglas para mapas

## Marcador de localidad

Usar:

```text
centroide de localidad
```

## Marcador de dirección

Usar:

```text
coordenada de dirección
```

## Seguimiento vehicular

Usar:

```text
GPS real
```

## Mapa provincial

Usar:

```text
geometría provincial
```

No reutilizar una misma coordenada para propósitos diferentes.

---

# 31. Cálculo de distancias

Para análisis simples entre localidades puede utilizarse la distancia entre centroides.

Debe rotularse como:

```text
distancia geográfica aproximada entre centroides
```

No equivale a:

```text
distancia por ruta
```

Para kilometraje vial utilizar un motor de rutas.

---

# 32. Integración con motores de rutas

Georef resuelve:

```text
qué lugar es
dónde está
qué ID oficial tiene
```

No es un motor de ruteo.

Para rutas, tiempos y distancias vehiculares utilizar un servicio adicional.

Arquitectura recomendada:

```text
Georef
→ entidad normalizada + coordenada

Motor de rutas
→ distancia vial + duración + recorrido
```

---

# 33. Reglas de seguridad y calidad

- no sobrescribir coordenadas históricas sin auditoría;
- no fusionar localidades solo por similitud de texto;
- no inferir provincia desde el buscador;
- no almacenar una coordenada sin fuente;
- no denominar “exacta” a una coordenada que es un centroide;
- no usar un centroide como dirección de entrega;
- no usar una dirección geocodificada como punto geodésico;
- no borrar IDs históricos sin revisar referencias;
- mantener trazabilidad de toda corrección manual.

---

# 34. Checklist de alta de una localidad

Antes de crear una localidad nueva:

- [ ] buscar el nombre normalizado en Georef;
- [ ] verificar provincia;
- [ ] verificar posibles homónimos;
- [ ] obtener `georef_id`;
- [ ] obtener nombre oficial;
- [ ] obtener centroide;
- [ ] registrar `EPSG:4326`;
- [ ] guardar fuente;
- [ ] guardar fecha de consulta;
- [ ] evitar duplicado local;
- [ ] validar relación provincia/localidad.

---

# 35. Checklist para una dirección

- [ ] conservar texto ingresado original;
- [ ] normalizar mediante Georef;
- [ ] agregar provincia/localidad como contexto;
- [ ] conservar dirección normalizada;
- [ ] guardar lat/lon;
- [ ] usar `coordinate_type = address`;
- [ ] guardar fuente y fecha;
- [ ] permitir revisión manual si hay ambigüedad.

---

# 36. Checklist para GPS

- [ ] latitud;
- [ ] longitud;
- [ ] timestamp;
- [ ] precisión reportada;
- [ ] dispositivo/fuente;
- [ ] CRS/marco;
- [ ] no reemplazar por centroide;
- [ ] opcional: validar jurisdicción con `/ubicacion`.

---

# 37. Estrategia recomendada para un catálogo maestro corporativo

La mejor arquitectura para múltiples sistemas es mantener una capa geográfica común:

```text
                   GEOREF ARGENTINA
                          │
                          ▼
               CATÁLOGO GEO CORPORATIVO
                          │
         ┌────────────────┼─────────────────┐
         ▼                ▼                 ▼
     InfoGastos       Sistema ERP        E-commerce
         │                │                 │
         └────────────────┼─────────────────┘
                          ▼
                       BI / MAPAS
```

Cada sistema puede mantener su propio `internal_id`, pero todos deben poder almacenar `georef_id` como clave externa común.

---

# 38. Ejemplo de resolución de un destino

Entrada:

```text
Goya
Provincia: Corrientes
```

Proceso:

```text
1. Buscar candidato en Georef
2. Validar provincia
3. Obtener ID oficial
4. Obtener centroide
5. Guardar vínculo
6. Registrar fuente
```

Resultado conceptual:

```json
{
  "name": "Goya",
  "province_name": "Corrientes",
  "georef_id": "ID_REAL_DEVUELTO_POR_GEOREF",
  "latitude": "LAT_REAL_DEVUELTA_POR_GEOREF",
  "longitude": "LON_REAL_DEVUELTA_POR_GEOREF",
  "coordinate_type": "centroid",
  "crs": "EPSG:4326",
  "validation_status": "verified"
}
```

Nunca hardcodear los valores ilustrativos de este documento.

---

# 39. Ejemplo de conflicto

Registro existente:

```text
Localidad: San Carlos de Bariloche
Provincia: Corrientes
```

Catálogo oficial:

```text
Localidad: San Carlos de Bariloche
Provincia: Río Negro
```

Resultado:

```json
{
  "validation_status": "conflict",
  "validation_notes": "La provincia persistida no coincide con la provincia oficial de la localidad."
}
```

Acción:

```text
INFORMAR
NO CORREGIR AUTOMÁTICAMENTE
```

---

# 40. Ejemplo de localidad duplicada

```text
Ituzaingo
Ituzaingó
```

No eliminar una fila directamente.

Proceso:

```text
1. Normalizar para matching
2. Comparar provincia
3. Comparar ID oficial
4. Auditar referencias
5. Elegir canónico
6. Reasignar relaciones de forma controlada
7. Verificar
8. Deprecar/eliminar duplicado solo después
```

---

# 41. Versionado de este documento

Toda modificación debe registrar:

```text
fecha
versión
fuente consultada
cambio realizado
responsable
```

No reemplazar decisiones previas sin bitácora.

---

# 42. Fuentes oficiales consultadas

## Georef Argentina — página principal

https://www.argentina.gob.ar/georef

## Acerca de Georef

https://www.argentina.gob.ar/georef/georef-servicio-de-normalizacion-de-direcciones-y-unidades-territoriales-de-argentina/acerca

## Referencia completa de API Georef V2

https://www.argentina.gob.ar/georef/referencia-completa-de-la-api-georef-v-2

## Uso práctico

https://www.argentina.gob.ar/georef/georef-servicio-de-normalizacion-de-direcciones-y-unidades-territoriales-de-argentina/uso

## Descarga completa

https://www.argentina.gob.ar/georef/descarga-de-la-base-completa

## Descarga de geometrías

https://www.argentina.gob.ar/georef/georef-servicio-de-normalizacion-de-direcciones-y-unidades-territoriales-de-argentina-5

## Estructura NDJSON

https://www.argentina.gob.ar/georef/estructura-de-archivos-ndjson

## Localidades y asentamientos

https://www.argentina.gob.ar/georef/localidades-y-asentamientos

## Normalización de direcciones

https://www.argentina.gob.ar/georef/normalizacion-de-direcciones

## Consultas por lotes

https://www.argentina.gob.ar/georef/consultas-por-lotes

## IGN — POSGAR 07

https://www.ign.gob.ar/nuestrasactividades/geodesia/posgar07

## IGN — preguntas frecuentes POSGAR

https://www.ign.gob.ar/NuestrasActividades/Geodesia/Posgar/faq

---

# 43. Regla maestra final

> **Identidad territorial, posición y precisión son conceptos separados.**

Para interoperabilidad, estos datos deben viajar juntos:

```text
ID oficial
+
tipo de entidad
+
jerarquía territorial
+
coordenada
+
tipo de coordenada
+
CRS
+
fuente
+
fecha
+
estado de validación
```

La coordenada sola no identifica de forma confiable una entidad. El nombre solo tampoco.

El objetivo de este estándar es que un destino pueda pasar de un sistema a otro sin perder:

- qué lugar es;
- a qué provincia pertenece;
- qué ID oficial posee;
- qué coordenada se está usando;
- qué representa esa coordenada;
- de dónde provino;
- cuándo fue verificada.

---

# 44. Regla para agentes y desarrolladores

Cuando se solicite “obtener las coordenadas exactas de una localidad”:

1. determinar primero qué precisión necesita el caso;
2. si es representación territorial, obtener el centroide oficial desde Georef;
3. si es un domicilio, utilizar geocodificación de dirección;
4. si es un punto físico real, utilizar GPS/GNSS o levantamiento;
5. si requiere límites, utilizar geometría;
6. conservar el ID oficial y la fuente;
7. nunca presentar un centroide como si fuera una dirección exacta;
8. ante conflicto, auditar e informar antes de corregir.

---

## Bitácora

### 2026-09-10 — Versión 1.0

Se crea el documento maestro de georreferenciación con enfoque independiente de InfoGastos.

Objetivos incorporados:

- interoperabilidad multi-sistema;
- Georef como fuente territorial primaria;
- POSGAR 07 como referencia geodésica nacional;
- diferenciación entre centroides, direcciones, GPS y geometrías;
- contrato portable de datos;
- estrategia de auditoría read-only;
- trazabilidad de fuente y coordenadas;
- criterios de sincronización y mantenimiento.
