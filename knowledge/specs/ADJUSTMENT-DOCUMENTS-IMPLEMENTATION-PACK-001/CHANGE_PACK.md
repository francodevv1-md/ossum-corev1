# Change Pack — Documentos de Ajuste Multi-Origen (NC / ND) DEV

- **Task ID:** `ADJUSTMENT-DOCUMENTS-IMPLEMENTATION-PACK-001`
- **Estado:** Preparado / Esperando aprobación de Franco
- **Fecha:** 2026-09-29
- **Clasificación de Riesgo:** T3 (Schema + Migración DEV + Integración Fiscal)

---

## 1. Resumen Ejecutivo

Este Change Pack define la arquitectura, modelo relacional, servicios, endpoints REST y adaptación fiscal para soportar de punta a punta **Documentos de Ajuste (Notas de Crédito y Débito)** en OSSUM COR bajo tres orígenes canónicos:
1. **Factura interna OSSUM emitida:** Con validación de estado emitido e impacto transaccional en `Invoice.balance`.
2. **Comprobante externo preexistente:** Con snapshot inmutable de auditoría (`tipo`, `punto_venta`, `numero`, `fecha`, `cuit`, `cae` opcional) **sin alterar balances internos ni generar saldos ficticios**.
3. **Período desde/hasta:** Exclusivo para rol `admin`, sujeto a las validaciones impositivas de ARCA (prohibido en notas E).

---

## 2. Documentos del Paquete

- [TASK_BRIEF.md](./TASK_BRIEF.md) — Alcance, exclusiones, archivos permitidos y paradas.
- [SPEC.md](./SPEC.md) — Invariantes de dominio, orígenes y máquina de estados.
- [DESIGN.md](./DESIGN.md) — DDL Prisma, contratos REST y adaptación TusFacturas.
- [TASKS.md](./TASKS.md) — Plan de trabajo, suite de pruebas y estrategia de rollback.

---

## 3. Pregunta de Aprobación Explícita para Franco

> **¿Aprobás el Change Pack `ADJUSTMENT-DOCUMENTS-IMPLEMENTATION-PACK-001` con su schema aditivo `AdjustmentDocument` / `AdjustmentDocumentItem`, migración DEV descartable, endpoints REST y adaptación fiscal de comprobantes asociados para facturas internas, externas y por período (restringido a admin)?**
