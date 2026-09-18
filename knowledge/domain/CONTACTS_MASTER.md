# CONTACTS_MASTER.md — Maestro de Contactos

Estado: vigente

---

## Principio

Contactos es el maestro reutilizable del sistema.

Un contacto no es solo “cliente” o “paciente”. Es una entidad base que puede cumplir roles diferentes según contexto.

---

## Tipos de contacto posibles

- Cliente / pagador.
- Paciente.
- Médico.
- Institución.
- Obra social.
- ART.
- Instrumentador.
- Coordinador.
- Vendedor.
- Proveedor.
- Transporte.
- Interno / empleado.
- Agenda general.

---

## Modelo conceptual

### Contacto global

Datos generales:

- nombre / razón social;
- tipo de persona;
- CUIT/DNI si aplica;
- teléfonos;
- email;
- direcciones;
- notas;
- estado general.

### Vínculo por empresa

Permite que un contacto tenga rol y configuración específica por empresa:

- empresa;
- rol/es;
- estado;
- condiciones comerciales;
- configuración fiscal;
- observaciones internas;
- permisos si aplica.

### Función contextual

El contacto cumple una función dentro de una operación:

- paciente de una cirugía;
- médico de una cirugía;
- cliente fiscal de una factura;
- destinatario de un remito;
- proveedor de una compra;
- instrumentador asignado;
- coordinador responsable.

---

## Regla clave

La función depende del campo donde se usa.

Un mismo contacto puede ser médico en una cirugía, cliente fiscal en otra relación o proveedor en una empresa distinta si el modelo lo permite.

---

## Reglas para agentes

- No duplicar contactos por rol si puede resolverse con vínculo/contexto.
- No hardcodear roles de Districorr como única estructura.
- No asumir obligatoriedad universal de campos; puede depender de empresa/tipo.
- Diseñar para multiempresa desde el inicio.

