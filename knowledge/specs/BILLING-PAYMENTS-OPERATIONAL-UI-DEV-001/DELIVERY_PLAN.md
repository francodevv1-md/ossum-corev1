# Delivery plan

The package is implemented as four sequential review slices without commits:

1. Typed Invoice/Payment API clients and company-scoped hooks, with focused transport tests.
2. Backend invoice-bound `CobroFormDialog`, with focused behavior tests.
3. Backend-backed `/ventas/facturacion` page.
4. Backend-backed `/ventas/cobros` page, then integrated validation and independent review.

## Scoped size exception

The two existing pages and mock dialog total more than 1,000 lines and must lose mock/store authority. Replacing each owned file is allowed to exceed a 400-line raw diff because deletion/replacement is the smallest coherent change; no unrelated file or architecture expansion is authorized. Each slice is reviewed separately before the next one.
