# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

OSSUM COR serves operational teams in surgical distributors, orthopedics, and healthcare commerce: coordinators, administrative staff, sales and collections teams, logistics and stock operators, instrument technicians, and managers.

They work under time pressure across surgical cases, authorizations, preparation, remitos, consumption, returns, documentation, invoicing, and collections. Each role needs access to the same operational truth at the appropriate level of detail and permission.

## Product Purpose

OSSUM COR is a multi-company operational ERP centered on the Cirugía/Expediente as the canonical entity. It replaces fragmented workflows spread across XAdmin, spreadsheets, WhatsApp, paper, email, photos, PDFs, and informal knowledge with one connected and traceable surgical circuit.

Success means teams enter information once, reuse it throughout the workflow, understand the current state and next required action quickly, reduce manual steps, automate repeatable processes, and preserve a visible audit trail from the initial contact through collection.

## Positioning

OSSUM COR connects the complete surgical circuit around one shared and traceable Cirugía/Expediente, simplifying steps, automating operational processes, and making information available across the organization according to each user's role.

Unlike a generic ERP, spreadsheet, or isolated management system, its core mechanism is the Cirugía/Expediente: every request, authorization, preparation, shipment, consumption, return, document, invoice, payment, stock event, and responsible actor can be understood as part of the same operational history.

The circuit is designed to remain open to useful technology—including AI—when it can reduce repetitive work, help interpret information, or support decisions without hiding source evidence, business rules, or human accountability.

## Operating Context

The canonical V1 circuit is:

`Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro`

Stock, Cajas, Trazabilidad, and Compras operate across that circuit. Users coordinate with doctors, institutions, funders, patients, transport providers, and internal areas while handling physical materials and operational evidence such as remitos, authorizations, photos, emails, consumption records, returns, invoices, and receipts.

The Cirugía is the central operational entity; the Expediente is its integral view. The Expediente must make it possible to understand what was requested, budgeted, authorized, prepared, shipped, consumed, returned, documented, invoiced, and collected, including who performed each action.

## Capabilities and Constraints

- Multi-company operational model with company-scoped data and permissions.
- Server-side domain services, centralized validation, explicit business rules, and auditability for critical actions.
- PostgreSQL-backed truth is the target; Zustand and localStorage remain transitional only where migration is incomplete.
- Next.js, React, TypeScript, Prisma, and managed PostgreSQL form the current technical foundation.
- AI is an assistive capability, not an authority: generated interpretations must remain distinguishable from confirmed facts and must not bypass permissions, validation, or audit trails.
- Information should be broadly discoverable to authorized users, but never at the expense of company boundaries, role permissions, security, or confidentiality.
- XAdmin is an operational learning source, not a product or interface to copy.
- TusFacturasAPP may serve as an external fiscal engine; it is not the product core.
- OSSUM COR is not a generic medical CRM, appointment system, isolated stock tool, POS, or frontend-only prototype.

## Brand Commitments

- Canonical name: **OSSUM COR**.
- Voice: clear, clinical, operational, precise, and trustworthy.
- User-facing operational language is Spanish.
- The product must feel built for real, intensive work rather than decorative presentation.
- Product truth, traceability, and understandable state take precedence over visual novelty.

## Evidence on Hand

- Canonical product definition and workflow: `knowledge/core/PROJECT_BRIEF.md`.
- Canonical technical and product decisions: `knowledge/core/CANONICAL_DECISIONS.md`.
- Current implementation status and known constraints: `knowledge/core/CURRENT_STATE.md`.
- Working product surfaces exist for Cirugía/Expediente, coordination, contacts, remitos, consumption, returns, traceability, invoicing, collections, stock, Cajas, purchasing, notifications, and audit.
- Reference screenshots exist under `public/ejemplos/`; they are design and workflow examples, not customer evidence or final product authority.
- No testimonials, customer logos, performance benchmarks, pricing claims, or public case studies are confirmed; future work must not fabricate them.

## Product Principles

1. **One connected operational truth:** organize the surgical circuit around the Cirugía/Expediente instead of isolated modules and duplicate data.
2. **Simplify before adding:** reduce steps, repeated entry, handoffs, and hidden dependencies before introducing more interface or process.
3. **Automate with accountability:** automate repeatable work while keeping sources, decisions, permissions, and responsible actors visible.
4. **Share context, respect boundaries:** make useful information discoverable across authorized teams without weakening multi-company isolation, confidentiality, or role controls.
5. **Technology serves the circuit:** adopt AI and other technologies when they materially improve speed, comprehension, or traceability without replacing verified operational truth.

## Accessibility & Inclusion

Target accessible product UI with strong text contrast, keyboard-reachable controls, visible focus states, clear loading and error feedback, and reduced-motion-safe interactions. Critical status, validation, confidence, or workflow state must never rely on color alone.

Interfaces must support dense operational use while preserving readable hierarchy, explicit labels, and understandable language for users with different technical backgrounds.
