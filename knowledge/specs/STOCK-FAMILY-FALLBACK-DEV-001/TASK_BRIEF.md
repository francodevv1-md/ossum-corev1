# Stock Family Fallback DEV

## Objective

Prevent `/stock` from crashing when canonical Article families use free-form values outside the legacy mock family enum.

## Root cause

The canonical API adapter cast arbitrary `Article.family` strings to the closed mock `Family` union. Direct `FAMILY_STYLE[item.family]` lookups then returned `undefined` for values such as `Trauma · Clavos` and `Artroscopia · LCA`.

## Scope

- Keep canonical family labels as strings.
- Resolve known/base family styles when possible and use a neutral package fallback otherwise.
- Make the table thumbnail, family column, article sheet, and new-article preview consume the safe resolver.
- Add focused regression coverage for Cajas-derived family values.

## Exclusions

- No schema, DB data, seed, Auth, permissions, business rules, dependencies, deploy, commit, push, or PR.

## Validation

- Focused test, ESLint, build, diff check, and independent read-only review.
