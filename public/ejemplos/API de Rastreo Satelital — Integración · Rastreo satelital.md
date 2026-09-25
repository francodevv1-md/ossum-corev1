API de Rastreo Satelital

Guía de integración — WebSocket y REST

EN

PT

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

Usar  wss://  (conexión cifrada). El host y el token se entregan por separado.

El  token  identifica al usuario; el servidor valida y autoriza la conexión.

No requiere cabeceras adicionales ni un login previo: la autenticación viaja en la URL.

💡  Snapshot inicial. Ni bien conecta, recibe un mensaje  { "positions": [...] }  con la última
posición de cada equipo. Luego comienza el flujo de actualizaciones.

Estructura de mensajes

Cada mensaje recibido es un objeto JSON que contiene una o más de las siguientes claves. En cada

mensaje solo viajan las claves que tienen novedades — el resto se omite.

Tipo

array

array

array

Clave

positions

devices

events

EJEMPLO DE MENSAJE

{

Contenido

Nuevas posiciones (lo más

frecuente).

Cambios de estado del equipo

(online/offline, edición).

Eventos y alarmas generados en

vivo.

  "devices":   [ { "id": 5, "status": "online", "lastUpdate": "2026-07-18T14:30:05.000+00:0

  "positions": [ { "deviceId": 5, "latitude": -34.6037, "longitude": -58.3816, "speed": 12.

  "events":    [ { "type": "deviceOverspeed", "deviceId": 5, "eventTime": "2026-07-18T14:30

}

Objeto  position

El elemento principal del feed. Los campos de arriba son fijos; todo lo variable (según el modelo de

equipo) vive dentro de  attributes .

Campo

id

deviceId

protocol

Tipo

number

number

string

deviceTime

datetime

fixTime

serverTime

valid

outdated

latitude

longitude

altitude

speed

course

address

datetime

datetime

boolean

boolean

number

number

number

number

number

Descripción

Identificador único de la

posición.

Id del equipo al que pertenece.

Protocolo del equipo (ej.  h02 ,
jt808 ).

Hora del equipo (ISO-8601 con

zona horaria).

Hora del posicionamiento GPS.

Hora en que el servidor recibió

el dato.

true  si el fix GPS es válido.

true  si la posición reusa
coordenadas previas (sin fix

nuevo).

Latitud en grados decimales.

Longitud en grados decimales.

Altitud en metros.

Velocidad en nudos. km/h =

speed × 1,852.

Rumbo en grados (0–359).

string · null

Dirección geocodificada, si está

disponible.

geofenceIds

array · null

Ids de geocercas que contienen

attributes

object

la posición.

Datos adicionales variables (ver

sección siguiente).

El objeto  attributes

Contenedor dinámico donde el equipo reporta telemetría adicional. Qué claves aparecen depende

del modelo y del protocolo — no todas están siempre presentes. Las más habituales:

Clave

ignition

motion

Tipo

boolean

boolean

totalDistance

number

odometer

distance

hours

battery

batteryLevel

power

sat

rssi

blocked

alarm

number

number

number

number

number

number

number

number

boolean

string

Descripción

Estado de la ignición (motor

encendido).

true  si el equipo está en
movimiento.

Distancia acumulada calculada

por el servidor, en metros.

Odómetro reportado por el

hardware, en metros.

Distancia desde la posición

anterior, en metros.

Horas de motor acumuladas, en

milisegundos.

Voltaje de la batería.

Nivel de batería en porcentaje.

Voltaje de alimentación externa.

Cantidad de satélites usados en

el fix.

Nivel de señal celular.

Estado del corte de motor, si el

equipo lo soporta.

Presente solo si hay alarma (ej.

sos ,  powerCut ).

Objeto  device

Llega en la clave  devices  cuando un equipo cambia de estado (se conecta o desconecta) o se
modifica su ficha.

Campo

id

name

uniqueId

status

lastUpdate

positionId

groupId

phone

model

disabled

Tipo

Descripción

number

string

string

string

datetime

number

number

string

string

boolean

Identificador del equipo.

Nombre del equipo

(habitualmente la patente).

Identificador físico (IMEI / serial).

online

offline  o  unknown .

Última comunicación recibida.

Id de la última posición del

equipo.

Grupo al que pertenece (0 si

ninguno).

Teléfono de la SIM, si está

cargado.

Modelo del equipo.

true  si el equipo está
deshabilitado.

Objeto  event

Llega en la clave  events . Solo se reciben eventos generados mientras la conexión está activa (no
históricos).

Campo

id

type

eventTime

deviceId

positionId

geofenceId

attributes

Tipo

number

string

datetime

number

number

number

object

Descripción

Identificador del evento.

Tipo de evento (ver lista abajo).

Momento del evento.

Equipo asociado.

Posición vinculada al evento.

Geocerca involucrada (0 si no

aplica).

Datos del evento (ej.  alarm ,
speedLimit ).

Tipos de evento frecuentes

deviceOnline  /  deviceOffline  — conexión / desconexión del equipo.

ignitionOn  /  ignitionOff  — encendido / apagado del motor.

deviceMoving  /  deviceStopped  — inicio / fin de movimiento.

deviceOverspeed  — exceso de velocidad (incluye  speedLimit  en attributes).

geofenceEnter  /  geofenceExit  — entrada / salida de geocerca.

alarm  — alarma; el tipo específico va en  attributes.alarm  (ej.  sos ).

Reglas de parseo

Iterar solo las claves presentes. Nunca asumir que un mensaje trae las tres; validar cada una

antes de procesar.

Cada valor es un array, aunque contenga un solo elemento.

La telemetría variable vive en  attributes . Los campos de nivel superior son fijos; el resto es
dinámico según el protocolo.

Velocidad en nudos → convertir con  km/h = speed × 1,852 .

Distancias en metros, horas de motor en milisegundos, fechas en ISO-8601 con zona

horaria.

Reconexión. El servidor cierra la conexión por inactividad; el cliente debe reconectar

automáticamente.

⚠  Vencimiento del token. Si el token expira o se revoca, la conexión se cae y los reintentos fallarán

hasta renovarlo. Contemplar esta situación en la lógica de reconexión.

Ejemplos de código

Node.js

JAVASCRIPT

const WebSocket = require('ws');

const HOST  = 'SU-SERVIDOR';

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

  ws.on('close', () => setTimeout(connect, 5000));   // reconexión

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

URL base: https://SU-SERVIDOR/api

Este documento cubre únicamente las operaciones de lectura ( GET ).

Cada solicitud se autentica con la cabecera  Authorization , en cualquiera de estas dos formas:

Opción 1 · Token  Bearer

Recomendada para integraciones: no expone la contraseña del usuario y puede revocarse.

AUTHORIZATION: BEARER

curl -H "Authorization: Bearer EL_TOKEN" \

     "https://SU-SERVIDOR/api/devices"

Opción 2 · Usuario y contraseña  Basic

Autenticación HTTP Basic estándar con el email y la contraseña del usuario (la cabecera lleva
email:contraseña  codificado en Base64;  curl -u  lo hace solo).

AUTHORIZATION: BASIC

curl -u "usuario@email.com:CONTRASEÑA" \

     "https://SU-SERVIDOR/api/devices"

💡  La autenticación Basic aplica solo a la API REST. El WebSocket se autentica con el token en la URL,

como se muestra en la sección de conexión.

GET

/api/devices

Devuelve la lista de equipos del usuario. Cada elemento tiene la estructura del objeto  device . Sin
parámetros, lista todos los equipos accesibles.

Parámetro

Tipo

Descripción

id

number · repetible

Uno o varios equipos por id ( ?
id=5&id=8 ).

uniqueId

string · repetible

Por identificador físico (IMEI /

string

number

number

serial).

Búsqueda por nombre, uniqueId,

teléfono o modelo.

Máximo de resultados

(paginación).

Desplazamiento inicial

(paginación).

keyword

limit

offset

EJEMPLO

curl -H "Authorization: Bearer EL_TOKEN" \

     "https://SU-SERVIDOR/api/devices?keyword=AB123CD"

GET

/api/positions

Devuelve posiciones con la estructura del objeto  position . Su comportamiento depende de los
parámetros:

Parámetros

(ninguno)

deviceId

Resultado

Última posición de cada equipo del usuario.

Última posición de ese equipo.

deviceId + from + to

Histórico de posiciones del equipo en el rango.

id

Parámetro

deviceId

from

to

id

EJEMPLO · HISTÓRICO

Posiciones puntuales por id (repetible:  ?
id=100&id=101 ).

Tipo

number

datetime

datetime

Descripción

Equipo a consultar.

Inicio del rango, ISO-8601 (ej.

2026-07-18T00:00:00Z ).

Fin del rango, ISO-8601.

number · repetible

Posiciones específicas por id.

curl -H "Authorization: Bearer EL_TOKEN" \

     "https://SU-SERVIDOR/api/positions?deviceId=5&from=2026-07-18T00:00:00Z&to=2026-07-18T

⚠  Rango de fechas. El histórico puede tener un límite máximo de período y de cantidad de puntos por

consulta, según la configuración del servidor.

GET

/api/events/{id}

Devuelve un evento puntual por su identificador.

EJEMPLO

curl -H "Authorization: Bearer EL_TOKEN" \

     "https://SU-SERVIDOR/api/events/90012"

💡  Eventos por rango. Para obtener todos los eventos de un equipo en un período, usar el reporte de

eventos:  GET /api/reports/events?deviceId=&from=&to=&type=

GET

/api/geofences

Devuelve la lista de geocercas accesibles. Sin parámetros, lista todas las del usuario.

Parámetro

deviceId

groupId

userId

Tipo

number

number

number

Descripción

Geocercas asignadas a un

equipo.

Geocercas de un grupo.

Geocercas de un usuario

(requiere permiso).

limit / offset

number

Paginación.

Estructura del objeto  geofence

Campo

id

name

Tipo

number

string

Descripción

Identificador de la geocerca.

Nombre.

description

string · null

Descripción opcional.

Geometría en formato WKT —

POLYGON ,  CIRCLE  o
LINESTRING  con coordenadas
lat/lon.

Calendario asociado (0 si

ninguno).

Datos adicionales (color,

velocidad máxima, etc.).

area

string

calendarId

attributes

EJEMPLO

number

object

curl -H "Authorization: Bearer EL_TOKEN" \

     "https://SU-SERVIDOR/api/geofences?deviceId=5"

Versión del manual 2026.08.14

© 2026 Rastreo.com.ar — Plataforma de rastreo satelital profesional

