# Design — SEGUIMIENTO-B2-REAL

Status: designed  
Change: `SEGUIMIENTO-B2-REAL`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Design summary

B2 real defines `Seguimiento` as the persistent, collaborative, surgery-level operational feed inside Expediente. Its job is to let operative users understand the current case situation, leave meaningful follow-up, and surface selected evidence in one chronological narrative.

The design keeps three surfaces clearly separate:

- `Seguimiento` = human-readable operational feed for the case.
- `Historial` = technical audit and cross-module traceability.
- `Correo` = controlled source from which selected mail evidence can be promoted into Seguimiento.

This design is intentionally product- and interaction-level. It does not lock backend schema, storage provider, auth provider, or implementation internals.

---

## 2. Product role of Seguimiento

### 2.1 Core job

Seguimiento answers:

- what happened in this case;
- what evidence exists;
- what was communicated or received;
- what remains pending for the next operator.

### 2.2 What Seguimiento is not

Seguimiento must not become:

- a full technical audit log;
- a generic team chat;
- a full document repository;
- a mailbox or inbox replacement;
- a hidden workflow engine.

---

## 3. User roles and interaction model

### 3.1 Primary user groups

The feed is designed for collaborative use by operative roles that touch the surgery lifecycle, including for example:

- coordinators / surgery operators;
- commercial or authorization-follow-up roles;
- logistics / documentation-support roles;
- supervisors or backoffice users who need case continuity.

The exact permission matrix can evolve later, but the design assumes multiple internal roles collaborate on the same case over time.

### 3.2 Interaction model

Seguimiento is asynchronous and case-centered, not conversational.

Users interact by:

1. reading the latest case story;
2. adding a note when they create or clarify operative context;
3. promoting evidence into the feed when that evidence matters for case continuity;
4. filtering the feed when they need a narrower view.

The dominant behavior is **leave context for the next role**, not live back-and-forth messaging.

---

## 4. Feed entry model

### 4.1 Entry families

B2 real supports four entry families inside one unified chronology:

1. **Manual note**
2. **Authorization evidence**
3. **File/photo evidence**
4. **Selected mail evidence**

Each family enters the same feed but keeps its own semantic identity so users understand what kind of proof or context they are seeing.

### 4.2 Manual note responsibility

Manual notes are for concise operative context that is not already expressed by a structured module event.

They should capture things such as:

- relevant follow-up outcomes;
- pending clarifications;
- handoff context between roles;
- short explanations attached to evidence.

They should not be used as a substitute for structured module data entry.

### 4.3 Authorization evidence responsibility

Authorization evidence entries represent meaningful proof related to authorization status or authorization follow-up.

Conceptually, they exist to answer questions like:

- was authorization received, denied, pending, or clarified;
- what proof supports that understanding;
- when did that proof become relevant to the case.

These entries are evidence-oriented, not just free text. They may carry a short operator summary, but their main job is to preserve the operative proof inside the case story.

### 4.4 File/photo evidence responsibility

File/photo evidence entries represent selected visual or documentary proof that matters operationally for the surgery case.

Typical examples include:

- photos sent as proof of material, condition, packaging, or delivered paperwork;
- uploaded documents that clarify a pending issue;
- files intentionally attached to support follow-up.

The design intent is not “every file in the case appears in Seguimiento”. Only evidence that should be part of the operative narrative is promoted into the feed.

### 4.5 Selected mail evidence responsibility

Selected mail evidence entries represent mail conversations or mail fragments intentionally promoted from `Correo` into Seguimiento because they help explain the case.

Their responsibility is to preserve mail as operative evidence, not to reproduce mailbox browsing inside the feed.

The feed should show a concise evidence representation of the selected mail item, while `Correo` remains the source surface for mail review and selection.

---

## 5. Separation between Seguimiento, Historial, and Correo

### 5.1 Seguimiento

Human-readable, collaborative, evidence-oriented case feed.

Best for:

- understanding the current situation fast;
- seeing selected proof in context;
- handing off work between operative roles.

### 5.2 Historial

Technical and audit-oriented trace of system and module events.

Best for:

- who changed what;
- exact event traceability;
- cross-module audit and accountability.

Historial may contain events related to Seguimiento actions, but it does not replace the user-facing operative narrative.

### 5.3 Correo

Mail review and selection surface scoped to the surgery.

Best for:

- inspecting linked conversations;
- identifying relevant messages or attachments;
- choosing what mail evidence deserves promotion to Seguimiento.

Correo is not the primary place to reconstruct the whole case story. Seguimiento is.

### 5.4 Boundary rule

If the user needs a readable operational story, go to `Seguimiento`.
If the user needs an audit/event trace, go to `Historial`.
If the user needs to inspect email source material, go to `Correo`.

---

## 6. Conceptual behavior of evidence entry

### 6.1 Authorization evidence behavior

Authorization evidence should enter Seguimiento as a deliberate evidence action, not as accidental background data.

Conceptually, each authorization evidence entry should:

- indicate that the evidence relates to authorization follow-up;
- preserve enough summary for fast reading;
- preserve the proof/reference that supports the claim;
- remain understandable later without forcing the user to search another tab first.

The design should allow an operator to trust that an authorization-related item in Seguimiento reflects a meaningful evidence checkpoint in the case.

### 6.2 File/photo evidence behavior

File/photo evidence should enter Seguimiento through explicit promotion or attachment to the feed, not through automatic bulk mirroring from all case files.

Conceptual rules:

- evidence must be intentionally selected;
- the feed entry should show what kind of evidence was added;
- a short operator note may add interpretation when needed;
- the feed should present the evidence as part of chronology, not as a separate mini-repository.

### 6.3 Selected mail evidence behavior

Selected mail evidence should originate from `Correo` and be promoted into Seguimiento only when the conversation, message, or mail-derived proof materially helps case continuity.

Conceptual rules:

- not every linked conversation becomes a feed entry by default;
- promotion into Seguimiento is selective and intentional;
- the resulting entry should summarize why the mail matters;
- mail evidence shown in Seguimiento should remain clearly distinguishable from manual notes and from raw mailbox browsing.

---

## 7. Read/write permissions at a high level

### 7.1 Read model

At design level, Seguimiento should be broadly readable by internal roles who can already access the surgery/expediente and need operative continuity.

The default posture should favor shared visibility inside the authorized internal case team, because fragmented visibility would weaken the feed's collaboration value.

### 7.2 Write model

Write access should be limited to authorized internal roles who actively operate on the case.

At a high level, the design assumes:

- some users can read but not add/edit evidence;
- some users can add notes and promote evidence;
- stronger controls may apply to destructive or corrective actions later.

### 7.3 Guardrail

The detailed permission matrix, external visibility, and any security-sensitive rules remain later approval items. This design only establishes that Seguimiento is collaborative but not universally writable.

---

## 8. Chronology and filtering model

### 8.1 Chronology

Seguimiento should present one unified reverse-chronological feed by default, optimized for “what is the latest relevant case context?”.

Each entry should preserve:

- entry type;
- author or source actor when applicable;
- timestamp/context of incorporation into the feed;
- concise readable summary;
- linked evidence payload or reference.

### 8.2 Filtering

Filtering should reduce noise without fragmenting the model.

Recommended design-level filters:

- by entry family: notes / authorization / files-photos / mail;
- by time window;
- optionally by actor/source when useful.

Filters must not create separate disconnected sub-products. They are views over one feed, not different systems.

### 8.3 Reading priority

Default reading mode should help the operator answer quickly:

1. what is newest;
2. what evidence exists;
3. what still looks pending or unresolved.

---

## 9. UX constraints and anti-goals

### 9.1 UX constraints

- Keep the feed readable and scannable.
- Make evidence types visually distinct.
- Favor concise summaries over dense technical payloads.
- Preserve a clear action path to add a note or promote evidence.
- Keep the case story central; avoid forcing tab-hopping to understand basic context.

### 9.2 Anti-goals

- No chat-style infinite back-and-forth design language.
- No inbox-style mail management inside Seguimiento.
- No raw audit-event dump disguised as a feed.
- No automatic flooding of the feed with every file, every mail, or every system event.
- No premature micro-polish that obscures unresolved model boundaries.

---

## 10. Migration path from B1 prototype to B2 real

### 10.1 Role of B1

B1 remains a directionally useful UI prototype, but not the source of truth and not the final interaction contract.

### 10.2 Migration direction

The migration from B1 to B2 real should happen conceptually in this order:

1. preserve the validated intuition that Seguimiento belongs inside Expediente as an operative surface;
2. replace presentational/derived-only behavior with a persistent feed model;
3. formalize the four entry families as first-class feed entries;
4. keep Historial separate as audit and Correo separate as mail source;
5. only after the persistent model is stable, refine deeper UX behavior and polish.

### 10.3 B1 elements to keep vs discard

Keep from B1:

- the idea of a unified follow-up surface;
- the expectation of quick contextual reading inside the case;
- the value of seeing evidence near notes.

Discard from B1:

- any dependence on derived/local/prototype-only data as truth;
- any ambiguity between operative follow-up and audit history;
- any behavior that implies Seguimiento is just a styled view of other tabs.

---

## 11. Open design guardrails for later spec

The later spec may define flows and contracts in more detail, but it should stay inside these guardrails:

- do not collapse Seguimiento into Historial;
- do not convert Correo into a full mailbox product;
- do not auto-ingest all evidence indiscriminately;
- do not lock provider, storage, or auth decisions at design level;
- do not let the feed become a generic chat module.

---

## 12. Design decision

B2 real should proceed as a persistent, surgery-scoped, collaborative feed where notes and selected evidence coexist in one readable chronology, with strict product separation from audit history and mail-source browsing.
