# PROJECT_BRIEF.md — OSSUM COR

Estado: vigente  
Tipo: resumen principal de producto

---

## Definición

OSSUM COR es un ERP operativo multiempresa para distribuidoras quirúrgicas, ortopedias y comercios de salud, diseñado alrededor de la Cirugía/Expediente como entidad central.

El producto busca reemplazar progresivamente circuitos dispersos en XAdmin, WhatsApp, planillas, papel, correos, fotos, PDFs y conocimiento informal de cada área, conectando en un solo flujo operativo contactos, presupuestos, preparación de material, remitos, consumo, devoluciones, comparativa, documentación, facturación, cobros, stock, cajas, compras y trazabilidad.

---

## Circuito V1 canónico

```txt
Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro
```

Stock, cajas, trazabilidad y compras son transversales al circuito.

---

## Entidad central

La cirugía es la entidad operativa central.  
El expediente es la vista integral de esa cirugía.

Desde el expediente debe poder verse:

- qué se pidió;
- qué se presupuestó;
- qué se autorizó;
- qué se preparó;
- qué se envió;
- qué se consumió;
- qué volvió;
- qué diferencia hubo;
- qué documentación existe;
- qué se facturó;
- qué se cobró;
- quién realizó cada acción.

---

## Problema que resuelve

OSSUM COR resuelve la fragmentación operativa de empresas como Districorr:

- información duplicada;
- mensajes cruzados por WhatsApp;
- dependencias de papel y planillas;
- dificultad para saber qué falta documentar;
- falta de trazabilidad entre presupuesto, remito, consumo y factura;
- material faltante o sin seguimiento;
- dificultad para cobrar correctamente;
- poca visibilidad gerencial del circuito completo.

---

## Qué no es

OSSUM COR no es:

- OrtoTrack como identidad final;
- ChatZIA como metodología vigente;
- XAdmin copiado con otra interfaz;
- solo un sistema de turnos quirúrgicos;
- solo un gestor de stock;
- solo facturación;
- un prototipo frontend terminado;
- un CRM médico genérico;
- un POS como producto principal;
- un sistema fiscal cuyo núcleo sea TusFacturasAPP.

---

## Fuente de verdad técnica

La fuente de verdad final debe ser backend + PostgreSQL.

Zustand/localStorage queda solo como transición del prototipo actual.

Stack V0 vigente:

- Next.js.
- API Routes y/o Server Actions.
- Prisma.
- PostgreSQL gestionado.
- Supabase o Neon como candidatos.
- Supabase Auth/Storage opcional.
- VPS postergado.

---

## Criterio de éxito V1

La V1 será exitosa cuando se pueda tomar un caso real y recorrerlo completo:

```txt
Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro
```

Con estas condiciones:

- datos cargados una vez y reutilizados;
- expediente como vista central;
- estados claros;
- auditoría visible;
- stock operativo mínimo;
- facturación basada en reglas explícitas;
- cobros imputables y saldo claro.

