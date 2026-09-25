# RECEIPT-STOCK-UX-MOCKUP-001

## Done

- Diseñado un prototipo estático interactivo de Recepción y Stock, navegable en variantes desktop y mobile.
- Cubiertos los cinco flujos solicitados: entradas, estados, confirmación, acceso al saldo y adaptación responsive.

## Changed

- Agregado un artefacto HTML autocontenido, sin dependencias ni conexión a backend.
- Agregado este handoff con decisiones, recorridos y supuestos.
- No se modificaron archivos productivos.

## Files

- `.mockups/receipt-stock/index.html` — prototipo interactivo.
- `.mockups/receipt-stock/HANDOFF.md` — cierre y evidencia de diseño.
- `.mockups/receipt-stock/desktop.png` — captura de la entrada desde Stock en desktop.
- `.mockups/receipt-stock/mobile.png` — captura responsive de la entrada desde Stock.

## Validations

- **Flujo 1 · Entrada:** en Stock, `Nueva recepción` ofrece remito existente o `Continuar sin remito`; en Compras, cada remito tiene `Recibir mercadería` y existe acceso directo a `Recepción sin remito`.
- **Flujo 2 · Estados:** el rail Borrador → Pendiente de trazabilidad → Lista para confirmar → Confirmada mantiene estado, explicación y próxima acción visibles. Cada estado combina texto, color, posición e indicador.
- **Flujo 3 · Confirmación:** la acción habilitada abre un modal de impacto; al confirmar muestra toast y resultado persistente con IDs, cantidades y enlaces. La navegación al saldo es explícita, no automática.
- **Flujo 4 · Saldo:** el resultado lleva a Artículo → tab Trazabilidad → posición física → origen de movimiento → proyección de saldo.
- **Flujo 5 · Responsive:** el selector superior alterna desktop/mobile; mobile reemplaza tablas operativas de recepción por filas apiladas, conserva el estado completo y usa navegación inferior.
- El HTML no requiere instalación: abrir `index.html` en un navegador.
- Render validado con Google Chrome local en 1440 × 1000 y 390 × 844.

## Supuestos Validados

- GoodsReceipt admite iniciar una recepción sin proveedor ni documento.
- Una recepción iniciada desde Remitos reutiliza el documento existente y no vuelve a pedir PDF o número.
- Un artículo no identificado sin remito es una incidencia local, no una diferencia documental.
- La ficha de artículo expone Trazabilidad con existencias y movimientos.
- La confirmación debe dejar referencias auditables hacia recepción y movimiento.

## Supuestos Abiertos

- Regla exacta para elegir depósito y posición cuando no existe una posición predeterminada.
- Si la confirmación permite diferencias de cantidad o exige una resolución/aprobación previa.
- Qué roles pueden confirmar versus preparar una recepción.
- Si una recepción confirmada admite reversa mediante movimiento compensatorio y quién puede ejecutarla.
- Nombres finales de los estados backend; la maqueta usa los nombres UX definidos en el brief.

## Risks

- La maqueta demuestra interacción y jerarquía, no contratos de API ni reglas de permisos.
- Los datos, cantidades, IDs y ubicaciones son demostrativos.
- La variante mobile prioriza el trabajo por artículo; la tabla completa requiere validación con usuarios que operen lectores USB en tablets.

## Next

- Validar los supuestos abiertos con Producto/Stock.
- Si se aprueba la dirección, convertirla en especificación de implementación sin copiar lógica al frontend.
