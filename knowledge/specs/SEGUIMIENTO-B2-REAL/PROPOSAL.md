# Proposal — SEGUIMIENTO-B2-REAL

Status: proposed  
Change: `SEGUIMIENTO-B2-REAL`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## Summary

Promote Seguimiento from a presentational prototype into a real, persistent, collaborative case feed inside Expediente. B2 real should unify four evidence lanes in one operative surface: manual notes, authorization evidence, file/photo evidence, and selected mail evidence. The goal is not to replace Historial, not to build a Gmail client, and not to create a generic chat module; the goal is to give every operative role one durable place to understand what happened, what evidence exists, and what still needs action for a surgery.

---

## 1. Problem statement

The surgery circuit currently depends on fragmented follow-up across notes, emails, photos, documents, WhatsApp-style coordination, and operator memory. This creates four operational failures:

1. **Case context is split across tabs and channels.** The user must reconstruct the story of the case by jumping between Correo, Documentación, authorization material, and informal notes.
2. **Evidence is hard to preserve as operative context.** Even when proof exists, it is not reliably visible as part of a unified follow-up narrative.
3. **Collaboration is weak.** Different roles can act on the same case, but there is no shared feed that tells the next operator what was done, what was received, and what remains pending.
4. **Historial and operative follow-up are different needs.** Technical audit is necessary, but it does not replace the need for a human-readable, evidence-oriented operational feed.

---

## 2. Why B1 is not enough

B1 is useful as a direction check, but it is still insufficient for real operation because it is **presentational/derived only**.

- It does not create durable Seguimiento records.
- It cannot support a real evidence workflow across users and time.
- It depends on already-derived UI data instead of a persistent source of truth.
- It cannot safely become the collaboration surface for a real surgery case.
- It risks encouraging UX polish on top of an interaction model that still lacks persistence.

In short: B1 proves the tab can be understood; B2 real is what makes the tab operationally trustworthy.

---

## 3. What B2 real adds

B2 real introduces the first real Seguimiento capability as a **persistent surgery-level feed**.

Core additions:

1. **Persistent feed entries** attached to the surgery/expediente.
2. **Unified evidence types** inside that feed:
   - notes;
   - authorization evidence;
   - file/photo evidence;
   - selected mail evidence.
3. **Chronological collaborative view** so operators can understand the case progression without mixing it with low-level technical audit.
4. **Explicit evidence workflow**: evidence is not only stored elsewhere; it is intentionally surfaced inside Seguimiento as part of the case story.
5. **Separation of concerns**:
   - Seguimiento = operative feed;
   - Historial = technical/audit trace;
   - Correo = controlled source of selected evidence, not a full mailbox product.

---

## 4. Main user outcomes

If B2 real is successful, users should be able to:

- open a surgery and quickly understand the latest operative situation;
- see the most relevant evidence in one place without reconstructing the case manually;
- leave a note or attach proof that the next role can trust and continue from;
- capture an authorization proof, photo, or selected email as part of the case follow-up;
- distinguish clearly between operational follow-up and system audit/history.

---

## 5. High-level scope boundaries

### In scope

- Real/persistent Seguimiento at surgery/expediente level.
- Unified feed concept for notes + authorization evidence + file/photo evidence + selected mail evidence.
- Basic collaborative chronology oriented to case operation.
- Clear product separation from Historial and Correo.

### Out of scope

- Replacing Historial as audit/event infrastructure.
- Building a full Gmail or inbox-style mail viewer.
- Full document-management redesign.
- Generic chat/messaging product behavior.
- Deep UX polish before the persistent model exists.
- Cross-module automation or advanced workflow logic beyond the core evidence feed.

---

## 6. Risks and dependencies

### Risks

- **Scope inflation:** Seguimiento can drift into chat, inbox, or document repository if boundaries are not enforced.
- **Model confusion:** if Seguimiento and Historial overlap, operators may not know where to look for truth.
- **Evidence inconsistency:** if selected mail/file evidence rules are weak, the feed becomes noisy instead of useful.
- **Premature polish:** heavy UI work before persistence may harden the wrong behavior.

### Dependencies

- The already agreed product rule that Historial stays separate as technical audit.
- The already agreed product rule that Correo is not a full Gmail viewer.
- A real persistence approach in the later backend foundation phase, since B2 real cannot remain store-derived.
- Basic storage/linking strategy for file/photo and selected mail evidence.

---

## 7. Why do this before deeper UX polishing or parallel features

This should happen first because B2 real defines the **real job** of Seguimiento.

- Polishing B1 before persistence would optimize a non-final abstraction.
- Parallel features in Correo, Documentación, or notes risk fragmenting evidence even more if Seguimiento is not established first.
- A durable evidence feed becomes the foundation that later UX refinement can polish safely.
- OSSUM COR needs stronger case continuity more than it needs a prettier placeholder tab.

---

## 8. Proposal decision

Approve SEGUIMIENTO-B2-REAL as the next product/spec step for Seguimiento, with this narrow mandate:

> Build Seguimiento as the persistent, collaborative, evidence-oriented operational feed of the surgery case — without merging it with Historial and without turning Correo into a full mailbox product.

This keeps the scope decision-friendly, aligned with OSSUM COR guardrails, and ready for a later spec/design phase.
