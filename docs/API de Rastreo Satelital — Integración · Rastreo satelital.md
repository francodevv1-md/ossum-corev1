API de Rastreo Satelital
EN PT
Guía de integración — WebSocket y REST
Introducción
Dos formas de acceder a los datos de la flota: un WebSocket que transmite posiciones, estados y
eventos en tiempo real, y una API REST para consultar el estado actual y datos históricos bajo
demanda.
El servicio expone un canal WebSocket que envía datos en formato JSON. Apenas se establece la
conexión, el servidor entrega un snapshot con la última posición conocida de cada equipo y, a partir
de ahí, emite mensajes en vivo cada vez que llega una nueva posición, cambia el estado de un equipo
o se genera un evento.
Cada conexión está asociada a un usuario mediante un token. El feed queda automáticamente
acotado a los equipos que ese usuario tiene permiso de ver: no hace falta suscribirse ni filtrar del lado
del cliente.
Conexión
Se conecta a la URL del WebSocket pasando el token como parámetro de query:
ENDPOINT
wss://SU-SERVIDOR/api/socket?token=EL_TOKEN
Usar (conexión cifrada). El host y el token se entregan por separado.
wss://
El identifica al usuario; el servidor valida y autoriza la conexión.
token
No requiere cabeceras adicionales ni un login previo: la autenticación viaja en la URL.
💡 Snapshot inicial. Ni bien conecta, recibe un mensaje { "positions": [...] } con la última
posición de cada equipo. Luego comienza el flujo de actualizaciones.
Estructura de mensajes
Cada mensaje recibido es un objeto JSON que contiene una o más de las siguientes claves. En cada
mensaje solo viajan las claves que tienen novedades — el resto se omite.

| Clave | Tipo | Contenido |
| ----- | ---- | --------- |
Nuevas posiciones (lo más
| positions | array |     |
| --------- | ----- | --- |
frecuente).
| devices |     | Cambios de estado del equipo |
| ------- | --- | ---------------------------- |
array
(online/offline, edición).
Eventos y alarmas generados en
| events | array |     |
| ------ | ----- | --- |
vivo.
EJEMPLO DE MENSAJE
{
  "devices":   [ { "id": 5, "status": "online", "lastUpdate": "2026-07-18T14:30:05.000+00:0
  "positions": [ { "deviceId": 5, "latitude": -34.6037, "longitude": -58.3816, "speed": 12.
  "events":    [ { "type": "deviceOverspeed", "deviceId": 5, "eventTime": "2026-07-18T14:30
}
Objeto
position
El elemento principal del feed. Los campos de arriba son fijos; todo lo variable (según el modelo de
| equipo) vive dentro de  | .   |     |
| ----------------------- | --- | --- |
attributes

| Campo | Tipo | Descripción |     |
| ----- | ---- | ----------- | --- |
Identificador único de la
| id  | number |     |     |
| --- | ------ | --- | --- |
posición.
| deviceId |     | Id del equipo al que pertenece. |     |
| -------- | --- | ------------------------------- | --- |
number
| protocol |        | Protocolo del equipo (ej.  | ,   |
| -------- | ------ | -------------------------- | --- |
|          | string | h02                        |     |
jt808 ).
| deviceTime |     | Hora del equipo (ISO-8601 con |     |
| ---------- | --- | ----------------------------- | --- |
datetime
zona horaria).
| fixTime |     | Hora del posicionamiento GPS. |     |
| ------- | --- | ----------------------------- | --- |
datetime
Hora en que el servidor recibió
| serverTime | datetime |     |     |
| ---------- | -------- | --- | --- |
el dato.
| valid |     | true  si el fix GPS es válido. |     |
| ----- | --- | ------------------------------ | --- |
boolean
 si la posición reusa
| outdated | boolean | true |     |
| -------- | ------- | ---- | --- |
coordenadas previas (sin fix
nuevo).
Latitud en grados decimales.
| latitude  | number |                               |     |
| --------- | ------ | ----------------------------- | --- |
| longitude | number | Longitud en grados decimales. |     |
| altitude  |        | Altitud en metros.            |     |
number
| speed |     | Velocidad en nudos. km/h = |     |
| ----- | --- | -------------------------- | --- |
number
speed × 1,852.
| course |     | Rumbo en grados (0–359). |     |
| ------ | --- | ------------------------ | --- |
number
| address |     | Dirección geocodificada, si está |     |
| ------- | --- | -------------------------------- | --- |
string · null
disponible.
Ids de geocercas que contienen
| geofenceIds | array · null |     |     |
| ----------- | ------------ | --- | --- |
la posición.
| attributes |     | Datos adicionales variables (ver |     |
| ---------- | --- | -------------------------------- | --- |
object
sección siguiente).

El objeto
attributes
Contenedor dinámico donde el equipo reporta telemetría adicional. Qué claves aparecen depende
del modelo y del protocolo — no todas están siempre presentes. Las más habituales:
| Clave    | Tipo | Descripción                  |
| -------- | ---- | ---------------------------- |
| ignition |      | Estado de la ignición (motor |
boolean
encendido).
 si el equipo está en
| motion | boolean | true |
| ------ | ------- | ---- |
movimiento.
| totalDistance |     | Distancia acumulada calculada |
| ------------- | --- | ----------------------------- |
number
por el servidor, en metros.
Odómetro reportado por el
| odometer | number |     |
| -------- | ------ | --- |
hardware, en metros.
| distance |     | Distancia desde la posición |
| -------- | --- | --------------------------- |
number
anterior, en metros.
Horas de motor acumuladas, en
| hours | number |     |
| ----- | ------ | --- |
milisegundos.
| battery |     | Voltaje de la batería. |
| ------- | --- | ---------------------- |
number
| batteryLevel |     | Nivel de batería en porcentaje. |
| ------------ | --- | ------------------------------- |
number
Voltaje de alimentación externa.
| power | number |                                 |
| ----- | ------ | ------------------------------- |
| sat   |        | Cantidad de satélites usados en |
number
el fix.
Nivel de señal celular.
| rssi    | number  |                                  |
| ------- | ------- | -------------------------------- |
| blocked | boolean | Estado del corte de motor, si el |
equipo lo soporta.
| alarm |     | Presente solo si hay alarma (ej. |
| ----- | --- | -------------------------------- |
string
sos ,  powerCut ).

Objeto
device
Llega en la clave   cuando un equipo cambia de estado (se conecta o desconecta) o se
devices
modifica su ficha.
| Campo | Tipo | Descripción               |     |     |
| ----- | ---- | ------------------------- | --- | --- |
| id    |      | Identificador del equipo. |     |     |
number
Nombre del equipo
| name | string |     |     |     |
| ---- | ------ | --- | --- | --- |
(habitualmente la patente).
| uniqueId |     | Identificador físico (IMEI / serial). |     |     |
| -------- | --- | ------------------------------------- | --- | --- |
string
| status |        | online offline |  o      | .   |
| ------ | ------ | -------------- | ------- | --- |
|        | string |                | unknown |     |
Última comunicación recibida.
| lastUpdate | datetime |                              |     |     |
| ---------- | -------- | ---------------------------- | --- | --- |
| positionId | number   | Id de la última posición del |     |     |
equipo.
| groupId |     | Grupo al que pertenece (0 si |     |     |
| ------- | --- | ---------------------------- | --- | --- |
number
ninguno).
| phone |     | Teléfono de la SIM, si está |     |     |
| ----- | --- | --------------------------- | --- | --- |
string
cargado.
| model |     | Modelo del equipo. |     |     |
| ----- | --- | ------------------ | --- | --- |
string
 si el equipo está
| disabled | boolean | true |     |     |
| -------- | ------- | ---- | --- | --- |
deshabilitado.
Objeto
event
Llega en la clave  events . Solo se reciben eventos generados mientras la conexión está activa (no
históricos).

| Campo |     | Tipo | Descripción |     |
| ----- | --- | ---- | ----------- | --- |
Identificador del evento.
| id        |     | number |                                   |     |
| --------- | --- | ------ | --------------------------------- | --- |
| type      |     | string | Tipo de evento (ver lista abajo). |     |
| eventTime |     |        | Momento del evento.               |     |
datetime
Equipo asociado.
| deviceId   |     | number |                               |     |
| ---------- | --- | ------ | ----------------------------- | --- |
| positionId |     |        | Posición vinculada al evento. |     |
number
| geofenceId |     |     | Geocerca involucrada (0 si no |     |
| ---------- | --- | --- | ----------------------------- | --- |
number
aplica).
|            |     |        | Datos del evento (ej.  | ,     |
| ---------- | --- | ------ | ---------------------- | ----- |
| attributes |     | object |                        | alarm |
|            |     |        | speedLimit ).          |       |
Tipos de evento frecuentes
|              |  /                               |  — conexión / desconexión del equipo. |                  |     |
| ------------ | -------------------------------- | ------------------------------------- | ---------------- | --- |
| deviceOnline | deviceOffline                    |                                       |                  |     |
|              |  /                               |  — encendido / apagado del motor.     |                  |     |
| ignitionOn   | ignitionOff                      |                                       |                  |     |
| deviceMoving |  /  deviceStopped                |  — inicio / fin de movimiento.        |                  |     |
|              |  — exceso de velocidad (incluye  |                                       |  en attributes). |     |
deviceOverspeed speedLimit
|               |  /           |  — entrada / salida de geocerca. |     |     |
| ------------- | ------------ | -------------------------------- | --- | --- |
| geofenceEnter | geofenceExit |                                  |     |     |
alarm  — alarma; el tipo específico va en  attributes.alarm  (ej.  sos ).
Reglas de parseo
Iterar solo las claves presentes. Nunca asumir que un mensaje trae las tres; validar cada una
antes de procesar.
Cada valor es un array, aunque contenga un solo elemento.
La telemetría variable vive en  . Los campos de nivel superior son fijos; el resto es
attributes
dinámico según el protocolo.
| Velocidad en nudos → convertir con  |     |     | .   |     |
| ----------------------------------- | --- | --- | --- | --- |
km/h = speed × 1,852
Distancias en metros, horas de motor en milisegundos, fechas en ISO-8601 con zona
horaria.
Reconexión. El servidor cierra la conexión por inactividad; el cliente debe reconectar
automáticamente.

⚠ Vencimiento del token. Si el token expira o se revoca, la conexión se cae y los reintentos fallarán
hasta renovarlo. Contemplar esta situación en la lógica de reconexión.
Ejemplos de código
Node.js
JAVASCRIPT
const WebSocket = require('ws');
const HOST = 'SU-SERVIDOR';
const TOKEN = 'EL_TOKEN';
function connect() {
const ws = new WebSocket(`wss://${HOST}/api/socket?token=${encodeURIComponent(TOKEN)}`);
ws.on('open', () => console.log('conectado'));
ws.on('message', (raw) => {
const msg = JSON.parse(raw);
for (const p of msg.positions ?? []) {
const kmh = Math.round(p.speed * 1.852);
console.log(`device ${p.deviceId}: ${p.latitude},${p.longitude} — ${kmh} km/h`);
}
for (const e of msg.events ?? []) {
console.log(`evento ${e.type} (device ${e.deviceId})`);
}
for (const d of msg.devices ?? []) {
console.log(`device ${d.id} → ${d.status}`);
}
});
ws.on('close', () => setTimeout(connect, 5000)); // reconexión
ws.on('error', (err) => console.error(err.message));
}
connect();
Python
PYTHON

# pip install websocket-client
import json, websocket
HOST, TOKEN = "SU-SERVIDOR", "EL_TOKEN"
def on_message(ws, raw):
msg = json.loads(raw)
for p in msg.get("positions", []):
kmh = round(p["speed"] * 1.852)
print(f'device {p["deviceId"]}: {p["latitude"]},{p["longitude"]} — {kmh} km/h')
for e in msg.get("events", []):
print(f'evento {e["type"]} (device {e["deviceId"]})')
websocket.WebSocketApp(
f"wss://{HOST}/api/socket?token={TOKEN}",
on_message=on_message,
).run_forever(reconnect=5)
API REST — Autenticación
Además del feed en tiempo real, la API REST permite hacer consultas puntuales. Todas las respuestas
son en formato JSON y quedan acotadas a los equipos que el usuario tiene permiso de ver.
URL base:
https://SU-SERVIDOR/api
Este documento cubre únicamente las operaciones de lectura ( ).
GET
Cada solicitud se autentica con la cabecera , en cualquiera de estas dos formas:
Authorization
Opción 1 · Token
Bearer
Recomendada para integraciones: no expone la contraseña del usuario y puede revocarse.
AUTHORIZATION: BEARER
curl -H "Authorization: Bearer EL_TOKEN" \
"https://SU-SERVIDOR/api/devices"
Opción 2 · Usuario y contraseña
Basic
Autenticación HTTP Basic estándar con el email y la contraseña del usuario (la cabecera lleva
codificado en Base64; lo hace solo).
email:contraseña curl -u
AUTHORIZATION: BASIC

curl -u "usuario@email.com:CONTRASEÑA" \
     "https://SU-SERVIDOR/api/devices"
💡  La autenticación Basic aplica solo a la API REST. El WebSocket se autentica con el token en la URL,
como se muestra en la sección de conexión.
GET /api/devices
Devuelve la lista de equipos del usuario. Cada elemento tiene la estructura del objeto  . Sin
device
parámetros, lista todos los equipos accesibles.
| Parámetro | Tipo               | Descripción                   |     |
| --------- | ------------------ | ----------------------------- | --- |
| id        | number · repetible | Uno o varios equipos por id ( | ?   |
).
id=5&id=8
| uniqueId |     | Por identificador físico (IMEI / |     |
| -------- | --- | -------------------------------- | --- |
string · repetible
serial).
Búsqueda por nombre, uniqueId,
| keyword | string |     |     |
| ------- | ------ | --- | --- |
teléfono o modelo.
| limit |     | Máximo de resultados |     |
| ----- | --- | -------------------- | --- |
number
(paginación).
| offset | number | Desplazamiento inicial |     |
| ------ | ------ | ---------------------- | --- |
(paginación).
EJEMPLO
curl -H "Authorization: Bearer EL_TOKEN" \
     "https://SU-SERVIDOR/api/devices?keyword=AB123CD"
GET /api/positions
Devuelve posiciones con la estructura del objeto  . Su comportamiento depende de los
position
parámetros:

Parámetros Resultado
(ninguno) Última posición de cada equipo del usuario.
deviceId Última posición de ese equipo.
deviceId + from + to Histórico de posiciones del equipo en el rango.
id Posiciones puntuales por id (repetible: ?
id=100&id=101 ).
Parámetro Tipo Descripción
deviceId number Equipo a consultar.
from datetime Inicio del rango, ISO-8601 (ej.
2026-07-18T00:00:00Z ).
to datetime Fin del rango, ISO-8601.
id number · repetible Posiciones específicas por id.
EJEMPLO · HISTÓRICO
curl -H "Authorization: Bearer EL_TOKEN" \
"https://SU-SERVIDOR/api/positions?deviceId=5&from=2026-07-18T00:00:00Z&to=2026-07-18T
⚠ Rango de fechas. El histórico puede tener un límite máximo de período y de cantidad de puntos por
consulta, según la configuración del servidor.
GET /api/events/{id}
Devuelve un evento puntual por su identificador.
EJEMPLO
curl -H "Authorization: Bearer EL_TOKEN" \
"https://SU-SERVIDOR/api/events/90012"
💡 Eventos por rango. Para obtener todos los eventos de un equipo en un período, usar el reporte de
eventos: GET /api/reports/events?deviceId=&from=&to=&type=

/api/geofences
GET
Devuelve la lista de geocercas accesibles. Sin parámetros, lista todas las del usuario.
| Parámetro | Tipo | Descripción |
| --------- | ---- | ----------- |
Geocercas asignadas a un
| deviceId | number |     |
| -------- | ------ | --- |
equipo.
| groupId |     | Geocercas de un grupo. |
| ------- | --- | ---------------------- |
number
Geocercas de un usuario
| userId | number |     |
| ------ | ------ | --- |
(requiere permiso).
| limit / offset |     | Paginación. |
| -------------- | --- | ----------- |
number
Estructura del objeto
geofence
| Campo | Tipo | Descripción |
| ----- | ---- | ----------- |
Identificador de la geocerca.
| id   | number |         |
| ---- | ------ | ------- |
| name |        | Nombre. |
string
| description |     | Descripción opcional. |
| ----------- | --- | --------------------- |
string · null
Geometría en formato WKT —
| area | string |     |
| ---- | ------ | --- |
POLYGON ,  CIRCLE  o
 con coordenadas
LINESTRING
lat/lon.
| calendarId |     | Calendario asociado (0 si |
| ---------- | --- | ------------------------- |
number
ninguno).
Datos adicionales (color,
| attributes | object |     |
| ---------- | ------ | --- |
velocidad máxima, etc.).
EJEMPLO
curl -H "Authorization: Bearer EL_TOKEN" \
     "https://SU-SERVIDOR/api/geofences?deviceId=5"
Versión del manual 2026.08.14

© 2026 Rastreo.com.ar — Plataforma de rastreo satelital profesional