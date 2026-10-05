# Pendientes de incorporación y retiro de worktrees — OSSUM COR

Fecha de revisión: 2026-10-03. Destino de trabajo: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`.

## Conclusión actual

**Decisión actual de Franco, 2026-10-03: eliminar únicamente UX_SURGERY y descartar el trabajo local antiguo.** Esta instrucción explícita reemplaza la pausa anterior. Se conservan la rama histórica y las siete copias ya archivadas en Antigravity; no se afirma que todo el trabajo antiguo esté incorporado al producto actual.

**Retiro completado y verificado.** El descarte incluyó cambios sin commit y archivos locales ignorados de esa carpeta. La reserva histórica de Logística dejó de bloquear este retiro por decisión explícita de descartar ese worktree; esto no libera ni reasigna archivos de otras sesiones o carpetas. Antigravity, su archivo de preservación y el repositorio/dependencias compartidos permanecen intactos.

Este listado registra trabajo para una incorporación futura. No aprueba cambios del circuito de Cirugías, de permisos, de datos ni una sustitución de componentes actuales. Una copia archivada preserva información; no significa que la mejora esté integrada, probada o aprobada para uso.

## Pendientes de UX_SURGERY, en orden de prioridad

Hay dos grupos independientes: preservar y retirar la carpeta (UX-01, UX-02, UX-06, UX-07), e incorporar mejoras al producto después (UX-03 a UX-05). **No hace falta terminar la mejora ni sus pruebas para retirar un worktree cuyo contenido ya esté preservado de forma durable.** Sí hace falta resolver todas las condiciones de preservación y ownership. La numeración identifica tareas, no obliga a implementar antes de retirar.

| ID | Pendiente | Qué se debe conseguir | Estado |
| --- | --- | --- | --- |
| UX-01 | Preservar el trabajo antes de retirar la carpeta | Conservar el buscador modificado, sus pruebas y los cinco documentos locales; comprobar que las copias corresponden a los originales. | Copias locales completas: 7/7 contenidos verificados; respaldo durable todavía pendiente. |
| UX-02 | Reconciliar la reserva de Logística | No trasladar ni reasignar automáticamente esa reserva histórica a Antigravity. | Descarte del worktree autorizado; evidencia histórica conservada en el archivo. |
| UX-03 | Incorporar solo las mejoras útiles del buscador | Comparar con la interfaz actual de Antigravity; evitar duplicar controles o reemplazar el diseño actual por el componente antiguo. | Pendiente de implementación futura y ownership. |
| UX-04 | Adaptar y ejecutar las pruebas | Probar limpiar filtros, quitar un filtro y usar Escape; agregar verificaciones de foco/accesibilidad según el componente final. | Solo hay evidencia histórica de tres pruebas aprobadas. No se ejecutaron ahora. |
| UX-05 | Verificar el resultado en el navegador | Comprobar teclado, foco, búsqueda y comportamiento móvil/escritorio con sesión autenticada. | No realizado. |
| UX-06 | Resolver archivos locales antes del retiro | Descartar únicamente archivos locales del worktree autorizado; quitar su junction de dependencias sin eliminar el destino compartido. | Completado; enlace retirado y dependencias compartidas conservadas. |
| UX-07 | Retirar el worktree cuando sea seguro | Eliminar carpeta y registro mediante Git, manteniendo rama, archivo histórico y Antigravity. | Completado; carpeta y registro ausentes, rama y copias conservadas. |

### Qué aporta la mejora del buscador

- Un botón para limpiar todos los filtros activos y devolver el foco al buscador.
- Escape descarta el texto todavía no aplicado y cierra las sugerencias, sin eliminar los filtros ya elegidos.
- Etiquetas accesibles para quitar filtros y para el campo de búsqueda.
- Información accesible sobre sugerencias abiertas y cantidad de filtros activos.

El componente de Antigravity ya tiene un diseño distinto y otros controles de filtros. La comparación debe decidir qué sigue faltando; no se debe copiar el archivo antiguo sobre el nuevo sin revisar.

La incorporación futura se limita a presentación e interacción del buscador y sus pruebas. Quedan fuera la página de Cirugías, hooks, store, backend, schema, Auth, permisos y reglas de negocio. Antes de implementar se debe verificar y reservar ownership vigente; el lock histórico liberado no asigna automáticamente esos archivos a una sesión nueva.

### Documentación de Logística encontrada

Se encontraron un brief y un lock para una bandeja de Logística adaptable a escritorio y móvil. No hay cambios de código de Logística en el estado revisado de esta carpeta. Esto **no demuestra** que la tarea esté terminada, que no se haya continuado en otro worktree ni que su sesión esté inactiva. Conservar los documentos y consultar su estado antes de reabrir el alcance.

## Otros pendientes ya detectados al concentrar trabajo en Antigravity

Estos puntos son un recordatorio del inventario anterior, no nuevas tareas de implementación aprobadas. Revalidar su estado antes de actuar.

- [ ] Llevar a Antigravity las reglas de Caveman orientadas a respuestas claras, si siguen ausentes allí.
- [ ] Reconciliar la skill de automatizaciones operativas Playwright creada en la carpeta original con las skills de E2E que Antigravity ya usa; evitar dos guías incompatibles. La copia original en `.agents/` está ignorada por Git.
- [ ] Comparar los cambios pendientes de Presupuestos y Compras/OCR en `E:\OSSUM_COR_PROJECT`; no sobrescribir el trabajo de otras sesiones.
- [ ] Revisar el trabajo no resuelto de C14/schema, los temporales Azure/PR32 y las ramas de presentación, recuperación, estabilización y Presupuestos antes de decidir su retiro. Mantener separado el borrado de carpetas y el borrado de ramas.
- [x] Retirar `coordinadores` integrado y limpiar los dos registros de carpetas temporales inexistentes, conservando sus ramas. Realizado en esta sesión antes de este documento.

## Ubicación de la preservación

[Archivo de UX_SURGERY](../archive/worktree-retirement/UX_SURGERY-20261003/README.md).

El archivo debe incluir siete copias de texto: un componente, una prueba y cinco documentos. Las copias de código usan extensión `.txt` para no incorporarse al build ni descubrirse como pruebas. Los locks copiados son evidencia histórica, no reservas nuevas sobre Antigravity.

Las copias permanecen locales y sin commit. Un commit de respaldo no fue solicitado. Antes de borrar el origen, se debe elegir y verificar un respaldo durable; un listado de pendientes o una copia local sin respaldo no basta por sí solo.

Excepción específica actual: Franco autorizó descartar el worktree antiguo sin esperar un respaldo adicional. Las copias locales existentes se conservan; no se presenta esta decisión como respaldo durable ni como prueba de integración.

El retiro futuro debe realizarse como una operación sobre el worktree registrado, no borrando carpetas recursivamente a ciegas. **No eliminar ramas ni `E:\OSSUM_COR_PROJECT\.git`: ese directorio guarda el historial compartido que también necesita Antigravity.** No usar `--force` para saltar cambios o reservas sin una revisión y autorización específicas.

## Verificaciones realizadas

- La versión guardada de la rama `ux/surgery-operations-20260908` (`dd35d40`) ya pertenece al historial guardado de Antigravity. Esto no incluye sus cambios locales.
- Inventario revisado: un archivo de código modificado y seis archivos sin seguimiento (una prueba y cinco documentos).
- Lock del buscador: `released`. Lock de Logística: `editing`, sin reconciliación en esta tarea.
- En la tarea inicial de preservación no se modificó código de la aplicación, no se ejecutaron pruebas de producto, no se accedió a datos de negocio y no se retiró UX_SURGERY. El retiro posterior se realizó únicamente tras la instrucción explícita de Franco de eliminar esa carpeta.
- El autor de preservación y el coordinador verificaron por separado las siete copias mediante hashes de contenido normalizado por Git. Coinciden con los originales; no se afirma identidad byte a byte de los saltos de línea. El estado y la versión del origen permanecieron iguales.
- Revisión independiente del listado completada; se aclararon la protección del historial compartido, las exclusiones de implementación y la separación entre pruebas futuras y condiciones de retiro.
- Retiro posterior: cero procesos con referencia explícita al destino detectados; enlace `node_modules` retirado sin recorrer su destino; carpeta y registro eliminados mediante Git. Verificados rama `dd35d40`, Antigravity `73e3e1b`, historial/dependencias compartidos y siete copias presentes. La ausencia de referencias de procesos no se presenta como garantía de conocer todas las sesiones.

## Scope and ownership

- Task: UX-SURGERY-RETIREMENT-PENDING-20261003.
- Primary owner: orchestrator, `openai/gpt-6.1-sol`, docs mode; owns this new document only.
- Preservation author: delegated sole owner of the new archive folder; no source or shared-file edits.
- Allowed: source/document inspection, creation of pending list and non-executable historical snapshots, focused Git/document checks.
- Forbidden: original lock release, source implementation, Auth/schema/DB/browser actions, generated/session-file copies, deletion, commit/push/merge, unrelated writes.
- Escalation: changed source during capture, pre-existing target ownership, unresolved original editing lock or new destructive scope.
- Document ownership status: released; original Logística reservation remains unchanged.

## Handoff

- Done: UX_SURGERY retirado por instrucción explícita de Franco; pendientes futuros registrados.
- Changed: carpeta y registro eliminados; ramas, copias archivadas y Antigravity conservados.
- Files: este documento, archivo histórico de preservación y metadatos del worktree retirado.
- Validations: inventario/archivo previamente verificados; ausencia de carpeta/registro y presencia de rama, dependencias compartidas, Antigravity y siete copias comprobadas. No se ejecutaron pruebas de producto.
- Risks: archivos locales no archivados se descartaron deliberadamente; las mejoras archivadas no están integradas ni probadas en el producto actual.
- Next: continuar en Antigravity; evaluar las mejoras históricas solo si todavía resultan útiles, sin volver a crear automáticamente el worktree antiguo.

## Declared removal task

- Task: UX-SURGERY-EXPLICIT-RETIREMENT-20261003.
- Owner/role/model: primary agent / worktree maintenance / `openai/gpt-6.1-sol`; implementation mode for authorized removal only.
- Approval: Franco explicitly requested deleting `E:\OSSUM_COR_PROJECT_UX_SURGERY`, accepting old local work as unnecessary; Antigravity identified as active destination.
- Owned scope: that registered worktree removal and its Git registration; this pending-list status only. Historical snapshots and branch are read-only/preserved.
- Allowed commands: read-only Git/process/path checks; unlink the verified worktree-local dependency junction; `git worktree remove --force` for the explicitly approved dirty target; focused post-removal checks.
- Forbidden: branch deletion, shared `.git` deletion, dependency-target deletion, other worktree removals, process termination, database/browser/app changes, commits/push/merge.
- Checks: exact target registered; no detected explicit process reference; junction target verified; directory/registration absent after removal; branch hash, shared dependencies, archive and Antigravity intact.
- Stop: unexpected target/link destination, new positive ownership/runtime conflict, removal error or unrelated scope.
- Ownership status: released after focused post-removal checks; output Done / Changed / Files / Validations / Risks / Next.
