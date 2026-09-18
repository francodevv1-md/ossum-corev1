# MULTI_COMPANY_ACCESS.md — Multiempresa y permisos

Estado: inicial vigente

---

## Principio

OSSUM COR debe ser multiempresa desde el inicio.

Ejemplo inicial:

```txt
Grupo Districorr → Districorr / Casa Salud
```

Empresas externas futuras deben tener separación real de datos.

---

## Entidades conceptuales

- Organization / Tenant.
- Company.
- Branch.
- User.
- Role.
- Permission.
- UserCompanyAccess.

---

## Reglas

- Toda entidad operativa debe estar asociada a empresa cuando corresponda.
- El usuario solo puede ver/modificar empresas autorizadas.
- Backend debe validar acceso, no solo frontend.
- Supabase RLS puede ser capa adicional, no reemplazo.
- Cambios de permisos deben auditarse.
- Usuarios externos deben ver historial filtrado.

---

## Operaciones críticas

Requieren permisos explícitos:

- crear/modificar cirugía;
- cambiar estado CX;
- emitir/remitir material;
- validar consumo;
- registrar devolución;
- facturar;
- registrar cobro;
- modificar stock;
- cambiar permisos;
- exportar información sensible.

