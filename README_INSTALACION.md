# README_INSTALACION.md — Cómo copiar Knowledge V2 al proyecto

## Contenido

Este paquete contiene:

- `AGENTS.md`
- `knowledge/`

## Instalación manual

1. Descomprimir el zip.
2. Copiar `AGENTS.md` a la raíz del repo OSSUM COR.
3. Copiar la carpeta `knowledge/` a la raíz del repo.
4. Si ya existe `knowledge/`, hacer backup antes.
5. No borrar knowledge viejo sin revisar; moverlo luego a `knowledge/archive/`.
6. No tocar `src/`, `prisma/` ni dependencias durante esta etapa.

## Siguiente paso

Ejecutar GPT-027F.0A en Codex/OpenCode para:

- completar `CURRENT_STATE.md` con rutas reales;
- completar `REPO_MAP.md`;
- clasificar knowledge viejo;
- validar que no haya contradicciones.

## Prohibido en esta etapa

- Backend foundation.
- Migraciones.
- Auth.
- Integración fiscal.
- Refactor de Cirugías.

