# Mail image package — current validation and replay

Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. Current pre-commit HEAD: `cef953941d82fef929ba10c75eb49ee987766e3c` plus approved mail work. Date: 2026-10-06. The original snapshot below is historical; current recovered caller hashes and actual single-send evidence are in `LIVE_VALIDATION.md`.

## Exact replay commands

```powershell
# Mocked checks only; never replace with npm test (which includes DB suites).
& .\node_modules\.bin\vitest.cmd run src/__tests__/unit/resend.service.test.ts src/__tests__/unit/mail-send-honesty.test.ts src/__tests__/unit/authorization-email-template.test.ts src/__tests__/unit/authorization-email-evidence.test.ts src/__tests__/components/SendEmailModal.test.tsx src/__tests__/components/CoordinatorShareDialog.test.tsx src/__tests__/components/NovedadesAuthorizationEmail.test.tsx --reporter=verbose

# Real Chromium, synthetic HTML only: no application server/Auth/DB/provider.
& .\node_modules\.bin\playwright.cmd test --config=playwright.mail.config.ts

# Read-only global type check; current result is FAIL in unrelated files.
& .\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false
```

| File / layer | Checks | Current result |
| --- | ---: | --- |
| `resend.service.test.ts` — real service, env stubbed/network mocked | 11 | PASS |
| `mail-send-honesty.test.ts` — real route, auth/company/provider/audit/DB mocked | 11 | PASS |
| `authorization-email-template.test.ts` — shared HTML/validator | 10 | PASS |
| `authorization-email-evidence.test.ts` — actual helper, scoped network/auth mocked | 8 | PASS |
| `SendEmailModal.test.tsx` — actual modal, dialog/auth/network mocked | 17 | PASS |
| `CoordinatorShareDialog.test.tsx` — actual component, motion/dialog/hooks/network mocked | 6 | PASS |
| `NovedadesAuthorizationEmail.test.tsx` — actual Novedades, modal prop capture, hooks mocked | 9 | PASS |
| Current combined command | 72 | PASS, exit 0, 3.16 seconds; unchanged focused checks after source recovery |
| Synthetic browser template | 2 | PASS, 8.7 seconds |
| Global TypeScript | — | FAIL, exit 2, four unrelated diagnostics; see HANDOFF |
| Native app / tracking / real provider | — | PASS — one authorized send delivered, persisted Seguimiento and modal completion verified; recipient confirmed receipt |
| Detailed recipient mail-client rendering | — | NOT RUN |

Original raw test/typecheck output: `EVIDENCE_tests.txt`, `EVIDENCE_typecheck.txt`. Exit codes were captured in terminal and recorded here. Node's localstorage warning did not prevent completion; expected mocked audit-error output is not a real DB failure. The later 72-check rerun and actual acceptance are recorded separately in `LIVE_VALIDATION.md`; global TypeScript was not rerun during live QA.

## Synthetic visual evidence

Only generated nonclinical data is present. Playwright closed both test contexts after the run. No app or remote page was visited and all attempted external requests would be aborted.

- Desktop screenshot: `C:\Users\franc\AppData\Local\Temp\opencode\mail-template-118c6854-baf1-4859-aeb7-bd07e7063c10\authorization-email-templa-aa537-ble-and-uncropped-at-1440px\authorization-1440.png`.
- Mobile screenshot (also visually inspected): `C:\Users\franc\AppData\Local\Temp\opencode\mail-template-118c6854-baf1-4859-aeb7-bd07e7063c10\authorization-email-templa-d6fbf-able-and-uncropped-at-390px\authorization-390.png`.
- Each replay uses a new unique external output folder, so prior evidence is not cleared. These screenshots are local/temporary, not published or proof of actual mail-client rendering.

## Original validated SHA-256 snapshot — historical

Hashes cover full working files, including inherited changes; they do not attribute foreign hunks to this task.

| Path | SHA-256 |
| --- | --- |
| `src/lib/services/resend.service.ts` | `31ABB978B0677C013F7AB0624B80EAD996AC4B572627DADDE394AA91BA6013BE` |
| `src/lib/validators/mail.validator.ts` | `62A49BCCB7E304B6B287AEC1EFAD23591E56A9D6197E1063835319B744FCBE04` |
| `src/lib/mail/authorization-evidence.ts` | `6A49A96F771B7437D5783E979BDB665FB4A5031EFFECA75C51FB8F75BBB1117A` |
| `src/app/api/companies/[companyId]/mail/send/route.ts` | `738D6656B1BBC03ACAB4B8ADB8CD9AD499E1A84A5A26D94F6AF5FC0EE40BF677` |
| `src/components/mail/SendEmailModal.tsx` | `A837A1EE02F750B20BF105E3964220A1DC1F883C61E8612FC3176301F74560B3` |
| `src/components/expediente/NovedadesTabContent.tsx` | `18BD3A68F96E7DDBC12569F8750A36A3A12D5855C64EE20C24490FDECC48E0D7` |
| `src/components/coordinadores/CoordinatorShareDialog.tsx` | `C328EE2332E2B5ED72C09EA13A4E404CD666FB3906C392CF37EC6C5286E09E31` |
| `src/__tests__/unit/resend.service.test.ts` | `E83E836352B2CE772ECF7713A6E5EE2F3A9BAF7D707A56B11170E0F41155F7CF` |
| `src/__tests__/unit/mail-send-honesty.test.ts` | `1B18AFBE116307741023B2467EF3B6AB62145E5FF467D377C1303045373C2CA0` |
| `src/__tests__/unit/authorization-email-template.test.ts` | `CAC543733EDBC3AE20F1A4BA7967D6FE21DB2FA4672FE00E39F876140CE6D7F4` |
| `src/__tests__/unit/authorization-email-evidence.test.ts` | `8AF66DD3AE26A618F055F031B033208B08B5060AC03F3C2F0BE8BE62D1A66255` |
| `src/__tests__/components/SendEmailModal.test.tsx` | `DE7B5497A81950B206975BD9E0064F1BE713713D8F3B3C57EE35F465BB438133` |
| `src/__tests__/components/CoordinatorShareDialog.test.tsx` | `248B98CE2718B76F5EB60B8EFE06615C7927CB2A25465806E7CBA83FEBA09FD9` |
| `src/__tests__/components/NovedadesAuthorizationEmail.test.tsx` | `63B1BC826A4B1B94625E60293189E0C4154798A147A5D99CDB1E578AF12009DF` |
| `playwright.mail.config.ts` | `61A92C6DFB9B7285776F5BE313F1F2838C3D8FCFCD459E1E8BBDE615491BC3FA` |
| `e2e/authorization-email-template.spec.ts` | `AEDC53C32EE95F5C67816FD22DCC1AF7D384BADFD63EEEF534282E5ADCE0AF15` |
