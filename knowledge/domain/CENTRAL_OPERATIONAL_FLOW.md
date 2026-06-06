# CENTRAL_OPERATIONAL_FLOW.md — Circuito operativo central

Estado: vigente

---

## Circuito V1 canónico

```txt
Contactos → Cirugía/Expediente → Presupuesto → Preparación interna → Remito → Cirugía realizada → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro → Stock/Trazabilidad/Compras
```

Este flujo representa el camino completo que el producto debe soportar. No todos los pasos son obligatorios en todos los casos, pero el sistema debe poder conectarlos.

---

## Flujo explicado

### 1. Contactos

Se reutilizan actores: paciente, médico, cliente, institución, instrumentador, coordinador, proveedor, etc.

### 2. Cirugía/Expediente

Se crea el caso quirúrgico y se centraliza la información.

### 3. Presupuesto

Se estima, cotiza o define propuesta comercial. Puede tener versiones.

### 4. Preparación interna

Depósito/armado prepara material, cajas, instrumental, implantes, descartables, fotos y ficha técnica.

### 5. Remito

Se registra lo que sale. Puede incluir artículos, cajas completas o material suelto.

### 6. Cirugía realizada

El caso se ejecuta o cambia de estado según resultado.

### 7. Consumo

Se carga lo efectivamente utilizado.

### 8. Devolución

Se registra lo que vuelve.

### 9. Comparativa

Se compara presupuestado vs remitido vs consumido vs devuelto.

### 10. Documentación

Se verifica si están los documentos necesarios para facturar/cerrar.

### 11. Facturación

Se emite o registra factura según base: presupuesto, consumo, manual o mixto.

### 12. Cobro

Se registra el pago y se imputa contra factura/s.

### 13. Stock/Trazabilidad/Compras

Stock se actualiza con movimientos y compras recibe necesidades de reposición.

---

## Reglas de conexión

- Presupuesto no equivale a remito.
- Remito no equivale a consumo.
- Consumo no equivale a factura, pero puede ser base.
- Devolución no debe asumirse sin validación.
- Documentación puede bloquear facturación.
- Cobro es independiente de factura, pero puede imputarse.
- Stock debe registrar movimientos, no solo saldos.

---

## Criterio de éxito

Un usuario debe poder abrir una cirugía y ver su recorrido completo sin buscar en módulos aislados.

