# Resend bounded validation — 2026-10-06

Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`.
HEAD: `685ef3229da012ed988388d512d91f3e3c4bad2e`, plus existing uncommitted work. No commit or publication performed.

## Replay

Run from the workspace above using the installed runner:

```powershell
& .\node_modules\.bin\vitest.cmd run src/__tests__/unit/resend.service.test.ts src/__tests__/unit/mail-send-honesty.test.ts src/__tests__/components/SendEmailModal.test.tsx src/__tests__/components/CoordinatorShareDialog.test.tsx --reporter=verbose
& .\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false
```

| Check | Current result |
| --- | --- |
| Service unit tests, env stubbed/network mocked | PASS — 5/5 |
| Route unit tests, auth/company/service/audit/DB mocked | PASS — 3/3 |
| SendEmailModal component command tests, dialog/auth/network mocked | PASS — 4/4 |
| CoordinatorShareDialog component command tests, dialog/sheet/hooks/network/AnimatePresence mocked | PASS — 4/4 |
| Combined command | PASS — 4 files, 16 tests, exit 0, 2.97 seconds |
| TypeScript global, no generated outputs | FAIL — exit 2; four diagnostics in three unrelated files, detailed in HANDOFF |
| Independent source review | PASS — reviewer inspected source only; no independent runtime validation |
| Scoped whitespace diff check | PASS; LF/CRLF Git warnings only |
| Build / real browser / DB persistence / real delivery | NOT RUN |

The Node `--localstorage-file` warning is present but did not prevent this run from completing. Expected mocked provider 401/network-error output is not a live provider call. Historical timeouts are not current acceptance evidence.

Raw output: `EVIDENCE_20261006_tests.txt`, `EVIDENCE_20261006_typecheck.txt`. Their exit codes were captured in the terminal and recorded above.

## Validated changed-file SHA-256 snapshot

| Path | SHA-256 |
| --- | --- |
| `src/components/mail/SendEmailModal.tsx` | `77A2E50289F681F2BF37C4C7896A179E130F0A9955F3F95D3AA28BFB363CCA3C` |
| `src/components/coordinadores/CoordinatorShareDialog.tsx` | `61F25239FD9E39F54D530D9CDF620BEFB7902895565761D402ED19B5DA13B81D` |
| `src/__tests__/components/SendEmailModal.test.tsx` | `EE99CF01D6315825D3C3890570DB1109F6630CEED3F8C117CFEC8D3E31DCA7AB` |
| `src/__tests__/components/CoordinatorShareDialog.test.tsx` | `C89DFDC4167885CCF5D0D9E76BA2C16D6DFA956D0F9E94A9D06B7F9612394CBB` |
| `src/__tests__/unit/mail-send-honesty.test.ts` | `610A0C375617AAF113D4300A0F18B177AA12DA49A7EFED5D054BE110CDC732CD` |

Hashes identify the whole working-file snapshot, including adopted/pre-existing work; they do not attribute those older changes to this correction.
