# Controlled live mail validation — delivered with persisted tracking

Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. Runtime reservation: `.opencode/locks/MAIL-AUTHORIZATION-LIVE-20261006.lock.md`.

## Approval and preconditions

- Franco allowed choosing a synthetic disposable-DEV case for the proposed single email recipient, then explicitly transferred DEV5000 runtime reservation.
- Prior documented company: `codevdistricorr1000000000`; candidate case: uniquely marked synthetic CX-0010 using the four canonical baseline DEV contact IDs. The runtime runner must reverify actual membership, company and exact fixture identity before dispatch.
- Redacted local configuration: environment loader PASS, real Resend key present, configured sender format valid, configured company equals documented target. No values printed or edited.
- Read-only Resend metadata: configured sender domain verified **PASS**. This is not delivery acceptance.
- Owned Next DEV: launcher PID49388 / worker PID50552, loopback5000. A short readiness request timed out after harness restart; bounded recheck returned login HTTP200. No foreign process or server was stopped/restarted.
- Existing manual login capture completed **PASS**, authenticated/200 exact-company membership; fresh unique state outside Git, capture browser closed. No credentials automated and no cookie/token/state contents recorded here.
- Restart recovery confirmed private state still present and **no single-send attempt receipt**. Never replay a possible send after a restart without first checking the exclusive attempt marker.

## Remaining gate

The saved, guarded actual mail runner is being authored under the live lock and must pass independent source review before invocation. It must:

1. Fail closed on expired/mismatched session, non-synthetic fixture or unplanned write/recipient.
2. Exercise the actual Ficha modal with a clearly synthetic PNG and explicit recipient.
3. Persist an exclusive one-send attempt marker before permitting the native application's POST; no automatic retry/marker reset.
4. Record real provider acceptance, delivery and Seguimiento persistence as separate verdicts, without raw identities/secrets or live-app screenshots.

## Actual runtime attempts — historical navigation block

- Saved runner `scripts/qa/run-mail-process.mjs` added after unavailable author; syntax and offline payload self-test **PASS**. Independent recipient-guard correction and re-review **PASS** before the single-send invocation.
- Actual membership and exact synthetic fixture checks **PASS** during the browser run. The native page contains one exact CX-0010 label and one matching row.
- Native navigation **BLOCKED**: after double-click, the expected `Más acciones de la cirugía` Header control was not available; `TimeoutError` at `native-header-menu`.
- A targeted QA locator correction clicked the case label instead of the row midpoint. Read-only validation still blocked at the same Header step. One run recorded an unclassified client exception; the latest recorded none. This does not establish a final root cause in application source versus runtime/selector state.
- All owned browser contexts closed. Exclusive attempt marker **ABSENT**: no email POST or provider dispatch occurred. Do not bypass the native UI with a direct POST to manufacture acceptance.
- Stop repeated validation of this same blocker. The live QA lock currently freezes application source; a focused recovery must trace Cirugías→Ficha and authorize any needed direct application correction before editing.

**Correction to prior chat status:** actual modal, actual image preview and actual user-signature preview have **not** passed; navigation blocked before reaching them. Only the earlier isolated synthetic HTML renderer passed image layout checks.

Current actual dispatch / provider acceptance / delivery / persisted mail Seguimiento: **NOT RUN**. Prior 72 mocked checks and two synthetic Chromium rendering checks remain separate evidence; do not call them a live mail pass.

## Fresh-session native acceptance — current result

- Correct manual QA capture completed **PASS** outside Git. Exact authenticated company and synthetic fixture checks revalidated.
- Existing native row menu “Ver expediente” opens actual Ficha Header: **PASS**, no writes and no tripwire. No application navigation fix or Auth change was required; foreign Header/date fix preserved.
- Actual native email action and modal open: **PASS**. Initial preview run timed out; structural diagnosis observed disabled upload while initial evidence feed was loading. QA replay now waits for enabled upload and rejects alerts rather than bypassing UI loading guards.
- Actual image and individual/company signature preview: **PASS**, exact synthetic PNG data URL and 1000×1200 decoded dimensions. Check-only mode permits no mutations or email POST.
- Seven current-source mocked suites rerun **72/72 PASS** (3.16s), separate from actual preview. Independent final runner source review **PASS** (`ses_eed6f8953ffepEBtjGyXKGlHM6`).
- Provider acceptance / delivery / Seguimiento readback remain **NOT RUN** until the exclusive single-send invocation; attempt marker absent before that invocation. No screenshots or sensitive state contents recorded.

## Single authorized dispatch — final result

**PASS**, through the native Ficha → mail action → actual modal, not a direct API send:

| Gate | Observed result |
| --- | --- |
| One native email POST | **PASS**, fixed approved recipient and exact synthetic PNG; exclusive `wx` receipt before forwarding |
| Provider acceptance | **PASS**, real (not simulated), ID `01a11291-c041-7a14-8bac-8587091edb23` |
| Provider delivery readback | **PASS**, exact message `last_event=delivered` |
| Sender, reply-to, recipient, CID and signature | **PASS**, exact-message provider readback, no secret/body dump |
| Route tracking | **PASS**, `auditRecorded=true` |
| Backend Seguimiento readback | **PASS**, exactly one entry matching company, surgery, authenticated author, unique subject and provider ID |
| Native modal completion | **PASS**, modal closed after acceptance |

External exclusive receipt now records `delivered` and is retained; never delete/reset it or rerun `--send-once`. Owned QA browsers closed, server left running. No additional email, commit/push/deploy or Auth/schema/domain change. Inbox appearance/image rendering in the recipient's mail client was **not inspected**; provider-delivered status does not prove Gmail/Outlook visual rendering. The target contained a clearly marked synthetic DEV image, not an invented clinical authorization.

Current source baseline: HEAD `cef953941d82fef929ba10c75eb49ee987766e3c` plus approved uncommitted mail work. Modal SHA256 `1F95D842B49DDE3A99AB4739F61479A39253EA46450E6148FDB6B0B3636C3206`; Novedades `6FCA187F0D9CA223C851511CBD9E6B4807140A45968796B1D6223B4F3EAF5EFC`; Coordinator `C1A53985B983923D9771B746CD31614D1394782EA5AB60727D5737ACD0A84726`.

Recipient confirmation: Franco explicitly reported **“Perfecto correo recibido”** after this send and requested a local commit of this package. Receipt is user-confirmed; detailed client rendering was not separately reviewed. No further send or publication is included.

Source and Auth remain unchanged during runtime QA. Browser budget remains 20 minutes; no build/typegen, DB tools, fixture creation, authorization/status mutation, schema work or publication is approved.
