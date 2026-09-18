# DATA_MODEL_RULES.md — Reglas de modelo de datos

Estado: inicial vigente

---

## Principios

- Diseñar multiempresa desde el inicio.
- No modelar solo para Districorr hardcodeado.
- Separar entidad base, vínculo por empresa y función contextual.
- No duplicar entidades cuando un vínculo resuelve el rol.
- Mantener historial/auditoría de acciones críticas.
- Evitar automatismos destructivos.

---

## Identificadores

Toda entidad operativa importante debería tener:

- ID técnico interno.
- Número visible configurable cuando aplique.
- Empresa.
- Sucursal si aplica.
- Tipo de documento si aplica.
- Año si aplica.
- Prefijo si aplica.
- Secuencia si aplica.

Aplica a:

- Cirugía.
- Presupuesto.
- Preparación.
- Remito.
- Consumo.
- Devolución.
- Factura.
- Cobro.
- Movimiento de stock.
- Caja física.

---

## Contactos

Modelo sugerido:

- Contact.
- CompanyContact / ContactCompanyLink.
- ContactRole o función contextual.
- ContactAddress.
- ContactGroup.

---

## Operaciones

Toda operación crítica debe guardar:

- empresa;
- usuario;
- timestamps;
- estado;
- auditoría;
- referencias a documentos relacionados.

---

## Stock

Stock no debe ser solo saldo. Debe poder explicarse por movimientos.

---

## Evitar

- enums rígidos sin estrategia de configuración;
- campos de texto libre como única fuente de relación;
- mezclar fiscal con operativo demasiado temprano;
- crear modelos enormes no validables en el primer commit.

