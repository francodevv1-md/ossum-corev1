# Cajas UX/UI Mockup Baseline

Status: **reference baseline for future DEV increments**  
Route: `/cajas/presentacion`  
Authority: `SPEC.md`, `DESIGN.md`, and approved Cajas decisions remain authoritative.

## Purpose

This baseline preserves a navigable UX/UI reference for Cajas without presenting fixtures or local interactions as operational truth. Future implementation slices should reuse the vocabulary, information separation, checkpoints, and responsive behavior demonstrated here, then replace illustrative state with approved server contracts.

## Product boundary represented

| Stage | Current DEV coverage | Mockup responsibility |
| --- | --- | --- |
| Definition and discovery | Formula creation/read, physical-unit lookup | `Caja`, `Contenido esperado`, and `Caja identificada` remain visibly distinct. |
| Surgery assignment | Physical unit assignment and expected-line snapshot | Keep operation ownership in the Surgery/Record. |
| Physical preparation | Not yet operationally connected | Show provisional selection, explicit incorporation/reservation checkpoint, and expected-vs-found comparison. |
| Control and dispatch | Not reachable from the current Cajas runtime | Preserve `Control de preparación`, re-control, and separate `Contenido despachado` evidence. |
| Return and differences | Not reachable from the current Cajas runtime | Use exception-driven partial return, individual difference closure, and explicit `Recontrolar caja`. |

## Locked UX rules

1. `/cajas` is discovery and summary; Surgery/Record owns operational preparation.
2. A provisional selection does not reserve Stock. Explicit incorporation is the reservation checkpoint.
3. `Contenido esperado`, physical selection, `Control de preparación`, and `Contenido despachado` never masquerade as one another.
4. A partial return may be a `Porción sin diferencias`; it does not make the complete `Caja identificada` globally `Disponible`.
5. The exact concept action is `Recontrolar caja`.
6. Every illustrative surface states that it creates no real Stock movement, document, evidence, or persistence.
7. The scenario selector is the review index: designers and implementers can inspect each stage without replaying prior local interactions.

## Validation contract

- Desktop and `412x915` must retain current stage, identity, differences, and a reachable primary action without covering operational content.
- Keyboard focus, accessible names, non-color state cues, and 44px repeated actions are mandatory.
- Future changes to these rules require synchronization with `SPEC.md`/`DESIGN.md` and focused component tests.
- This file records UX intent only; it does not authorize schema, API, Auth, permission, migration, or production changes.
