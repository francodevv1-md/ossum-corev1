# ENGRAM_CLOUD_POLICY.md — OSSUM COR

> **Version**: 1.0 · **Creado**: 2026-05-12
> **Proyecto**: OSSUM COR
> **Aplica a**: Todos los agentes (Z.ai, Codex, ChatGPT, cualquier agente IA)

---

## Objetivo

Definir como se usa Engram Cloud dentro de OSSUM COR. Este documento es la autoridad sobre que va en Engram, que no, y como se gobierna la memoria compartida entre agentes.

---

## Rol de Cada Capa

| Capa | Rol | Ejemplo |
|------|-----|---------|
| **GitHub** | Fuente oficial del codigo | `src/`, `package.json`, `prisma/` |
| **/knowledge** | Fuente oficial documental | Specs, ADRs, modelo de datos, politicas |
| **Engram Cloud** | Memoria operativa compartida | Bugs encontrados, discoverys, contexto de debugging |
| **Engram local** | Cache local de agente | Notas rapidas de sesion, recordatorios temporales |

### Jerarquia de autoridad

```
1. /knowledge   → GANA siempre (documentacion oficial)
2. GitHub code  → Fuente oficial de implementacion
3. Engram Cloud → Memoria compartida (operativa, volatil)
4. Engram local → Cache personal del agente (volatil)
```

Si hay contradiccion entre Engram y /knowledge, **/knowledge gana**. Siempre.

---

## Que SI guardar en Engram

| Tipo | Ejemplo | Razon |
|------|---------|-------|
| **bugs** | "CirugiasTable loop infinito en setScrollState linea 98" | Para que el siguiente agente no pierda tiempo diagnosticando lo mismo |
| **hallazgos** | "STATE_COLORS esta duplicado en 3 archivos" | Evitar redescubrir problemas conocidos |
| **riesgos** | "El counter de IDs arranca en 100, puede colisionar" | Alertar a otros agentes sobre peligros |
| **decisiones temporales** | "Use title nativo en vez de Radix Tooltip por loop infinito" | Documentar workarounds hasta que se resuelvan |
| **contexto tecnico** | "Zustand inline .filter() causa loop — usar useMemo" | Reglas tecnicas que no estan en /knowledge todavia |
| **contexto de debugging** | "El bug de CX-0001 duplicado reaparece tras HMR" | Informacion critica para debugging continuo |
| **relaciones detectadas** | "CirugiasTable depende de useColumnVisibility que depende de localStorage" | Mapas mentales del codigo |
| **pendientes operativos** | "Falta crear /usuarios page.tsx — link en sidebar no lleva a nada" | Tracking de tareas pendientes |
| **session summaries** | Resumen de que se hizo, que quedo pendiente, que se decidio | Continuidad entre sesiones |

### Formato recomendado para mem_save

```
title: Verbo + que — corto, buscable
type: (ver ENGRAM_TAGS.md para lista oficial)
project: ossum-cor
scope: project

content:
  What: Una oracion — que se hizo
  Why: Que lo motivo
  Where: Archivos o rutas afectadas
  Learned: Gotchas, edge cases, sorpresas (omitir si no aplica)
```

---

## Que NO guardar en Engram

| Tipo | Razon | Donde va en su lugar |
|------|-------|---------------------|
| **API keys** | Seguridad — nunca en memoria compartida | Variables de entorno / .env |
| **Secretos** | Seguridad — nunca en memoria compartida | Vault / secrets manager |
| **Tokens** | Seguridad — nunca en memoria compartida | Variables de entorno |
| **Codigo completo** | Engram no es storage de codigo | GitHub (src/) |
| **Specs oficiales completas** | Engram no es documentacion maestra | /knowledge + /FEATURE_SPECS/ |
| **Documentacion maestra** | Debe estar versionada y revisable | /knowledge (Git) |
| **Decisiones criticas no documentadas** | Si es critica, DEBE estar en /knowledge | ADRs en /docs/adr/ o DECISIONES_OPERATIVAS.md |

---

## Reglas Obligatorias

1. **Toda decision importante debe pasar a /knowledge**. Si tomaste una decision arquitectonica, de negocio o tecnica que afecta el proyecto, documentala en /knowledge. Engram es el borrador, /knowledge es la publicacion final.

2. **Si hay contradiccion, gana /knowledge**. Si Engram dice "usar MongoDB" pero /knowledge/DATA_MODEL_SPEC.md dice "PostgreSQL", se usa PostgreSQL.

3. **Usar siempre `project: ossum-cor`**. No usar variantes como "osscor", "ortotrack", "traumacorr", "ossrum-cor". El nombre oficial del proyecto en Engram es `ossum-cor`.

4. **Ejecutar sync al inicio y cierre de sesion**. Esto garantiza que las memorias esten compartidas entre agentes.
   ```bash
   # Inicio de sesion
   engram sync --cloud --project ossum-cor
   # Cierre de sesion
   engram sync --cloud --project ossum-cor
   ```

5. **No usar Engram como unica fuente de verdad**. Si algo solo existe en Engram y no en /knowledge ni en codigo, se considera no confiable.

6. **Usar tags oficiales de ENGRAM_TAGS.md**. No inventar tipos arbitrarios. Si necesitas un tipo nuevo, primero agregarlo a ENGRAM_TAGS.md.

7. **Usar topic_key para temas evolutivos**. Si una decision evoluciona (ej: "architecture/auth-model"), reutilizar el mismo topic_key con mem_update en vez de crear observaciones nuevas.

---

## Flujo Operativo

```
INICIO DE SESION (cualquier agente)
====================================
1. git pull
2. engram sync --cloud --project ossum-cor   ← traer memorias de otros agentes
3. engram context                            ← ver contexto de sesiones previas
4. Leer /knowledge/KNOWLEDGE_INDEX.md        ← contexto canonico
5. Leer archivos aplicables segun checklist   ← SESSION_START_CHECKLIST.md

TRABAJO
=======
6. Implementar / analizar / auditar
7. Guardar discoverys en Engram: mem_save / engram save
8. Documentar decisiones en /knowledge/
9. Actualizar specs si aplica

CIERRE DE SESION
================
10. engram sync --cloud --project ossum-cor  ← compartir memorias con otros agentes
11. Actualizar worklog.md
12. Actualizar HANDOFF_RESUMEN.md
13. Seguir SESSION_END_CHECKLIST.md
```

### Flujo entre agentes

```
Z.ai Agent                    Engram Cloud                  Codex Local
==========                    ============                  ============
Trabaja → mem_save
         → sync cloud ──────→ PostgreSQL ──────→ sync cloud → mem_search
                                                       ↓
GitHub ← git push ←───────────────────────────── git push → GitHub
  ↓                                                    ↓
/knowledge ← documentacion oficial              /knowledge ← documentacion oficial
```

---

## Seguridad

### Estado actual: INSECURE_NO_AUTH

**ADVERTENCIA FUERTE**: El servidor Engram Cloud corre actualmente en modo `ENGRAM_CLOUD_INSECURE_NO_AUTH=1`. Esto significa:

- **NO hay autenticacion** — cualquier proceso que alcance el puerto 18080 puede leer y escribir memorias
- **NO hay cifrado** — todo el trafico es HTTP plano
- **NO exponer publicamente** — el servidor NO debe ser accesible desde Internet
- **Solo para desarrollo local** — este modo es aceptable unicamente en red local de desarrollo

### Pendiente configurar (prioridad alta para produccion)

| Variable | Proposito | Valor recomendado |
|----------|-----------|-------------------|
| `ENGRAAM_CLOUD_TOKEN` | Token bearer para autenticacion de clientes | String aleatorio de 32+ caracteres |
| `ENGRAM_JWT_SECRET` | Secreto para firmar JWTs | String aleatorio de 32+ caracteres |
| `ENGRAM_CLOUD_ADMIN` | Token de admin para dashboard | Diferente de ENGRAM_CLOUD_TOKEN |

### Configuracion para produccion

```bash
# Generar secrets seguros
ENGRAM_CLOUD_TOKEN=$(openssl rand -hex 32)
ENGRAM_JWT_SECRET=$(openssl rand -hex 32)
ENGRAM_CLOUD_ADMIN=$(openssl rand -hex 32)

# Configurar servidor
export ENGRAM_DATABASE_URL="postgres://engram:STRONG_PASSWORD@127.0.0.1:5433/engram_cloud?sslmode=disable"
export ENGRAM_CLOUD_TOKEN="$ENGRAM_CLOUD_TOKEN"
export ENGRAM_JWT_SECRET="$ENGRAM_JWT_SECRET"
export ENGRAM_CLOUD_ADMIN="$ENGRAM_CLOUD_ADMIN"
export ENGRAM_CLOUD_ALLOWED_PROJECTS=ossum-cor
# NO exportar ENGRAM_CLOUD_INSECURE_NO_AUTH

# Configurar clientes
engram cloud config --server https://engram.tu-dominio.com:18080
export ENGRAM_CLOUD_TOKEN="$ENGRAM_CLOUD_TOKEN"
```

### Regla de seguridad

- **Nunca** commitear tokens o secrets al repositorio
- **Nunca** exponer el puerto 18080 fuera de la red local sin autenticacion
- **Siempre** usar HTTPS en produccion (reverse proxy con Let's Encrypt)
- Los tokens deben estar en `.env` o variables de entorno, nunca en codigo
